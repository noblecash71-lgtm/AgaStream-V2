import { describe, expect, it } from "vitest";
import { resolveMediaSource } from "./mediaSource";

const origin = "https://agastream.example";

describe("resolveMediaSource", () => {
  it("embeds YouTube watch links without navigating away", () => {
    const result = resolveMediaSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ", origin);
    expect(result.kind).toBe("embed");
    if (result.kind === "embed") {
      expect(result.provider).toBe("youtube");
      expect(result.url).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    }
  });

  it("converts Vimeo and Dailymotion watch URLs to their official player endpoints", () => {
    const vimeo = resolveMediaSource("https://vimeo.com/123456789?h=privatehash", origin);
    const daily = resolveMediaSource("https://www.dailymotion.com/video/x8abcde", origin);
    expect(vimeo.kind).toBe("embed");
    expect(daily.kind).toBe("embed");
    if (vimeo.kind === "embed") {
      expect(vimeo.provider).toBe("vimeo");
      expect(vimeo.url).toContain("player.vimeo.com/video/123456789");
      expect(vimeo.url).toContain("privatehash");
    }
    if (daily.kind === "embed") {
      expect(daily.provider).toBe("dailymotion");
      expect(daily.url).toContain("dailymotion.com/embed/video/x8abcde");
    }
  });

  it("uses native video playback for direct media files and managed storage", () => {
    expect(resolveMediaSource("https://cdn.example/movie.mp4?token=abc", origin).kind).toBe("video");
    expect(resolveMediaSource("https://cdn.example/stream?id=7&format=video/mp4", origin).kind).toBe("video");
    expect(resolveMediaSource("/manus-storage/movies/film.mp4", origin).kind).toBe("video");
  });

  it("sandbox-embeds other secure video pages and keeps an external fallback", () => {
    const result = resolveMediaSource("https://video.example/watch/film?id=123", origin);
    expect(result.kind).toBe("embed");
    if (result.kind === "embed") {
      expect(result.provider).toBe("page");
      expect(result.sandboxed).toBe(true);
      expect(result.externalUrl).toBe("https://video.example/watch/film?id=123");
    }
  });

  it("rejects insecure, credential-bearing, and same-site non-storage URLs", () => {
    expect(resolveMediaSource("http://video.example/film.mp4", origin).kind).toBe("invalid");
    expect(resolveMediaSource("https://user:secret@video.example/film.mp4", origin).kind).toBe("invalid");
    expect(resolveMediaSource("/admin", origin).kind).toBe("invalid");
  });
});
