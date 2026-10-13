import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type PublicTitle = RouterOutputs["catalog"]["publicList"][number];
export type AdminTitle = RouterOutputs["catalog"]["adminList"][number];
export type CatalogEpisode = RouterOutputs["catalog"]["publicEpisodes"][number];
export type AdminEpisode = RouterOutputs["catalog"]["adminEpisodes"][number];
export type PublicCategory = RouterOutputs["catalog"]["publicCategories"][number];
export type AdminCategory = RouterOutputs["catalog"]["adminCategories"][number];
export type PublicInterpreter = RouterOutputs["catalog"]["publicInterpreters"][number];
export type AdminInterpreter = RouterOutputs["catalog"]["adminInterpreters"][number];
export type PublicSiteSettings = RouterOutputs["site"]["publicSettings"];
export type PublicHomepageSection = RouterOutputs["site"]["publicHomepageSections"][number];
export type AdminHomepageSection = RouterOutputs["site"]["adminHomepageSections"][number];

export const DEFAULT_CATEGORIES = [
  "Action", "Drama", "Horror", "Romantic", "Thriller", "Comedy", "Adventure", "Documentary", "Cartoon",
];

export function splitList(value: string) {
  return [...new Set(value.split(",").map(item => item.trim()).filter(Boolean))];
}

export function slugLabel(value: string) {
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch { /* Keep a malformed route slug readable. */ }
  return decoded.replace(/-/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

export function slugifyLabel(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

type RouterInputs = inferRouterInputs<AppRouter>;
export type TitleEditorInput = RouterInputs["catalog"]["saveTitle"];
export type EpisodeEditorInput = RouterInputs["catalog"]["saveEpisode"];
export type CategoryEditorInput = RouterInputs["catalog"]["saveCategory"];
export type InterpreterEditorInput = RouterInputs["catalog"]["saveInterpreter"];
export type SiteSettingsInput = RouterInputs["site"]["saveSettings"];
export type HomepageSectionInput = RouterInputs["site"]["saveHomepageSection"];
