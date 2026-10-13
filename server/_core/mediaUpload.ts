import { randomUUID } from "node:crypto";
import { ENV } from "./env";
import { isTrustedManagedStorageUrl } from "./storageSecurity";

export const MEDIA_UPLOAD_PURPOSES = ["logo", "favicon", "poster", "backdrop", "interpreter", "trailer", "playback", "download"] as const;
export type MediaUploadPurpose = (typeof MEDIA_UPLOAD_PURPOSES)[number];

const uploadContentTypes: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/x-m4v": "m4v",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
};

const imageUploadPurposes = new Set<MediaUploadPurpose>(["logo", "favicon", "poster", "backdrop", "interpreter"]);

export class MediaUploadError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "MediaUploadError";
  }
}

export type MediaUploadSpec = {
  purpose: MediaUploadPurpose;
  contentType: string;
  size: number;
  rightsConfirmed: boolean;
  extension: string;
};

export function validateMediaUpload(input: {
  purpose: string | undefined;
  contentType: string | undefined;
  size: number;
  rightsConfirmed: boolean;
}): MediaUploadSpec {
  if (!MEDIA_UPLOAD_PURPOSES.includes(input.purpose as MediaUploadPurpose)) {
    throw new MediaUploadError(400, "Choose a supported AgaStream upload field.");
  }
  const purpose = input.purpose as MediaUploadPurpose;
  const contentType = (input.contentType ?? "").split(";", 1)[0].trim().toLowerCase();
  const extension = uploadContentTypes[contentType];
  if (!extension || imageUploadPurposes.has(purpose) !== contentType.startsWith("image/")) {
    throw new MediaUploadError(400, "Choose a supported image or video file for this field.");
  }
  if (!Number.isSafeInteger(input.size) || input.size <= 0) {
    throw new MediaUploadError(411, "The upload size could not be verified. Please retry the upload.");
  }
  const maxSize = contentType.startsWith("image/") ? 20 * 1024 * 1024 : 2 * 1024 * 1024 * 1024;
  if (input.size > maxSize) {
    throw new MediaUploadError(413, contentType.startsWith("image/")
      ? "Images must be 20 MiB or smaller."
      : "Video uploads must be 2 GiB or smaller; use a secure HTTPS source URL for larger files.");
  }
  if ((purpose === "playback" || purpose === "download") && !input.rightsConfirmed) {
    throw new MediaUploadError(403, "Confirm distribution rights before uploading a full-length source.");
  }
  return { purpose, contentType, size: input.size, rightsConfirmed: input.rightsConfirmed, extension };
}

export async function requestManagedUploadTarget(spec: MediaUploadSpec) {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    throw new MediaUploadError(503, "Managed file uploads are unavailable. Use a secure HTTPS source URL instead.");
  }
  const objectKey = `agastream/${spec.purpose}/${randomUUID()}.${spec.extension}`;
  const presignUrl = new URL("v1/storage/presign/put", `${ENV.forgeApiUrl.replace(/\/+$/, "")}/`);
  presignUrl.searchParams.set("path", objectKey);
  let response: Response;
  try {
    response = await fetch(presignUrl, {
      headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new MediaUploadError(502, "Managed storage could not prepare the upload. Please try again.");
  }
  const result = await response.json().catch(() => null) as { url?: unknown } | null;
  if (!response.ok || typeof result?.url !== "string") {
    throw new MediaUploadError(502, "Managed storage could not prepare the upload. Please try again.");
  }
  let uploadUrl: URL;
  try {
    uploadUrl = new URL(result.url);
  } catch {
    throw new MediaUploadError(502, "Managed storage returned an invalid upload address.");
  }
  if (!isTrustedManagedStorageUrl(uploadUrl.toString())) {
    throw new MediaUploadError(502, "Managed storage returned an untrusted upload address.");
  }
  return {
    uploadUrl: uploadUrl.toString(),
    assetUrl: `/manus-storage/${objectKey}`,
  };
}
