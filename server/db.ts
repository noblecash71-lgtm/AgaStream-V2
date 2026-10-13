import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { InsertUser, NewCatalogCategory, NewCatalogEpisode, NewCatalogInterpreter, NewCatalogTitle, NewHomepageSection, NewSiteSettings } from "../drizzle/schema";
import { catalogCategories, catalogEpisodes, catalogInterpreters, catalogTitles, homepageSections, siteSettings, users } from "../drizzle/schema";
import { PASSWORD_ADMIN_OPEN_ID, PASSWORD_ADMIN_USERNAME } from "./_core/adminIdentity";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: Omit<InsertUser, "role">): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const values: InsertUser = { openId: user.openId, role: "user" };
  const updateSet: Record<string, unknown> = { role: "user" };

  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      const rawValue = user[field];
      const normalizedValue = typeof rawValue === "string" ? rawValue.trim() : rawValue ?? null;
      values[field] = normalizedValue;
      updateSet[field] = normalizedValue;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  } else {
    values.lastSignedIn = new Date();
  }

  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function ensurePasswordAdminUser() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const now = new Date();
  await db.insert(users).values({
    openId: PASSWORD_ADMIN_OPEN_ID,
    name: PASSWORD_ADMIN_USERNAME,
    email: null,
    loginMethod: "password",
    role: "admin",
    lastSignedIn: now,
  }).onDuplicateKeyUpdate({ set: {
    name: PASSWORD_ADMIN_USERNAME,
    email: null,
    loginMethod: "password",
    role: "admin",
    lastSignedIn: now,
  } });
  const admin = await getUserByOpenId(PASSWORD_ADMIN_OPEN_ID);
  if (!admin) throw new Error("Could not provision the password Admin identity");
  return admin;
}

export async function listCatalogTitles(options: { admin?: boolean; kind?: "movie" | "series" } = {}) {
  const db = await getDb();
  if (!db) return [];
  const filters = [];
  if (!options.admin) filters.push(eq(catalogTitles.status, "published"));
  if (options.kind) filters.push(eq(catalogTitles.kind, options.kind));
  return db
    .select()
    .from(catalogTitles)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(catalogTitles.featured), asc(catalogTitles.featuredOrder), desc(catalogTitles.updatedAt))
    .limit(250);
}

export async function getCatalogTitleBySlug(slug: string, admin = false) {
  const db = await getDb();
  if (!db) return undefined;
  const filters = [eq(catalogTitles.slug, slug)];
  if (!admin) filters.push(eq(catalogTitles.status, "published"));
  const rows = await db.select().from(catalogTitles).where(and(...filters)).limit(1);
  return rows[0];
}

export async function getCatalogTitleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(catalogTitles).where(eq(catalogTitles.id, id)).limit(1);
  return rows[0];
}

export async function saveCatalogTitle(values: NewCatalogTitle, id?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await ensureCatalogTaxonomy(values.categories ?? [], values.interpreters ?? []);
  const existing = id ? await getCatalogTitleById(id) : undefined;
  let featuredOrder: number | null = null;
  if (values.featured) {
    if (values.featuredOrder !== undefined && values.featuredOrder !== null) {
      featuredOrder = values.featuredOrder;
    } else if (existing?.featured && existing.featuredOrder !== null) {
      featuredOrder = existing.featuredOrder;
    } else {
      const featuredRows = await db.select({ featuredOrder: catalogTitles.featuredOrder }).from(catalogTitles).where(eq(catalogTitles.featured, true));
      featuredOrder = featuredRows.reduce((max, row) => Math.max(max, row.featuredOrder ?? -1), -1) + 1;
    }
  }
  const savedValues = {
    ...values,
    featuredOrder,
    homeSections: values.homeSections ?? existing?.homeSections ?? [],
  };
  if (id) {
    await db.update(catalogTitles).set(savedValues).where(eq(catalogTitles.id, id));
    return getCatalogTitleById(id);
  }
  await db.insert(catalogTitles).values(savedValues);
  return getCatalogTitleBySlug(savedValues.slug, true);
}

export async function deleteCatalogTitle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(catalogTitles).where(eq(catalogTitles.id, id));
}

function taxonomySlug(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 150) || "entry";
}

function takeUniqueSlug(value: string, used: Set<string>) {
  const base = taxonomySlug(value);
  let slug = base;
  let suffix = 2;
  while (used.has(slug)) slug = `${base}-${suffix++}`;
  used.add(slug);
  return slug;
}

export async function ensureCatalogTaxonomy(categories: string[], interpreters: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [categoryRows, interpreterRows] = await Promise.all([
    db.select({ name: catalogCategories.name, slug: catalogCategories.slug }).from(catalogCategories),
    db.select({ name: catalogInterpreters.name, slug: catalogInterpreters.slug }).from(catalogInterpreters),
  ]);
  const categoryNames = new Set(categoryRows.map(row => row.name.toLowerCase()));
  const categorySlugs = new Set(categoryRows.map(row => row.slug));
  for (const rawName of categories) {
    const name = rawName.trim();
    if (!name || categoryNames.has(name.toLowerCase())) continue;
    await db.insert(catalogCategories).values({ name, slug: takeUniqueSlug(name, categorySlugs), description: null });
    categoryNames.add(name.toLowerCase());
  }
  const interpreterNames = new Set(interpreterRows.map(row => row.name.toLowerCase()));
  const interpreterSlugs = new Set(interpreterRows.map(row => row.slug));
  for (const rawName of interpreters) {
    const name = rawName.trim();
    if (!name || interpreterNames.has(name.toLowerCase())) continue;
    await db.insert(catalogInterpreters).values({ name, slug: takeUniqueSlug(name, interpreterSlugs), description: null, photoUrl: null });
    interpreterNames.add(name.toLowerCase());
  }
}

export async function listCatalogCategories(admin = false) {
  const db = await getDb();
  if (!db) return [];
  const [categories, titleRows] = await Promise.all([
    db.select().from(catalogCategories).orderBy(asc(catalogCategories.name)),
    db.select({ categories: catalogTitles.categories }).from(catalogTitles).where(admin ? undefined : eq(catalogTitles.status, "published")),
  ]);
  const counts = new Map<string, number>();
  titleRows.forEach(row => new Set(row.categories.map(name => name.toLowerCase())).forEach(name => counts.set(name, (counts.get(name) ?? 0) + 1)));
  const listed = categories.map(category => ({ ...category, titleCount: counts.get(category.name.toLowerCase()) ?? 0 }));
  return admin ? listed : listed.filter(category => category.titleCount > 0);
}

export async function listCatalogInterpreters(admin = false) {
  const db = await getDb();
  if (!db) return [];
  const [interpreters, titleRows] = await Promise.all([
    db.select().from(catalogInterpreters).orderBy(asc(catalogInterpreters.name)),
    db.select({ interpreters: catalogTitles.interpreters }).from(catalogTitles).where(admin ? undefined : eq(catalogTitles.status, "published")),
  ]);
  const counts = new Map<string, number>();
  titleRows.forEach(row => new Set(row.interpreters.map(name => name.toLowerCase())).forEach(name => counts.set(name, (counts.get(name) ?? 0) + 1)));
  const listed = interpreters.map(interpreter => ({ ...interpreter, titleCount: counts.get(interpreter.name.toLowerCase()) ?? 0 }));
  return admin ? listed : listed.filter(interpreter => interpreter.titleCount > 0);
}

export async function saveCatalogCategory(values: Pick<NewCatalogCategory, "name" | "slug" | "description">, id?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select().from(catalogCategories);
  if (existing.some(row => row.id !== id && row.name.toLowerCase() === values.name.toLowerCase())) throw new Error("A category with this name already exists.");
  if (existing.some(row => row.id !== id && row.slug === values.slug)) throw new Error("A category with a similar URL name already exists.");
  const previous = existing.find(row => row.id === id);
  if (id) {
    await db.transaction(async tx => {
      await tx.update(catalogCategories).set(values).where(eq(catalogCategories.id, id));
      if (previous && previous.name !== values.name) {
        const titles = await tx.select().from(catalogTitles);
        for (const title of titles) {
          if (title.categories.some(name => name.toLowerCase() === previous.name.toLowerCase())) {
            await tx.update(catalogTitles).set({ categories: [...new Set(title.categories.map(name => name.toLowerCase() === previous.name.toLowerCase() ? values.name : name))] }).where(eq(catalogTitles.id, title.id));
          }
        }
      }
    });
    const rows = await db.select().from(catalogCategories).where(eq(catalogCategories.id, id)).limit(1);
    return rows[0];
  }
  await db.insert(catalogCategories).values(values);
  const rows = await db.select().from(catalogCategories).where(eq(catalogCategories.slug, values.slug)).limit(1);
  return rows[0];
}

export async function deleteCatalogCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(catalogCategories).where(eq(catalogCategories.id, id)).limit(1);
  const category = rows[0];
  if (!category) return;
  await db.transaction(async tx => {
    const titles = await tx.select().from(catalogTitles);
    for (const title of titles) {
      const categories = title.categories.filter(name => name.toLowerCase() !== category.name.toLowerCase());
      if (categories.length !== title.categories.length) await tx.update(catalogTitles).set({ categories }).where(eq(catalogTitles.id, title.id));
    }
    await tx.delete(catalogCategories).where(eq(catalogCategories.id, id));
  });
}

export async function saveCatalogInterpreter(values: Pick<NewCatalogInterpreter, "name" | "slug" | "description" | "photoUrl">, id?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select().from(catalogInterpreters);
  if (existing.some(row => row.id !== id && row.name.toLowerCase() === values.name.toLowerCase())) throw new Error("An interpreter with this name already exists.");
  if (existing.some(row => row.id !== id && row.slug === values.slug)) throw new Error("An interpreter with a similar URL name already exists.");
  const previous = existing.find(row => row.id === id);
  if (id) {
    await db.transaction(async tx => {
      await tx.update(catalogInterpreters).set(values).where(eq(catalogInterpreters.id, id));
      if (previous && previous.name !== values.name) {
        const titles = await tx.select().from(catalogTitles);
        for (const title of titles) {
          if (title.interpreters.some(name => name.toLowerCase() === previous.name.toLowerCase())) {
            await tx.update(catalogTitles).set({ interpreters: [...new Set(title.interpreters.map(name => name.toLowerCase() === previous.name.toLowerCase() ? values.name : name))] }).where(eq(catalogTitles.id, title.id));
          }
        }
      }
    });
    const rows = await db.select().from(catalogInterpreters).where(eq(catalogInterpreters.id, id)).limit(1);
    return rows[0];
  }
  await db.insert(catalogInterpreters).values(values);
  const rows = await db.select().from(catalogInterpreters).where(eq(catalogInterpreters.slug, values.slug)).limit(1);
  return rows[0];
}

export async function deleteCatalogInterpreter(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(catalogInterpreters).where(eq(catalogInterpreters.id, id)).limit(1);
  const interpreter = rows[0];
  if (!interpreter) return;
  await db.transaction(async tx => {
    const titles = await tx.select().from(catalogTitles);
    for (const title of titles) {
      const names = title.interpreters.filter(name => name.toLowerCase() !== interpreter.name.toLowerCase());
      if (names.length !== title.interpreters.length) await tx.update(catalogTitles).set({ interpreters: names }).where(eq(catalogTitles.id, title.id));
    }
    await tx.delete(catalogInterpreters).where(eq(catalogInterpreters.id, id));
  });
}

export async function listCatalogEpisodes(seriesId: number, admin = false) {
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(catalogEpisodes.seriesId, seriesId)];
  if (!admin) filters.push(eq(catalogEpisodes.status, "published"));
  return db
    .select()
    .from(catalogEpisodes)
    .where(and(...filters))
    .orderBy(asc(catalogEpisodes.seasonNumber), asc(catalogEpisodes.episodeNumber));
}

export async function getCatalogEpisodeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(catalogEpisodes).where(eq(catalogEpisodes.id, id)).limit(1);
  return rows[0];
}

export async function saveCatalogEpisode(values: NewCatalogEpisode, id?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (id) {
    await db.update(catalogEpisodes).set(values).where(eq(catalogEpisodes.id, id));
    return getCatalogEpisodeById(id);
  }
  await db.insert(catalogEpisodes).values(values);
  const rows = await db
    .select()
    .from(catalogEpisodes)
    .where(and(
      eq(catalogEpisodes.seriesId, values.seriesId),
      eq(catalogEpisodes.seasonNumber, values.seasonNumber),
      eq(catalogEpisodes.episodeNumber, values.episodeNumber),
    ))
    .limit(1);
  return rows[0];
}

export async function deleteCatalogEpisode(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(catalogEpisodes).where(eq(catalogEpisodes.id, id));
}

const defaultSiteSettings = {
  id: 1,
  siteName: "AgaStream",
  pageTitle: "AgaStream | Kinyarwanda Movies & TV Series Online | Home",
  logoUrl: "/agastream-logo.png",
  faviconUrl: "/favicon.png",
  footerYear: String(new Date().getFullYear()),
  footerAbout: "Kinyarwanda-first film discovery, shaped by the interpreters who bring every story to life.",
  phone: null,
  email: null,
  youtubeUrl: null,
  instagramUrl: null,
  facebookUrl: null,
  copyrightText: "NobleCash Group",
  updatedAt: new Date(0),
};

export async function getSiteSettings() {
  const db = await getDb();
  if (!db) return { ...defaultSiteSettings };
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
  return rows[0] ?? { ...defaultSiteSettings };
}

export async function saveSiteSettings(values: Omit<NewSiteSettings, "id" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(siteSettings).values({ id: 1, ...values }).onDuplicateKeyUpdate({ set: values });
  return getSiteSettings();
}

export async function listHomepageSections(admin = false) {
  const db = await getDb();
  if (!db) return [];
  const [sections, titles] = await Promise.all([
    db.select().from(homepageSections).orderBy(asc(homepageSections.sortOrder), asc(homepageSections.name)),
    db.select({ homeSections: catalogTitles.homeSections }).from(catalogTitles).where(admin ? undefined : eq(catalogTitles.status, "published")),
  ]);
  const counts = new Map<string, number>();
  for (const title of titles) {
    for (const slug of new Set(title.homeSections ?? [])) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  const listed = sections.map(section => ({ ...section, titleCount: counts.get(section.slug) ?? 0 }));
  return admin ? listed : listed.filter(section => section.isVisible && section.titleCount > 0);
}

export async function saveHomepageSection(
  values: Pick<NewHomepageSection, "name" | "slug" | "isVisible" | "sortOrder">,
  id?: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select().from(homepageSections);
  if (existing.some(row => row.id !== id && row.name.toLowerCase() === values.name.toLowerCase())) throw new Error("A homepage shelf with this name already exists.");
  if (existing.some(row => row.id !== id && row.slug === values.slug)) throw new Error("A homepage shelf with a similar URL name already exists.");
  const previous = existing.find(row => row.id === id);
  const updateValues = { ...values, sortOrder: values.sortOrder ?? previous?.sortOrder ?? (existing.length ? Math.max(...existing.map(row => row.sortOrder)) + 1 : 0) };
  if (id) {
    await db.transaction(async tx => {
      await tx.update(homepageSections).set(updateValues).where(eq(homepageSections.id, id));
      if (previous && previous.slug !== values.slug) {
        const titles = await tx.select().from(catalogTitles);
        for (const title of titles) {
          const assigned = title.homeSections ?? [];
          if (assigned.includes(previous.slug)) {
            await tx.update(catalogTitles).set({ homeSections: [...new Set(assigned.map(slug => slug === previous.slug ? values.slug : slug))] }).where(eq(catalogTitles.id, title.id));
          }
        }
      }
    });
    const rows = await db.select().from(homepageSections).where(eq(homepageSections.id, id)).limit(1);
    return rows[0];
  }
  await db.insert(homepageSections).values(updateValues);
  const rows = await db.select().from(homepageSections).where(eq(homepageSections.slug, values.slug)).limit(1);
  return rows[0];
}

export async function deleteHomepageSection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(homepageSections).where(eq(homepageSections.id, id)).limit(1);
  const section = rows[0];
  if (!section) return;
  await db.transaction(async tx => {
    const titles = await tx.select().from(catalogTitles);
    for (const title of titles) {
      const assigned = (title.homeSections ?? []).filter(slug => slug !== section.slug);
      if (assigned.length !== (title.homeSections ?? []).length) await tx.update(catalogTitles).set({ homeSections: assigned }).where(eq(catalogTitles.id, title.id));
    }
    await tx.delete(homepageSections).where(eq(homepageSections.id, id));
  });
}

export async function reorderHomepageSections(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const current = await db.select({ id: homepageSections.id }).from(homepageSections).orderBy(asc(homepageSections.sortOrder));
  const currentIds = new Set(current.map(section => section.id));
  if (ids.length !== current.length || new Set(ids).size !== ids.length || ids.some(id => !currentIds.has(id))) throw new Error("The homepage shelf order is out of date. Refresh and try again.");
  await db.transaction(async tx => {
    for (const [sortOrder, id] of ids.entries()) await tx.update(homepageSections).set({ sortOrder }).where(eq(homepageSections.id, id));
  });
  return listHomepageSections(true);
}

export async function reorderFeaturedTitles(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const current = await db.select({ id: catalogTitles.id }).from(catalogTitles).where(eq(catalogTitles.featured, true));
  const currentIds = new Set(current.map(title => title.id));
  if (ids.length !== current.length || new Set(ids).size !== ids.length || ids.some(id => !currentIds.has(id))) throw new Error("The featured-title order is out of date. Refresh and try again.");
  await db.transaction(async tx => {
    for (const [featuredOrder, id] of ids.entries()) await tx.update(catalogTitles).set({ featuredOrder }).where(eq(catalogTitles.id, id));
  });
  return listCatalogTitles({ admin: true });
}
