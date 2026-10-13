# AgaStream implementation plan

## Product scope

Create a separate, editable AgaStream clone based on the supplied public reference at `https://agastream-hvsixupj.manus.space/`. Preserve the site’s core discovery flow and recognizable green film/play brand: Home, Movies, TV Series, Categories, Interpreters, and an Admin Studio. Use the supplied `Logo.png` as the site icon and make the header mark materially larger. Visitors should be able to open a title, play a trailer without leaving the site, and—when a rights-cleared source is supplied—play the original movie/episode or use a direct download link. Preserve the catalog records already present in the managed database; this pass does not import additional movie/series files.

The separate clone is the editable deliverable; the supplied public URL is a reference and is not an attached source project. The implementation will not scrape, re-host, or link to unauthorized full-length works. Admin media fields will be available for content the site operator owns or is licensed to distribute, and the in-page full-video/download controls will only be exposed for rights-confirmed entries.

## Implementation approach

- Build on the initialized React 19 + TypeScript + Tailwind + Wouter + Express + tRPC + Drizzle/MySQL starter, using its Vite dev server, shared database, session-signing utilities, and managed project storage. Avoid new dependencies unless an existing package cannot meet a required behavior.
- Store catalog titles, categories, interpreter profiles, and seasons/episodes in Drizzle tables. Keep title associations as label arrays in the current catalog records; standalone category/interpreter edits cascade their name changes or removal across titles. The storage host rejects browser preflight requests from both the stable Preview origin and the reference domain, so do not expose its presigned URLs to the browser. Let only the authorized administrator stream the selected file to a same-origin Express upload endpoint; validate identity, purpose, MIME, size and rights before obtaining a short-lived project-storage URL on the server, and relay the request stream directly to durable storage without buffering the whole file. Save only the returned stable project-asset path with its catalog/site record. Webdev’s platform gateway owns and intercepts `/manus-storage/` in stable Preview and publication; do not mount the unused Express asset proxy or validate that reserved path by direct dev-port requests. Support artwork and browser-playable video up to 2 GiB; larger works may use operator-controlled HTTPS sources. Never store media in browser localStorage or Git.
- Keep visitor browsing public. Replace the Manus OAuth login with a single password-authenticated site administrator whose fixed username is `Admin`; retrieve the password only from protected server configuration (`AGASTREAM_ADMIN_PASSWORD`). Verify it server-side with a password-derived comparison, issue an expiring signed application session, rate-limit failed attempts, and enforce the fixed administrator identity on every protected procedure. Disable the app’s Manus OAuth login/callback routes and reject platform OAuth identities for catalog writes.
- Validate media URLs as HTTPS and render sources inside an in-app player: YouTube uses `youtube-nocookie.com`, Vimeo and Dailymotion use their provider embed endpoints, ordinary video files use the native `<video>` element, and other secure movie/video pages may load in a sandboxed iframe where the provider permits embedding. Show a safe external-source fallback if a host blocks framing. Full-feature playback and direct-download controls only render when the title/episode has a configured source and the administrator has explicitly confirmed distribution rights. Do not fetch or mirror third-party film files.
- Use the title/series detail view as the single place to start playback, watch the trailer, see season/episode organization, and follow a direct download link. Model a title’s publish status separately from its rights confirmation so drafts and non-cleared records never appear in the public catalog.
- Preserve the app’s signed session cookie `webdev_app_session` and cross-site Preview-compatible `SameSite=None; Secure` behavior; never expose the password, session signing key, or any credential in frontend code, localStorage, Git, logs, or public API responses.

## Workflow additions from the supplied JavaScript

- Rebuild the snippet’s behavior as React components and database-backed tRPC operations, not as direct DOM mutation. Visitor cards use an in-card hover/focus overlay for Play and More Info; the title detail route keeps trailer, movie/episode playback, and download actions on AgaStream. When—and only when—the local `Admin` password session is authenticated, cards also expose quick Edit and Remove actions backed by the protected catalog API and a deletion confirmation.
- The homepage uses an administrator-curated, reorderable set of featured catalog titles for its rotating hero. It also renders administrator-defined custom shelves; admins create, rename, reorder, show/hide, and remove shelves, and assign catalog titles to them. A theme switch is a visitor preference only, not an access-control or publishing setting.
- Add a persistent Site Settings screen for the site name, header logo and favicon, document title, footer copy, contact details, social links, and copyright. Header, browser metadata, and footer consume the saved shared values so updates are visible to all visitors and devices.
- The submitted snippet contains a client-only `Admin` / `Admin123` credential check, browser `localStorage`/`sessionStorage` catalog persistence, and third-party movie-page URLs. Do not copy its password, authorization shortcuts, or content links. Use the requested username `Admin` with a protected, server-only `AGASTREAM_ADMIN_PASSWORD` value, an expiring signed session, and server-side role checks; only use media URLs the site operator is authorized to publish.

## Routes and serving

The client remains a Vite single-page app served by the starter’s Express server; tRPC under `/api/trpc` serves the database-backed catalog and admin operations. The page route manifest declares the actual user-facing pages `/`, `/movies`, `/tv-series`, `/categories`, `/category/:slug`, `/interpreters`, `/interpreter/:slug`, `/title/:slug`, and `/admin`; it excludes the not-found-only fallback route. Assets use relative paths and small supplied brand images live under `client/public/`; larger user-uploaded artwork/media references use platform object storage or administrator-supplied authorized HTTPS URLs.

## Project structure

- `client/src/App.tsx`: route map, app providers, visitor/admin route shells.
- `client/src/pages/`: Home, Movies, TV Series, Categories, Interpreters, Title detail/player, Admin Studio, and Not Found pages.
- `client/src/components/`: shared header/footer/settings consumers, larger AgaStream mark, hover-action title cards, in-page player, reusable secure media-upload picker, catalog editors, category/interpreter management, featured-homepage controls, custom-shelf controls, and Site Settings form.
- `client/src/index.css`: dark cinema surfaces, AgaStream green theme tokens, locally bundled typography, a legible image-led hero treatment, responsive layout and reduced-motion rules.
- `client/public/`: provided logo, favicon and `/manus-routes.json`.
- `drizzle/schema.ts` and `drizzle/`: catalog, independently managed category/interpreter metadata, seasons/episodes, singleton site settings, ordered homepage sections, title-to-section assignments, and featured ordering.
- `server/db.ts`: catalog/taxonomy/settings/section reads and writes, synchronized label changes, featured/section ordering, safe slug lookup and visibility filtering.
- `server/routers.ts`: public read-only catalog, settings and homepage procedures plus password-admin-only CRUD/reorder/publish procedures with URL and rights checks.
- `server/_core/sdk.ts`, `server/_core/cookies.ts`, and `server/_core/env.ts`: signed local Admin sessions, secure Preview cookie attributes, and server-only password configuration. Disable the OAuth callback route in `server/_core/index.ts`.
- Root `app.config.ts`: literal durable HTTPS project logo URL for Manus project metadata, preserving any existing settings.

## Design direction

- **Design Movement:** Contemporary African streaming editorial, blending a cinematic dark canvas with a vivid, modern AgaStream green identity.
- **Core Principles:** (1) Keep title discovery immediate and legible; (2) reserve saturated green for playback and primary actions; (3) give local interpreters and category discovery equal prominence with films; (4) make administrative work clear and compact without weakening access controls.
- **Color Philosophy:** Near-black charcoal and deep graphite echo a screening room; warm white sustains readable editorial typography; a bright AgaStream lime-green is the ownable signal for play, selection, and brand identity. Muted slate supports metadata without competing with posters.
- **Layout Paradigm:** A wide, left-led cinematic hero followed by horizontal editorial shelves, then browsable category/interpreter bands. Keep detail pages asymmetrical: large poster/backdrop region paired with a compact metadata and action rail. Admin Studio uses a persistent left navigation rail and a work-area table/form layout.
- **Signature Elements:** The supplied play/film logo at a larger scale; thin lime divider rules at section starts; compact pill-shaped genre and interpreter labels.
- **Interaction Philosophy:** Predictable controls with clear labels, keyboard-accessible dialogs, visible focus, and no automatic media playback. Cards reveal Play/More Info on hover or keyboard focus, with Edit/Remove only for the authenticated administrator. Trailers and authorized full videos remain in an in-page player.
- **Animation:** Short 140–220 ms opacity/translate/scale transitions for cards, dialogs and navigation; the non-video featured hero may rotate on a restrained timer with manual controls, pauses on hover/focus, honors `prefers-reduced-motion`, and keeps the image brighter in regions not covered by copy while maintaining a readable shade behind the text.
- **Typography System:** Space Grotesk (display headings, 500–700) paired with Manrope (body/UI, 400–700), bundled locally to avoid runtime font-CDN dependence; movie/series title bars, section headings, and page headings display in uppercase while metadata remains legible. Both families are listed on Google Fonts under SIL Open Font License 1.1. Sources: [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk/license) and [Manrope](https://fonts.google.com/specimen/Manrope/license).
- **Brand Essence:** “Kinyarwanda-first film discovery, shaped by the interpreters who bring every story to life.” Personality: **cinematic, welcoming, confident**.
- **Brand Voice:** Headlines are short and discovery-led; actions are direct and descriptive. Examples: “Your next story starts here.” and “Play the trailer.”
- **Wordmark & Logo:** Use the supplied AgaStream artwork rather than recreating the mark; show it in a larger header image treatment with accessible “AgaStream” labeling and use the same source artwork for the browser icon.
- **Signature Brand Color:** Electric AgaStream green (`#63E62D`, with accessible darker/lighter states).

## Material constraints

- This project is a clone on its own managed Preview; the referenced `manus.space` site is not attached as a source project in this session, so changes here cannot overwrite that URL.
- No movie, series, trailer or download URLs are supplied. The Admin Studio will accept only operator-provided HTTPS URLs, and full-length playback/download UI will remain hidden until an authorized source and rights confirmation exist.
- The runtime storage API provides presigned uploads but no application-level object delete/list operation. Admin Studio will show a warning that an uploaded file can remain stored if the editor is canceled; the app will keep its stable path only after the relevant record is saved.
- The uploaded JavaScript is used as a workflow reference, not as a source of preloaded movie data, credentials, or media URLs. Existing managed catalog records remain intact; this pass does not import additional movie/series files.
- The current project configuration reports automatic publishing enabled; a checkpoint push therefore publishes the resulting version. Do not claim this release is private Preview-only unless that project setting has first been turned off by the user.


## Homepage SEO and collection navigation refinement

- The initial homepage document title is exactly **56 characters** (`AgaStream | Kinyarwanda Movies & TV Series Online | Home`), with a **153-character** description and **6** focused keywords. The rendered `document.title` accepts an administrator-configured value only when it is 30–60 characters; otherwise it uses the compliant homepage title. Keep the title, description, keyword count, canonical URL, and social-preview metadata synchronized in the initial HTML.
- All homepage images that communicate brand, title artwork, posters, or interpreter portraits receive descriptive alternative text. Dynamic generated shelf/page headings are limited to 80 characters.
- Keep the browse-category band, and add an editorial shelf for every category with published titles. A category shelf lists its matching titles and links to the complete category page. All section actions use “See all”; admin-curated shelves have a complete public listing route of their own.
- Interpreter tiles present a name, title count, and profile description in separate readable lines; descriptions are clamped visually without merging into the name/count text.
- Increase image brightness/contrast in uncovered slideshow artwork areas while retaining a high-contrast copy gradient in both light and dark themes and at mobile widths.
- Before client JavaScript runs, serve an initial HTML fallback with the homepage H1, description, and crawlable Movies, TV Series, Categories, and Interpreters links; React replaces this fallback with the fully interactive catalog.

- Keep movie/series cards consistently smaller across public browse grids and horizontal shelves, with responsive column counts and usable mobile actions; leave the underlying catalog records and poster files unchanged.
- On a title-detail visit, set the browser document title and social title from the actual catalog title in uppercase plus the current site name. Use the uppercased route slug only as an interim fallback while the title record loads; do not alter the stored title or slug.


## Admin route access refinement

- Remove the Admin entry from public desktop, mobile, and footer navigation. Keep the existing password-protected `/admin` path working, add `/admin-panel` as an alias to the same Admin Studio, and preserve the server-side Admin authentication boundary.
