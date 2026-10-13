import { describe, expect, it } from "vitest";
import { MediaUploadError, validateMediaUpload } from "./mediaUpload";

describe("AgaStream media upload validation", () => {
  it("accepts a supported local image and returns a safe extension", () => {
    expect(validateMediaUpload({ purpose: "logo", contentType: "image/png", size: 1024, rightsConfirmed: false })).toMatchObject({
      purpose: "logo",
      contentType: "image/png",
      extension: "png",
      size: 1024,
    });
  });

  it("rejects an upload field with a mismatched media type", () => {
    expect(() => validateMediaUpload({ purpose: "poster", contentType: "video/mp4", size: 1024, rightsConfirmed: false }))
      .toThrowError(new MediaUploadError(400, "Choose a supported image or video file for this field."));
  });

  it("rejects full-length sources unless distribution rights are confirmed", () => {
    expect(() => validateMediaUpload({ purpose: "playback", contentType: "video/mp4", size: 1024, rightsConfirmed: false }))
      .toThrow("Confirm distribution rights");
    expect(validateMediaUpload({ purpose: "playback", contentType: "video/mp4", size: 1024, rightsConfirmed: true }).purpose)
      .toBe("playback");
  });

  it("enforces image and video limits and a verifiable positive length", () => {
    expect(() => validateMediaUpload({ purpose: "poster", contentType: "image/png", size: 20 * 1024 * 1024 + 1, rightsConfirmed: false }))
      .toThrow("Images must be 20 MiB or smaller");
    expect(() => validateMediaUpload({ purpose: "trailer", contentType: "video/mp4", size: 2 * 1024 * 1024 * 1024 + 1, rightsConfirmed: false }))
      .toThrow("Video uploads must be 2 GiB or smaller");
    expect(() => validateMediaUpload({ purpose: "trailer", contentType: "video/mp4", size: 0, rightsConfirmed: false }))
      .toThrow("upload size could not be verified");
  });
});
