export const HOME_DOCUMENT_TITLE = "AgaStream | Kinyarwanda Movies & TV Series Online | Home";
export const HOME_META_DESCRIPTION = "AgaStream brings Kinyarwanda-dubbed movies, African films, and TV series together. Explore by category, discover interpreters, and watch trailers online.";
export const HOME_META_KEYWORDS = [
  "AgaStream",
  "Kinyarwanda movies",
  "African films",
  "TV series",
  "dubbed movies",
  "movie trailers",
] as const;

export function getHomeDocumentTitle(configuredTitle?: string | null) {
  const normalized = configuredTitle?.trim() ?? "";
  return normalized.length >= 30 && normalized.length <= 60 ? normalized : HOME_DOCUMENT_TITLE;
}

export function getCatalogDocumentTitle(title: string, siteName = "AgaStream") {
  const normalizedTitle = title.trim().toUpperCase();
  const normalizedSiteName = siteName.trim() || "AgaStream";
  return normalizedTitle ? `${normalizedTitle} · ${normalizedSiteName}` : normalizedSiteName;
}

export function limitSeoHeading(value: string) {
  const characters = Array.from(value.trim());
  if (characters.length <= 80) return characters.join("");
  return `${characters.slice(0, 79).join("")}…`;
}
