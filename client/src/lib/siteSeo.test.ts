import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getCatalogDocumentTitle,
  getHomeDocumentTitle,
  HOME_DOCUMENT_TITLE,
  HOME_META_DESCRIPTION,
  HOME_META_KEYWORDS,
  limitSeoHeading,
} from "./siteSeo";

const homeDocument = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

describe("AgaStream homepage SEO metadata", () => {
  it("keeps the document title within the 30–60 character range and mirrors it in initial HTML", () => {
    expect(HOME_DOCUMENT_TITLE.length).toBeGreaterThanOrEqual(30);
    expect(HOME_DOCUMENT_TITLE.length).toBeLessThanOrEqual(60);
    const initialTitle = homeDocument.match(/<title>(.*?)<\/title>/s)?.[1]?.replaceAll("&amp;", "&");
    expect(initialTitle).toBe(HOME_DOCUMENT_TITLE);
  });

  it("keeps the description within the 50–160 character SEO range and mirrors it in initial HTML", () => {
    expect(HOME_META_DESCRIPTION.length).toBeGreaterThanOrEqual(50);
    expect(HOME_META_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(homeDocument).toContain(`name="description" content="${HOME_META_DESCRIPTION}"`);
  });

  it("declares between 3 and 8 focused keywords in initial HTML", () => {
    expect(HOME_META_KEYWORDS.length).toBeGreaterThanOrEqual(3);
    expect(HOME_META_KEYWORDS.length).toBeLessThanOrEqual(8);
    expect(homeDocument).toContain(`name="keywords" content="${HOME_META_KEYWORDS.join(", ")}"`);
  });

  it("includes meaningful homepage content and crawlable section links before React runs", () => {
    expect(homeDocument).toContain("<h1>Kinyarwanda Movies and TV Series Online</h1>");
    expect(homeDocument).toContain(`<p>${HOME_META_DESCRIPTION}</p>`);
    expect(homeDocument).toContain('href="/movies"');
    expect(homeDocument).toContain('href="/tv-series"');
    expect(homeDocument).toContain('href="/categories"');
    expect(homeDocument).toContain('href="/interpreters"');
  });

  it("uses a valid configured document title and falls back when the configured title is outside the SEO range", () => {
    expect(getHomeDocumentTitle("A valid AgaStream title of thirty characters")).toBe("A valid AgaStream title of thirty characters");
    expect(getHomeDocumentTitle("Too short")).toBe(HOME_DOCUMENT_TITLE);
    expect(getHomeDocumentTitle("x".repeat(61))).toBe(HOME_DOCUMENT_TITLE);
  });

  it("uppercases the actual catalog title in the browser document title", () => {
    expect(getCatalogDocumentTitle("The Kinyarwanda Story", "AgaStream")).toBe("THE KINYARWANDA STORY · AgaStream");
  });

  it("keeps generated headings to 80 characters or fewer", () => {
    const heading = limitSeoHeading("🎬".repeat(100));
    expect(Array.from(heading)).toHaveLength(80);
  });
});
