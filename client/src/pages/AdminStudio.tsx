import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutDashboard, Film, Layers3, Tags, Plus, Pencil, Trash2, Search, ShieldCheck, LogIn, LogOut, ListVideo, CircleAlert, Check, ArrowUpRight, Image, Settings } from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import SiteHeader from "@/components/SiteHeader";
import AdminEpisodeEditor from "@/components/AdminEpisodeEditor";
import AdminTitleEditor from "@/components/AdminTitleEditor";
import CatalogCollections from "@/components/CatalogCollections";
import HomepageManager from "@/components/HomepageManager";
import SiteSettingsManager from "@/components/SiteSettingsManager";
import TitleCard from "@/components/TitleCard";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/_core/hooks/useAuth";
import type { AdminEpisode, AdminTitle, EpisodeEditorInput, TitleEditorInput } from "@/lib/catalogTypes";
import { trpc } from "@/lib/trpc";

const sections = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "catalog", label: "Catalog", icon: Film },
  { id: "episodes", label: "Seasons & episodes", icon: Layers3 },
  { id: "collections", label: "Categories & interpreters", icon: Tags },
  { id: "homepage", label: "Homepage", icon: Image },
  { id: "settings", label: "Site settings", icon: Settings },
] as const;
type Section = (typeof sections)[number]["id"];

export default function AdminStudio() {
  const [location] = useLocation();
  const auth = useAuth();
  const [loginUsername, setLoginUsername] = useState("Admin");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const adminCheck = trpc.auth.adminStatus.useQuery(undefined, { enabled: auth.isAuthenticated, retry: false });
  const isAdmin = adminCheck.data === true;
  const utils = trpc.useUtils();
  const passwordLogin = trpc.auth.passwordLogin.useMutation({
    onSuccess: async () => {
      setLoginPassword("");
      setLoginError("");
      await auth.refresh();
    },
    onError: error => {
      const code = error.data?.code;
      setLoginError(code === "TOO_MANY_REQUESTS" || code === "PRECONDITION_FAILED" ? error.message : "Invalid username or password.");
    },
  });
  const titlesQuery = trpc.catalog.adminList.useQuery(undefined, { enabled: isAdmin, retry: false });
  const titles = titlesQuery.data ?? [];
  const homepageSectionsQuery = trpc.site.adminHomepageSections.useQuery(undefined, { enabled: isAdmin, retry: false });
  const homepageSections = homepageSectionsQuery.data ?? [];
  const [section, setSection] = useState<Section>("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [titleEditor, setTitleEditor] = useState<AdminTitle | null | undefined>(undefined);
  const [newTitleFeaturedDefault, setNewTitleFeaturedDefault] = useState(false);
  const [catalogView, setCatalogView] = useState<"cards" | "table">("cards");
  const [episodeEditor, setEpisodeEditor] = useState<AdminEpisode | null | undefined>(undefined);
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null);
  const handledEditRef = useRef<number | null>(null);
  const series = titles.filter(title => title.kind === "series");

  useEffect(() => {
    if (series.length && !series.some(item => item.id === selectedSeriesId)) setSelectedSeriesId(series[0].id);
    if (!series.length) setSelectedSeriesId(null);
  }, [series.map(item => item.id).join(","), selectedSeriesId]);

  const editIdFromUrl = Number(new URLSearchParams(location.split("?")[1] ?? "").get("edit"));
  useEffect(() => {
    if (!isAdmin || !Number.isInteger(editIdFromUrl) || editIdFromUrl <= 0 || !titles.length || handledEditRef.current === editIdFromUrl) return;
    const title = titles.find(item => item.id === editIdFromUrl);
    if (!title) return;
    handledEditRef.current = editIdFromUrl;
    setSection("catalog");
    setTitleEditor(title);
  }, [isAdmin, editIdFromUrl, titles]);

  const episodesQuery = trpc.catalog.adminEpisodes.useQuery(
    { seriesId: selectedSeriesId ?? 0 },
    { enabled: isAdmin && selectedSeriesId !== null, retry: false },
  );
  const episodes = episodesQuery.data ?? [];
  const saveTitle = trpc.catalog.saveTitle.useMutation({
    onSuccess: async () => { await Promise.all([utils.catalog.adminList.invalidate(), utils.catalog.publicList.invalidate(), utils.catalog.adminCategories.invalidate(), utils.catalog.publicCategories.invalidate(), utils.catalog.adminInterpreters.invalidate(), utils.catalog.publicInterpreters.invalidate(), utils.site.adminHomepageSections.invalidate(), utils.site.publicHomepageSections.invalidate()]); setTitleEditor(undefined); setNewTitleFeaturedDefault(false); toast.success("Catalog entry saved"); },
    onError: error => toast.error(error.message),
  });
  const removeTitle = trpc.catalog.deleteTitle.useMutation({
    onSuccess: async () => { await Promise.all([utils.catalog.adminList.invalidate(), utils.catalog.publicList.invalidate(), utils.catalog.adminCategories.invalidate(), utils.catalog.publicCategories.invalidate(), utils.catalog.adminInterpreters.invalidate(), utils.catalog.publicInterpreters.invalidate(), utils.site.adminHomepageSections.invalidate(), utils.site.publicHomepageSections.invalidate()]); toast.success("Title removed"); },
    onError: error => toast.error(error.message),
  });
  const saveEpisode = trpc.catalog.saveEpisode.useMutation({
    onSuccess: async () => { await utils.catalog.adminEpisodes.invalidate(); await utils.catalog.publicEpisodes.invalidate(); setEpisodeEditor(undefined); toast.success("Episode saved"); },
    onError: error => toast.error(error.message),
  });
  const removeEpisode = trpc.catalog.deleteEpisode.useMutation({
    onSuccess: async () => { await utils.catalog.adminEpisodes.invalidate(); await utils.catalog.publicEpisodes.invalidate(); toast.success("Episode removed"); },
    onError: error => toast.error(error.message),
  });
  async function handleLogout() {
    try { await auth.logout(); toast.success("Signed out"); }
    catch { toast.error("Could not sign out. Please try again."); }
  }

  const filteredTitles = useMemo(() => titles.filter(title => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [title.title, title.kind, ...title.categories, ...title.interpreters, ...(title.homeSections ?? [])].join(" ").toLowerCase().includes(term);
    const matchesStatus = statusFilter === "all" || title.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [titles, search, statusFilter]);

  if (auth.loading || (auth.isAuthenticated && adminCheck.isLoading)) return <><SiteHeader /><main className="site-container"><div className="empty-state" style={{ marginTop: 55 }}><p>Checking administrator access…</p></div></main></>;
  if (!auth.isAuthenticated) return <><SiteHeader /><main className="site-container"><div className="login-card"><img src="/agastream-logo.png" alt="AgaStream logo" /><span className="eyebrow">AgaStream Admin Studio</span><h1>Sign in to manage your catalog.</h1><p>Use the site administrator credentials to manage AgaStream. Visitor browsing remains public.</p><form className="admin-login-form" onSubmit={event => { event.preventDefault(); setLoginError(""); passwordLogin.mutate({ username: loginUsername, password: loginPassword }); }}><label className="form-field"><span>Username</span><input className="text-control" type="text" name="username" autoComplete="username" value={loginUsername} onChange={event => setLoginUsername(event.target.value)} required /></label><label className="form-field"><span>Password</span><input className="text-control" type="password" name="password" autoComplete="current-password" minLength={8} maxLength={256} value={loginPassword} onChange={event => setLoginPassword(event.target.value)} required /></label>{loginError && <p className="admin-login-error" role="alert">{loginError}</p>}<button className="button-primary" type="submit" disabled={passwordLogin.isPending || loginPassword.length < 8}><LogIn size={15} /> {passwordLogin.isPending ? "Signing in…" : "Sign in"}</button></form><div className="admin-access-note">This password is checked by the AgaStream server and is not sent to an external identity provider.</div></div></main></>;
  if (!isAdmin) return <><SiteHeader /><main className="site-container"><div className="login-card"><ShieldCheck size={32} color="var(--green)" style={{ margin: "8px auto" }} /><span className="eyebrow">Restricted area</span><h1>Admin access required.</h1><p>This session does not have AgaStream administrator privileges.</p><button className="button-secondary" onClick={() => void handleLogout()}>Sign out</button></div></main></>;

  const stats = {
    all: titles.length,
    published: titles.filter(title => title.status === "published").length,
    drafts: titles.filter(title => title.status === "draft").length,
    episodes: episodes.length,
  };
  const activeSeries = series.find(title => title.id === selectedSeriesId) ?? null;

  function submitTitle(input: TitleEditorInput) { saveTitle.mutate(input); }
  function submitEpisode(input: EpisodeEditorInput) { saveEpisode.mutate(input); }
  function beginCreateTitle(featured = false) { setNewTitleFeaturedDefault(featured); setTitleEditor(null); }
  function askDeleteTitle(title: AdminTitle) {
    if (window.confirm(`Remove “${title.title}” and all of its episodes from AgaStream? This cannot be undone. Uploaded media files remain in project storage; this removes only the catalog records.`)) removeTitle.mutate({ id: title.id });
  }
  function askDeleteEpisode(episode: AdminEpisode) {
    if (window.confirm(`Remove episode “${episode.title}”? This cannot be undone. Uploaded media files remain in project storage; this removes only the episode record.`)) removeEpisode.mutate({ id: episode.id });
  }

  return <div className="site-shell"><SiteHeader /><div className="admin-shell">
    <aside className="admin-sidebar"><div className="admin-label">AgaStream · Admin</div><nav className="admin-nav" aria-label="Admin sections">{sections.map(item => { const Icon = item.icon; return <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => setSection(item.id)}><Icon size={15} />{item.label}</button>; })}</nav></aside>
    <main className="admin-main">
      <div className="admin-topline"><div><span className="eyebrow">NobleCash Group · Admin Studio</span><h1>{sections.find(item => item.id === section)?.label}</h1><p>Manage what visitors discover, watch, and download on AgaStream.</p></div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><Link className="button-secondary" href="/"><ArrowUpRight size={14} /> View site</Link><button className="icon-button" title="Sign out" aria-label="Sign out" onClick={() => void handleLogout()}><LogOut size={15} /></button></div></div>

      {titlesQuery.isError && <div className="checkbox-line" style={{ marginTop: 20 }}><CircleAlert size={16} color="#e4b756" /><span>Could not load catalog data. Check the database migration and administrator permissions, then refresh.</span></div>}

      {section === "overview" && <>
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Catalog titles</div><div className="stat-value">{stats.all}</div><div className="stat-foot">Movies and series</div></div>
          <div className="stat-card"><div className="stat-label">Published</div><div className="stat-value" style={{ color: "var(--green)" }}>{stats.published}</div><div className="stat-foot">Visible to visitors</div></div>
          <div className="stat-card"><div className="stat-label">Drafts</div><div className="stat-value">{stats.drafts}</div><div className="stat-foot">Only visible to admins</div></div>
          <div className="stat-card"><div className="stat-label">Episodes</div><div className="stat-value">{episodesQuery.isLoading ? "—" : stats.episodes}</div><div className="stat-foot">For the selected series</div></div>
        </div>
        <section className="admin-panel"><div className="panel-head"><div><h2>Quick actions</h2><p>Keep the AgaStream catalog current.</p></div></div><div style={{ display: "flex", gap: 9, padding: 16, flexWrap: "wrap" }}><button className="button-primary" onClick={() => beginCreateTitle(false)}><Plus size={14} /> Add a movie or series</button><button className="button-secondary" onClick={() => setSection("episodes")}><ListVideo size={14} /> Manage episodes</button><button className="button-secondary" onClick={() => setSection("collections")}><Tags size={14} /> Manage categories</button><button className="button-secondary" onClick={() => setSection("homepage")}><Image size={14} /> Manage homepage</button><button className="button-secondary" onClick={() => setSection("settings")}><Settings size={14} /> Site settings</button></div></section>
        <section className="admin-panel"><div className="panel-head"><div><h2>Recently updated</h2><p>Your most recently edited catalog entries.</p></div><button className="button-ghost" onClick={() => setSection("catalog")}>Open catalog <ArrowUpRight size={13} /></button></div>
          {titles.length ? <div className="table-wrap"><table className="admin-table"><thead><tr><th>Title</th><th>Format</th><th>Status</th><th>Rights</th><th></th></tr></thead><tbody>{titles.slice(0, 6).map(title => <tr key={title.id}><td><span className="table-title">{title.posterUrl ? <img className="table-thumb" src={title.posterUrl} alt="" /> : <span className="table-thumb" />}<strong>{title.title}</strong></span></td><td>{title.kind === "series" ? "TV series" : "Movie"}</td><td><span className={`status-pill ${title.status}`}>{title.status}</span></td><td>{title.rightsConfirmed ? <span className="status-pill rights"><Check size={11} /> Confirmed</span> : <span className="status-pill">Not confirmed</span>}</td><td><button className="row-action" title="Edit title" aria-label={`Edit ${title.title}`} onClick={() => setTitleEditor(title)}><Pencil size={14} /></button></td></tr>)}</tbody></table></div> : <EmptyState title="The catalog is ready" message="Create your first title to start building the public AgaStream library." />}
        </section>
        <p className="admin-access-note"><ShieldCheck size={13} style={{ verticalAlign: "middle", marginRight: 5 }} />Catalog edits are stored in the managed database. Full-length player and download actions require rights confirmation.</p>
      </>}

      {section === "catalog" && <section className="admin-panel" style={{ marginTop: 25 }}>
        <div className="panel-head"><div><h2>All titles</h2><p>{filteredTitles.length} matching entries · drafts stay private until published. Cards include hover controls for edit and removal.</p></div><button className="button-primary" onClick={() => beginCreateTitle(false)}><Plus size={14} /> Add title</button></div>
        <div style={{ display: "flex", gap: 9, padding: "13px 16px", flexWrap: "wrap" }}><label className="search-field" style={{ width: 260 }}><Search size={14} /><input aria-label="Search catalog" placeholder="Search titles, categories, interpreters" value={search} onChange={event => setSearch(event.target.value)} /></label><select className="select-control" style={{ width: 150 }} value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter publication status"><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select></div>
        <div className="catalog-view-toggle"><span>View</span><button className={catalogView === "cards" ? "active" : ""} type="button" onClick={() => setCatalogView("cards")}>Cards</button><button className={catalogView === "table" ? "active" : ""} type="button" onClick={() => setCatalogView("table")}>List</button></div>
        {filteredTitles.length ? catalogView === "cards" ? <div className="title-grid admin-title-card-grid">{filteredTitles.map(title => <TitleCard key={title.id} title={title} isAdmin onAdminEdit={() => setTitleEditor(title)} onAdminDelete={() => askDeleteTitle(title)} />)}</div> : <div className="table-wrap"><table className="admin-table"><thead><tr><th>Title</th><th>Format</th><th>Categories</th><th>Status</th><th>Rights</th><th>Actions</th></tr></thead><tbody>{filteredTitles.map(title => <tr key={title.id}><td><span className="table-title">{title.posterUrl ? <img className="table-thumb" src={title.posterUrl} alt="" /> : <span className="table-thumb" />}<strong>{title.title}</strong></span></td><td>{title.kind === "series" ? "Series" : "Movie"}</td><td>{title.categories.join(", ") || "—"}</td><td><span className={`status-pill ${title.status}`}>{title.status}</span></td><td>{title.rightsConfirmed ? <span className="status-pill rights"><Check size={11} /> Confirmed</span> : <span className="status-pill">Not confirmed</span>}</td><td><div className="row-actions"><button className="row-action" title="Edit title" aria-label={`Edit ${title.title}`} onClick={() => setTitleEditor(title)}><Pencil size={14} /></button>{title.kind === "series" && <button className="row-action" title="Manage episodes" aria-label={`Manage episodes for ${title.title}`} onClick={() => { setSelectedSeriesId(title.id); setSection("episodes"); }}><ListVideo size={14} /></button>}<button className="row-action" title="Remove title" aria-label={`Remove ${title.title}`} onClick={() => askDeleteTitle(title)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState title="No catalog entries found" message="Create a title or adjust your filters." />}
      </section>}

      {section === "episodes" && <section className="admin-panel" style={{ marginTop: 25 }}>
        <div className="panel-head"><div><h2>Series seasons & episodes</h2><p>Organize each series and attach rights-cleared episode sources.</p></div>{series.length > 0 && <button className="button-primary" onClick={() => setEpisodeEditor(null)}><Plus size={14} /> Add episode</button>}</div>
        {series.length ? <div style={{ padding: 16 }}>
          <div className="form-field" style={{ maxWidth: 390 }}><label>Choose a series</label><select className="select-control" value={selectedSeriesId ?? ""} onChange={event => setSelectedSeriesId(Number(event.target.value))}>{series.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
          {activeSeries && <p className="form-hint" style={{ marginTop: 10 }}>Managing episodes for <strong>{activeSeries.title}</strong>. Episodes appear to visitors only when both the episode and parent series are published.</p>}
          {episodesQuery.isLoading ? <div className="empty-state" style={{ marginTop: 16 }}><p>Loading episodes…</p></div> : episodes.length ? <div style={{ marginTop: 14 }} className="table-wrap"><table className="admin-table"><thead><tr><th>Position</th><th>Episode</th><th>Status</th><th>Rights</th><th>Actions</th></tr></thead><tbody>{episodes.map(episode => <tr key={episode.id}><td>S{episode.seasonNumber} · E{episode.episodeNumber}</td><td><strong>{episode.title}</strong></td><td><span className={`status-pill ${episode.status}`}>{episode.status}</span></td><td>{episode.rightsConfirmed ? <span className="status-pill rights"><Check size={11} /> Confirmed</span> : <span className="status-pill">Not confirmed</span>}</td><td><div className="row-actions"><button className="row-action" title="Edit episode" aria-label={`Edit ${episode.title}`} onClick={() => setEpisodeEditor(episode)}><Pencil size={14} /></button><button className="row-action" title="Remove episode" aria-label={`Remove ${episode.title}`} onClick={() => askDeleteEpisode(episode)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState title="No episodes in this series yet" message="Add episodes and publish them when each entry is ready." />}
        </div> : <EmptyState title="Add a series first" message="Create a TV series in the catalog before organizing seasons and episodes." />}
      </section>}

      {section === "collections" && <div style={{ marginTop: 25 }}><CatalogCollections /></div>}
      {section === "homepage" && <div style={{ marginTop: 25 }}><HomepageManager onEditTitle={title => setTitleEditor(title)} onAddTitle={() => beginCreateTitle(true)} /></div>}
      {section === "settings" && <div style={{ marginTop: 25 }}><SiteSettingsManager /></div>}
    </main>
  </div>
  {titleEditor !== undefined && <AdminTitleEditor key={`${titleEditor?.id ?? "new-title"}-${newTitleFeaturedDefault}`} title={titleEditor} homepageSections={homepageSections} defaultFeatured={newTitleFeaturedDefault} saving={saveTitle.isPending} onCancel={() => setTitleEditor(undefined)} onSubmit={submitTitle} />}
  {episodeEditor !== undefined && selectedSeriesId !== null && <AdminEpisodeEditor key={episodeEditor?.id ?? `new-episode-${selectedSeriesId}`} episode={episodeEditor} seriesId={selectedSeriesId} saving={saveEpisode.isPending} onCancel={() => setEpisodeEditor(undefined)} onSubmit={submitEpisode} />}
  </div>;
}
