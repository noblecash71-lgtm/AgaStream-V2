import { describe, expect, it } from "vitest";
import { createLoginAttemptKey, LoginAttemptLimiter, verifyAdminPassword } from "./adminPassword";

const testPassword = "test-only-strong-password-for-unit-tests";
const testSigningSecret = "unit-test-signing-key-not-used-in-production";

describe("AgaStream Admin password helpers", () => {
  it("accepts the configured password and rejects a different value", async () => {
    await expect(verifyAdminPassword(testPassword, testPassword, testSigningSecret)).resolves.toBe(true);
    await expect(verifyAdminPassword("incorrect-test-password-value", testPassword, testSigningSecret)).resolves.toBe(false);
  });

  it("fails closed when a configured password is too short or signing is unavailable", async () => {
    await expect(verifyAdminPassword("short", "short", testSigningSecret)).resolves.toBe(false);
    await expect(verifyAdminPassword(testPassword, testPassword, "")).resolves.toBe(false);
  });

  it("rate-limits repeated failures and clears the lock after the configured window", () => {
    const limiter = new LoginAttemptLimiter();
    const key = createLoginAttemptKey("192.0.2.10", "test-agent", testSigningSecret);
    const start = 1_000_000;
    expect(limiter.isBlocked(key, start)).toBe(false);
    for (let attempt = 1; attempt < 5; attempt += 1) {
      expect(limiter.recordFailure(key, start + attempt)).toBe(false);
    }
    expect(limiter.recordFailure(key, start + 5)).toBe(true);
    expect(limiter.isBlocked(key, start + 6)).toBe(true);
    expect(limiter.isBlocked(key, start + 16 * 60 * 1000)).toBe(false);
  });

  it("stores no raw client address in its keyed limiter identifier", () => {
    const key = createLoginAttemptKey("198.51.100.12", "private-agent", testSigningSecret);
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toContain("198.51.100.12");
  });
});
