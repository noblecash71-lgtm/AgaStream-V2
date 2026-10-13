import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { ADMIN_PASSWORD_MIN_LENGTH, ADMIN_SESSION_LIFETIME_MS, PASSWORD_ADMIN_USERNAME } from "./_core/adminIdentity";
import { adminLoginLimiter, createLoginAttemptKey, verifyAdminPassword } from "./_core/adminPassword";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { adminProcedure, isAuthorizedAgaStreamAdmin, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

const optionalText = z.string().trim().max(10000).nullable().optional();
const urlText = z.string().trim().max(2048).nullable().optional();
const stringList = z.array(z.string().trim().min(1).max(90)).max(24);

function normalizeOptional(value: string | null | undefined) {
  return value?.trim() || null;
}

function isSafeHttps(value: string | null): boolean {
  if (!value) return true;
  if (value.startsWith("/manus-storage/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isSafeSiteAsset(value: string | null): boolean {
  if (!value || isSafeHttps(value)) return true;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return false;
  return !value.split("/").some(segment => segment === "." || segment === "..");
}

function validateMediaFields(input: {
  trailerUrl?: string | null;
  playbackUrl?: string | null;
  downloadUrl?: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  rightsConfirmed: boolean;
}) {
  const values = [input.trailerUrl, input.playbackUrl, input.downloadUrl, input.posterUrl, input.backdropUrl];
  if (values.some(value => !isSafeHttps(normalizeOptional(value)))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Media and artwork links must use HTTPS or a stable AgaStream storage path." });
  }
  if ((normalizeOptional(input.playbackUrl) || normalizeOptional(input.downloadUrl)) && !input.rightsConfirmed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Confirm distribution rights before saving full-video or download sources." });
  }
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160) || `title-${Date.now()}`;
}

const titleInput = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().trim().min(1).max(240),
  kind: z.enum(["movie", "series"]),
  synopsis: optionalText,
  releaseYear: z.number().int().min(1888).max(2200).nullable().optional(),
  durationMinutes: z.number().int().min(1).max(1000).nullable().optional(),
  rating: z.string().trim().max(24).nullable().optional(),
  posterUrl: urlText,
  backdropUrl: urlText,
  categories: stringList,
  interpreters: stringList,
  homeSections: stringList,
  trailerUrl: urlText,
  playbackUrl: urlText,
  downloadUrl: urlText,
  rightsConfirmed: z.boolean(),
  featured: z.boolean(),
  status: z.enum(["draft", "published"]),
});

const episodeInput = z.object({
  id: z.number().int().positive().optional(),
  seriesId: z.number().int().positive(),
  seasonNumber: z.number().int().min(1).max(99),
  episodeNumber: z.number().int().min(1).max(999),
  title: z.string().trim().min(1).max(240),
  synopsis: optionalText,
  durationMinutes: z.number().int().min(1).max(1000).nullable().optional(),
  playbackUrl: urlText,
  downloadUrl: urlText,
  rightsConfirmed: z.boolean(),
  status: z.enum(["draft", "published"]),
});

const categoryInput = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(120),
  description: optionalText,
});

const interpreterInput = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(160),
  description: optionalText,
  photoUrl: urlText,
});

const siteSettingsInput = z.object({
  siteName: z.string().trim().min(1).max(120),
  pageTitle: z.string().trim().min(1).max(180),
  logoUrl: urlText,
  faviconUrl: urlText,
  footerYear: z.string().trim().min(1).max(8),
  footerAbout: optionalText,
  phone: z.string().trim().max(80).nullable().optional(),
  email: z.string().trim().max(320).nullable().optional(),
  youtubeUrl: urlText,
  instagramUrl: urlText,
  facebookUrl: urlText,
  copyrightText: z.string().trim().max(180).nullable().optional(),
});

function protectPublicTitle<T extends { rightsConfirmed: boolean; playbackUrl: string | null; downloadUrl: string | null }>(entry: T) {
  return {
    ...entry,
    playbackUrl: entry.rightsConfirmed ? entry.playbackUrl : null,
    downloadUrl: entry.rightsConfirmed ? entry.downloadUrl : null,
  };
}

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    adminStatus: publicProcedure.query(({ ctx }) => isAuthorizedAgaStreamAdmin(ctx.user)),
    passwordLogin: publicProcedure
      .input(z.object({ username: z.string().trim().min(1).max(80), password: z.string().min(1).max(256) }))
      .mutation(async ({ ctx, input }) => {
        if (ENV.adminPassword.length < ADMIN_PASSWORD_MIN_LENGTH) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The AgaStream Admin password must be at least 8 characters. Update the protected server password setting." });
        }
        if (!ENV.cookieSecret || !ENV.appId) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Secure Admin sessions are not configured." });
        }
        const attemptKey = createLoginAttemptKey(
          ctx.req.ip || ctx.req.socket.remoteAddress || "unknown",
          ctx.req.get("user-agent") || "",
          ENV.cookieSecret,
        );
        if (adminLoginLimiter.isBlocked(attemptKey)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many failed attempts. Wait 15 minutes before trying again." });
        }
        const usernameValid = input.username.trim().toLowerCase() === PASSWORD_ADMIN_USERNAME.toLowerCase();
        const passwordValid = await verifyAdminPassword(input.password, ENV.adminPassword, ENV.cookieSecret);
        if (!usernameValid || !passwordValid) {
          if (adminLoginLimiter.recordFailure(attemptKey)) {
            throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many failed attempts. Wait 15 minutes before trying again." });
          }
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password." });
        }
        const admin = await db.ensurePasswordAdminUser();
        const token = await sdk.createSessionToken(admin.openId, {
          name: PASSWORD_ADMIN_USERNAME,
          expiresInMs: ADMIN_SESSION_LIFETIME_MS,
        });
        ctx.res.cookie(COOKIE_NAME, token, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: ADMIN_SESSION_LIFETIME_MS,
        });
        adminLoginLimiter.clear(attemptKey);
        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalog: router({
    publicList: publicProcedure
      .input(z.object({ kind: z.enum(["movie", "series"]).optional() }).optional())
      .query(async ({ input }) => {
        const rows = await db.listCatalogTitles({ kind: input?.kind });
        return rows.map(protectPublicTitle);
      }),
    publicBySlug: publicProcedure
      .input(z.object({ slug: z.string().min(1).max(180) }))
      .query(async ({ input }) => {
        const row = await db.getCatalogTitleBySlug(input.slug);
        return row ? protectPublicTitle(row) : null;
      }),
    publicEpisodes: publicProcedure
      .input(z.object({ seriesId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const series = await db.getCatalogTitleById(input.seriesId);
        if (!series || series.kind !== "series" || series.status !== "published") return [];
        return (await db.listCatalogEpisodes(input.seriesId)).map(protectPublicTitle);
      }),
    publicCategories: publicProcedure.query(() => db.listCatalogCategories()),
    publicInterpreters: publicProcedure.query(() => db.listCatalogInterpreters()),
    adminList: adminProcedure.query(() => db.listCatalogTitles({ admin: true })),
    adminCategories: adminProcedure.query(() => db.listCatalogCategories(true)),
    adminInterpreters: adminProcedure.query(() => db.listCatalogInterpreters(true)),
    adminEpisodes: adminProcedure
      .input(z.object({ seriesId: z.number().int().positive() }))
      .query(({ input }) => db.listCatalogEpisodes(input.seriesId, true)),
    saveTitle: adminProcedure.input(titleInput).mutation(async ({ input }) => {
      validateMediaFields(input);
      const data = {
        slug: slugify(input.title),
        title: input.title,
        kind: input.kind,
        synopsis: normalizeOptional(input.synopsis),
        releaseYear: input.releaseYear ?? null,
        durationMinutes: input.kind === "movie" ? (input.durationMinutes ?? null) : null,
        rating: normalizeOptional(input.rating),
        posterUrl: normalizeOptional(input.posterUrl),
        backdropUrl: normalizeOptional(input.backdropUrl),
        categories: [...new Set(input.categories.map(item => item.trim()).filter(Boolean))],
        interpreters: [...new Set(input.interpreters.map(item => item.trim()).filter(Boolean))],
        homeSections: [...new Set(input.homeSections.map(item => item.trim()).filter(Boolean))],
        trailerUrl: normalizeOptional(input.trailerUrl),
        playbackUrl: normalizeOptional(input.playbackUrl),
        downloadUrl: normalizeOptional(input.downloadUrl),
        rightsConfirmed: input.rightsConfirmed,
        featured: input.featured,
        status: input.status,
      };
      const knownSections = new Set((await db.listHomepageSections(true)).map(section => section.slug));
      if (data.homeSections.some(slug => !knownSections.has(slug))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose homepage shelves that still exist, then save again." });
      }
      return db.saveCatalogTitle(data, input.id);
    }),
    deleteTitle: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await db.deleteCatalogTitle(input.id);
        return { success: true } as const;
      }),
    saveCategory: adminProcedure.input(categoryInput).mutation(({ input }) => db.saveCatalogCategory({
      name: input.name,
      slug: slugify(input.name),
      description: normalizeOptional(input.description),
    }, input.id)),
    deleteCategory: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => { await db.deleteCatalogCategory(input.id); return { success: true } as const; }),
    saveInterpreter: adminProcedure.input(interpreterInput).mutation(({ input }) => {
      const photoUrl = normalizeOptional(input.photoUrl);
      if (!isSafeHttps(photoUrl)) throw new TRPCError({ code: "BAD_REQUEST", message: "Interpreter profile images must use HTTPS or a stable AgaStream storage path." });
      return db.saveCatalogInterpreter({
        name: input.name,
        slug: slugify(input.name),
        description: normalizeOptional(input.description),
        photoUrl,
      }, input.id);
    }),
    deleteInterpreter: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => { await db.deleteCatalogInterpreter(input.id); return { success: true } as const; }),
    saveEpisode: adminProcedure.input(episodeInput).mutation(async ({ input }) => {
      const series = await db.getCatalogTitleById(input.seriesId);
      if (!series || series.kind !== "series") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Episodes must belong to an existing series." });
      }
      validateMediaFields(input);
      return db.saveCatalogEpisode({
        seriesId: input.seriesId,
        seasonNumber: input.seasonNumber,
        episodeNumber: input.episodeNumber,
        title: input.title,
        synopsis: normalizeOptional(input.synopsis),
        durationMinutes: input.durationMinutes ?? null,
        playbackUrl: normalizeOptional(input.playbackUrl),
        downloadUrl: normalizeOptional(input.downloadUrl),
        rightsConfirmed: input.rightsConfirmed,
        status: input.status,
      }, input.id);
    }),
    deleteEpisode: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await db.deleteCatalogEpisode(input.id);
        return { success: true } as const;
      }),
  }),
  site: router({
    publicSettings: publicProcedure.query(() => db.getSiteSettings()),
    publicHomepageSections: publicProcedure.query(() => db.listHomepageSections()),
    adminHomepageSections: adminProcedure.query(() => db.listHomepageSections(true)),
    saveHomepageSection: adminProcedure.input(z.object({
      id: z.number().int().positive().optional(),
      name: z.string().trim().min(1).max(120),
      isVisible: z.boolean(),
    })).mutation(({ input }) => db.saveHomepageSection({
      name: input.name,
      slug: slugify(input.name),
      isVisible: input.isVisible,
    }, input.id)),
    deleteHomepageSection: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => { await db.deleteHomepageSection(input.id); return { success: true } as const; }),
    reorderHomepageSections: adminProcedure
      .input(z.object({ ids: z.array(z.number().int().positive()).max(100) }))
      .mutation(({ input }) => db.reorderHomepageSections(input.ids)),
    reorderFeaturedTitles: adminProcedure
      .input(z.object({ ids: z.array(z.number().int().positive()).max(250) }))
      .mutation(({ input }) => db.reorderFeaturedTitles(input.ids)),
    saveSettings: adminProcedure.input(siteSettingsInput).mutation(({ input }) => {
      const logoUrl = normalizeOptional(input.logoUrl);
      const faviconUrl = normalizeOptional(input.faviconUrl);
      const socials = [input.youtubeUrl, input.instagramUrl, input.facebookUrl].map(normalizeOptional);
      if (!isSafeSiteAsset(logoUrl) || !isSafeSiteAsset(faviconUrl)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Logo and favicon must use HTTPS or a safe same-site asset path." });
      }
      if (socials.some(url => !isSafeHttps(url))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Social profile links must use HTTPS." });
      }
      const email = normalizeOptional(input.email);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid contact email address." });
      }
      return db.saveSiteSettings({
        siteName: input.siteName,
        pageTitle: input.pageTitle,
        logoUrl,
        faviconUrl,
        footerYear: input.footerYear,
        footerAbout: normalizeOptional(input.footerAbout),
        phone: normalizeOptional(input.phone),
        email,
        youtubeUrl: socials[0],
        instagramUrl: socials[1],
        facebookUrl: socials[2],
        copyrightText: normalizeOptional(input.copyrightText),
      });
    }),
  }),
});

export type AppRouter = typeof appRouter;
