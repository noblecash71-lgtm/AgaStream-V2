import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const catalogTitles = mysqlTable(
  "catalog_titles",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 180 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    kind: mysqlEnum("kind", ["movie", "series"]).notNull(),
    synopsis: text("synopsis"),
    releaseYear: int("releaseYear"),
    durationMinutes: int("durationMinutes"),
    rating: varchar("rating", { length: 24 }),
    posterUrl: varchar("posterUrl", { length: 2048 }),
    backdropUrl: varchar("backdropUrl", { length: 2048 }),
    categories: json("categories").$type<string[]>().notNull(),
    interpreters: json("interpreters").$type<string[]>().notNull(),
    trailerUrl: varchar("trailerUrl", { length: 2048 }),
    playbackUrl: varchar("playbackUrl", { length: 2048 }),
    downloadUrl: varchar("downloadUrl", { length: 2048 }),
    rightsConfirmed: boolean("rightsConfirmed").default(false).notNull(),
    featured: boolean("featured").default(false).notNull(),
    featuredOrder: int("featuredOrder"),
    homeSections: json("homeSections").$type<string[]>(),
    status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    slugUnique: uniqueIndex("catalog_titles_slug_unique").on(table.slug),
  }),
);

export const catalogEpisodes = mysqlTable(
  "catalog_episodes",
  {
    id: int("id").autoincrement().primaryKey(),
    seriesId: int("seriesId")
      .notNull()
      .references(() => catalogTitles.id, { onDelete: "cascade" }),
    seasonNumber: int("seasonNumber").notNull(),
    episodeNumber: int("episodeNumber").notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    synopsis: text("synopsis"),
    durationMinutes: int("durationMinutes"),
    playbackUrl: varchar("playbackUrl", { length: 2048 }),
    downloadUrl: varchar("downloadUrl", { length: 2048 }),
    rightsConfirmed: boolean("rightsConfirmed").default(false).notNull(),
    status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    positionUnique: uniqueIndex("catalog_episodes_position_unique").on(
      table.seriesId,
      table.seasonNumber,
      table.episodeNumber,
    ),
  }),
);

export const catalogCategories = mysqlTable(
  "catalog_categories",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    nameUnique: uniqueIndex("catalog_categories_name_unique").on(table.name),
    slugUnique: uniqueIndex("catalog_categories_slug_unique").on(table.slug),
  }),
);

export const catalogInterpreters = mysqlTable(
  "catalog_interpreters",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    description: text("description"),
    photoUrl: varchar("photoUrl", { length: 2048 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    nameUnique: uniqueIndex("catalog_interpreters_name_unique").on(table.name),
    slugUnique: uniqueIndex("catalog_interpreters_slug_unique").on(table.slug),
  }),
);

export const siteSettings = mysqlTable("site_settings", {
  id: int("id").primaryKey(),
  siteName: varchar("siteName", { length: 120 }).notNull(),
  pageTitle: varchar("pageTitle", { length: 180 }).notNull(),
  logoUrl: varchar("logoUrl", { length: 2048 }),
  faviconUrl: varchar("faviconUrl", { length: 2048 }),
  footerYear: varchar("footerYear", { length: 8 }).notNull(),
  footerAbout: text("footerAbout"),
  phone: varchar("phone", { length: 80 }),
  email: varchar("email", { length: 320 }),
  youtubeUrl: varchar("youtubeUrl", { length: 2048 }),
  instagramUrl: varchar("instagramUrl", { length: 2048 }),
  facebookUrl: varchar("facebookUrl", { length: 2048 }),
  copyrightText: varchar("copyrightText", { length: 180 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const homepageSections = mysqlTable(
  "homepage_sections",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    isVisible: boolean("isVisible").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    nameUnique: uniqueIndex("homepage_sections_name_unique").on(table.name),
    slugUnique: uniqueIndex("homepage_sections_slug_unique").on(table.slug),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CatalogTitle = typeof catalogTitles.$inferSelect;
export type NewCatalogTitle = typeof catalogTitles.$inferInsert;
export type CatalogEpisode = typeof catalogEpisodes.$inferSelect;
export type NewCatalogEpisode = typeof catalogEpisodes.$inferInsert;
export type CatalogCategory = typeof catalogCategories.$inferSelect;
export type NewCatalogCategory = typeof catalogCategories.$inferInsert;
export type CatalogInterpreter = typeof catalogInterpreters.$inferSelect;
export type NewCatalogInterpreter = typeof catalogInterpreters.$inferInsert;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type NewSiteSettings = typeof siteSettings.$inferInsert;
export type HomepageSection = typeof homepageSections.$inferSelect;
export type NewHomepageSection = typeof homepageSections.$inferInsert;
