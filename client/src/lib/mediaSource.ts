export type ResolvedMediaSource =
  | { kind: "video"; url: string }
  | { kind: "embed"; url: string; externalUrl: string; provider: "youtube" | "vimeo" | "dailymotion" | "page"; sandboxed: boolean }
  | { kind: "invalid" };

const VIDEO_FILE_EXTENSION = /\.(?:mp4|m4v|webm|ogg|ogv|mov|m3u8)$/i;

function safeSource(source: string, origin: string): URL | null {
  try {
    const url = new URL(source, origin);
    const managedStoragePath = url.origin === origin && url.pathname.startsWith("/manus-storage/");
    if (managedStoragePath) return url;
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password || url.origin === origin) return null;
    return url;
  } catch {
    return null;
  }
}

function youtubeEmbed(url: URL, host: string): string | null {
  let id = "";
  if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? "";
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
    else if (/^\/(?:embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split("/")[2] ?? "";
  }
  if (host === "youtube-nocookie.com" && url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] ?? "";
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
}

function vimeoEmbed(url: URL, host: string): string | null {
  if (host !== "vimeo.com" && host !== "m.vimeo.com" && host !== "player.vimeo.com") return null;
  const segments = url.pathname.split("/").filter(Boolean);
  const id = [...segments].reverse().find(segment => /^\d{5,12}$/.test(segment));
  if (!id) return null;
  const query = new URLSearchParams({ autoplay: "1", dnt: "1", title: "0", byline: "0", portrait: "0" });
  const privacyHash = url.searchParams.get("h");
  if (privacyHash) query.set("h", privacyHash);
  return `https://player.vimeo.com/video/${id}?${query.toString()}`;
}

function dailymotionEmbed(url: URL, host: string): string | null {
  let id = "";
  if (host === "dai.ly") id = url.pathname.split("/").filter(Boolean)[0] ?? "";
  if (host === "dailymotion.com") id = url.pathname.match(/\/video\/([A-Za-z0-9]+)/i)?.[1] ?? "";
  if (!/^[A-Za-z0-9]{6,30}$/.test(id)) return null;
  return `https://www.dailymotion.com/embed/video/${id}?autoplay=1`;
}

export function resolveMediaSource(source: string, origin: string): ResolvedMediaSource {
  const url = safeSource(source, origin);
  if (!url) return { kind: "invalid" };

  const managedStoragePath = url.origin === origin && url.pathname.startsWith("/manus-storage/");
  if (managedStoragePath) return { kind: "video", url: url.toString() };

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const providers = [
    { provider: "youtube" as const, embed: youtubeEmbed(url, host) },
    { provider: "vimeo" as const, embed: vimeoEmbed(url, host) },
    { provider: "dailymotion" as const, embed: dailymotionEmbed(url, host) },
  ];
  const knownProvider = providers.find(item => item.embed);
  if (knownProvider?.embed) {
    return { kind: "embed", url: knownProvider.embed, externalUrl: url.toString(), provider: knownProvider.provider, sandboxed: false };
  }

  const declaredMime = ["type", "mime", "format", "response-content-type"]
    .map(key => url.searchParams.get(key) ?? "")
    .join(" ")
    .toLowerCase();
  if (VIDEO_FILE_EXTENSION.test(url.pathname) || /video\//.test(declaredMime)) {
    return { kind: "video", url: url.toString() };
  }

  return { kind: "embed", url: url.toString(), externalUrl: url.toString(), provider: "page", sandboxed: true };
}
