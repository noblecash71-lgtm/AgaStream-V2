import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, Pencil, Play, PlayCircle } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import EmptyState from "@/components/EmptyState";
import { SiteLayout, useSiteAdminAccess } from "@/components/SiteLayout";
import MediaPlayer from "@/components/MediaPlayer";
import { slugifyLabel } from "@/lib/catalogTypes";
import { trpc } from "@/lib/trpc";
import { getCatalogDocumentTitle } from "@/lib/siteSeo";

export default function TitleDetail() {
  const [, setLocation] = useLocation();
  const isAdmin = useSiteAdminAccess();
  const [, params] = useRoute("/title/:slug");
  const slug = params?.slug ?? "";
  const query = trpc.catalog.publicBySlug.useQuery({ slug }, { enabled: Boolean(slug) });
  const title = query.data;
  const settingsQuery = trpc.site.publicSettings.useQuery();
  const siteName = settingsQuery.data?.siteName || "AgaStream";
  const categoriesQuery = trpc.catalog.publicCategories.useQuery(undefined, { enabled: Boolean(title) });
  const interpretersQuery = trpc.catalog.publicInterpreters.useQuery(undefined, { enabled: Boolean(title) });
  const episodesQuery = trpc.catalog.publicEpisodes.useQuery(
    { seriesId: title?.id ?? 0 },
    { enabled: Boolean(title && title.kind === "series") },
  );
  const episodes = episodesQuery.data ?? [];
  const [player, setPlayer] = useState<{ url: string; label: string } | null>(null);
  const autoOpenedRef = useRef("");
  const seasons = useMemo(() => {
    const grouped = new Map<number, typeof episodes>();
    episodes.forEach(episode => grouped.set(episode.seasonNumber, [...(grouped.get(episode.seasonNumber) ?? []), episode]));
    return [...grouped.entries()].sort(([a], [b]) => a - b);
  }, [episodes]);

  useEffect(() => {
    if (!title?.title) return;
    const documentTitle = getCatalogDocumentTitle(title.title, siteName);
    document.title = documentTitle;
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", documentTitle);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", documentTitle);
  }, [title?.title, siteName]);

  useEffect(() => {
    if (!title) return;
    const requestedPlay = new URLSearchParams(window.location.search).get("play");
    const requestKey = `${title.id}:${requestedPlay ?? ""}`;
    if (!requestedPlay || autoOpenedRef.current === requestKey) return;
    if (requestedPlay === "trailer" && title.trailerUrl) setPlayer({ url: title.trailerUrl, label: "Trailer" });
    else if (requestedPlay === "movie" && title.rightsConfirmed && title.playbackUrl) setPlayer({ url: title.playbackUrl, label: "Now playing" });
    autoOpenedRef.current = requestKey;
    window.history.replaceState(window.history.state, "", `/title/${encodeURIComponent(title.slug)}`);
    setLocation(`/title/${encodeURIComponent(title.slug)}`);
  }, [title?.id, title?.slug, title?.trailerUrl, title?.rightsConfirmed, title?.playbackUrl, setLocation]);

  if (query.isLoading) return <SiteLayout><main className="site-container"><div className="empty-state" style={{ marginTop: 55 }}><p>Opening the title…</p></div></main></SiteLayout>;
  if (!title) return <SiteLayout><main className="site-container" style={{ paddingTop: 40 }}><EmptyState title="Title not found" message="This title may have moved or is not published in the catalog." /><Link className="button-secondary" style={{ marginTop: 18 }} href="/movies"><ArrowLeft size={14} /> Back to movies</Link></main></SiteLayout>;

  const downloadHref = title.rightsConfirmed ? title.downloadUrl : null;
  return <SiteLayout>
    <main>
      <section className="detail-backdrop">
        {title.backdropUrl && <img src={title.backdropUrl} alt="" />}
        <div className="detail-content">
          <Link className="eyebrow" href={title.kind === "series" ? "/tv-series" : "/movies"}><ArrowLeft size={12} style={{ verticalAlign: "middle", marginRight: 5 }} />{title.kind === "series" ? "TV Series" : "Movies"}</Link>
          <h1>{title.title}</h1>
          <div className="detail-meta">
            {title.releaseYear && <span>{title.releaseYear}</span>}
            <span>{title.kind === "series" ? "Series" : "Movie"}</span>
            {title.durationMinutes && <span>{title.durationMinutes} min</span>}
            {title.rating && <span>{title.rating}</span>}
          </div>
          {title.synopsis && <p className="detail-synopsis">{title.synopsis}</p>}
          <div className="detail-actions">
            {title.trailerUrl && <button className="button-secondary" onClick={() => setPlayer({ url: title.trailerUrl!, label: "Trailer" })}><PlayCircle size={15} /> Watch trailer</button>}
            {title.rightsConfirmed && title.playbackUrl && <button className="button-primary" onClick={() => setPlayer({ url: title.playbackUrl!, label: "Now playing" })}><Play size={14} fill="currentColor" /> Play {title.kind === "series" ? "series" : "movie"}</button>}
            {downloadHref && <a className="button-secondary" href={downloadHref} target="_blank" rel="noreferrer" download><Download size={14} /> Direct download</a>}
            {isAdmin && <Link className="button-secondary" href={`/admin?edit=${title.id}`}><Pencil size={14} /> Edit in Admin Studio</Link>}
          </div>
        </div>
      </section>

      <section className="site-container detail-layout">
        <div>{title.posterUrl ? <img className="detail-poster" src={title.posterUrl} alt={`${title.title} poster`} /> : <div className="poster-link" style={{ width: "100%" }}><div className="poster-placeholder"><span>{title.title.slice(0, 1).toUpperCase()}</span></div></div>}</div>
        <div>
          <span className="eyebrow">About this title</span>
          <h2 className="section-title" style={{ margin: "12px 0 19px" }}>{title.title}</h2>
          <dl className="detail-list">
            <dt>Format</dt><dd>{title.kind === "series" ? "TV series" : "Feature film"}</dd>
            {title.releaseYear && <><dt>Release year</dt><dd>{title.releaseYear}</dd></>}
            {title.categories.length > 0 && <><dt>Categories</dt><dd>{title.categories.map((category, index) => { const slug = categoriesQuery.data?.find(item => item.name.toLowerCase() === category.toLowerCase())?.slug ?? slugifyLabel(category); return <span key={category}>{index > 0 ? " · " : ""}<Link className="section-link" href={`/category/${encodeURIComponent(slug)}`}>{category}</Link></span>; })}</dd></>}
            {title.interpreters.length > 0 && <><dt>Interpreters</dt><dd>{title.interpreters.map((name, index) => { const slug = interpretersQuery.data?.find(item => item.name.toLowerCase() === name.toLowerCase())?.slug ?? slugifyLabel(name); return <span key={name}>{index > 0 ? " · " : ""}<Link className="section-link" href={`/interpreter/${encodeURIComponent(slug)}`}>{name}</Link></span>; })}</dd></>}
          </dl>
          {title.kind === "series" && <section className="section-block" style={{ paddingTop: 36 }}>
            <div className="section-heading"><div><h2 className="section-title">Seasons & episodes</h2><p className="section-subtitle">Choose an episode to watch when a rights-cleared source is available.</p></div></div>
            {episodesQuery.isLoading ? <div className="empty-state"><p>Loading episodes…</p></div> : seasons.length ? seasons.map(([season, items]) => <div key={season} className="admin-panel" style={{ marginTop: 12 }}>
              <div className="panel-head"><h2>Season {season}</h2><span className="category-count">{items.length} {items.length === 1 ? "episode" : "episodes"}</span></div>
              <div style={{ padding: "0 16px" }}>{items.map(episode => <div key={episode.id} className="episode-row">
                <span className="episode-number">E{String(episode.episodeNumber).padStart(2, "0")}</span>
                <div><div className="episode-name">{episode.title}</div>{episode.synopsis && <div className="episode-summary">{episode.synopsis}</div>}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {episode.rightsConfirmed && episode.playbackUrl && <button className="row-action" aria-label={`Play ${episode.title}`} title="Play episode" onClick={() => setPlayer({ url: episode.playbackUrl!, label: `S${season} E${episode.episodeNumber}` })}><Play size={14} /></button>}
                  {episode.rightsConfirmed && episode.downloadUrl && <a className="row-action" aria-label={`Download ${episode.title}`} title="Direct download" href={episode.downloadUrl} target="_blank" rel="noreferrer" download><Download size={14} /></a>}
                </div>
              </div>)}</div>
            </div>) : <EmptyState title="Episodes coming soon" message="The administrator can add seasons and episodes in Admin Studio." />}
          </section>}
          {!title.synopsis && <p className="detail-synopsis" style={{ marginTop: 24 }}>AgaStream’s catalog entry for {title.title}.</p>}
        </div>
      </section>
      <section className="site-container" style={{ paddingBottom: 50 }}>
        {!title.rightsConfirmed && <p className="form-hint">Full-length playback and download links are shown only for media whose distribution rights are confirmed by the administrator.</p>}
      </section>
    </main>
    {player && <MediaPlayer url={player.url} title={title.title} label={player.label} onClose={() => setPlayer(null)} />}
  </SiteLayout>;
}
