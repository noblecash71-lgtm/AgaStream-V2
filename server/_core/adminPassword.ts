import { createHmac, scrypt, timingSafeEqual } from "node:crypto";
import { ADMIN_PASSWORD_MIN_LENGTH } from "./adminIdentity";

type LoginAttempt = {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number;
  lastAttemptAt: number;
};

const KEY_LENGTH = 64;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

function deriveKey(value: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(value, salt, KEY_LENGTH, (error, derived) => {
      if (error) reject(error);
      else resolve(derived as Buffer);
    });
  });
}

/** Compare without exposing the configured password or a reusable password hash. */
export async function verifyAdminPassword(
  candidate: string,
  configuredPassword: string,
  signingSecret: string,
): Promise<boolean> {
  if (
    !signingSecret ||
    configuredPassword.length < ADMIN_PASSWORD_MIN_LENGTH ||
    candidate.length < ADMIN_PASSWORD_MIN_LENGTH ||
    candidate.length > 256
  ) return false;

  const salt = createHmac("sha256", signingSecret)
    .update("agastream-admin-password-verification-v1")
    .digest();
  const [expected, actual] = await Promise.all([
    deriveKey(configuredPassword, salt),
    deriveKey(candidate, salt),
  ]);
  return timingSafeEqual(expected, actual);
}

/** Keep only an HMAC of client address and user-agent in the rate-limit map. */
export function createLoginAttemptKey(ip: string, userAgent: string, signingSecret: string): string {
  return createHmac("sha256", signingSecret || "agastream-rate-limit")
    .update(`${ip}\0${userAgent}`)
    .digest("hex");
}

export class LoginAttemptLimiter {
  private readonly attempts = new Map<string, LoginAttempt>();

  isBlocked(key: string, now = Date.now()): boolean {
    const attempt = this.attempts.get(key);
    if (!attempt) return false;
    if (attempt.blockedUntil > now) return true;
    if (now - attempt.windowStartedAt >= ATTEMPT_WINDOW_MS) {
      this.attempts.delete(key);
      return false;
    }
    return false;
  }

  recordFailure(key: string, now = Date.now()): boolean {
    const existing = this.attempts.get(key);
    const attempt = !existing || now - existing.windowStartedAt >= ATTEMPT_WINDOW_MS
      ? { failures: 0, windowStartedAt: now, blockedUntil: 0, lastAttemptAt: now }
      : existing;
    attempt.failures += 1;
    attempt.lastAttemptAt = now;
    if (attempt.failures >= MAX_FAILURES) attempt.blockedUntil = now + LOCKOUT_MS;
    this.attempts.set(key, attempt);
    this.prune(now);
    return attempt.blockedUntil > now;
  }

  clear(key: string): void {
    this.attempts.delete(key);
  }

  private prune(now: number): void {
    for (const [key, attempt] of this.attempts) {
      if (now - attempt.lastAttemptAt >= ATTEMPT_WINDOW_MS * 2) this.attempts.delete(key);
    }
    while (this.attempts.size > 5000) {
      const oldestKey = this.attempts.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.attempts.delete(oldestKey);
    }
  }
}

export const adminLoginLimiter = new LoginAttemptLimiter();
