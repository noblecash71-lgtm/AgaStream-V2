import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import type { AdminHomepageSection, AdminTitle } from "@/lib/catalogTypes";
import { trpc } from "@/lib/trpc";

export default function HomepageManager({ onEditTitle, onAddTitle }: { onEditTitle: (title: AdminTitle) => void; onAddTitle: () => void }) {
  const utils = trpc.useUtils();
  const titlesQuery = trpc.catalog.adminList.useQuery(undefined, { retry: false });
  const sectionsQuery = trpc.site.adminHomepageSections.useQuery(undefined, { retry: false });
  const titles = titlesQuery.data ?? [];
  const sections = sectionsQuery.data ?? [];
  const featured = useMemo(() => titles.filter(title => title.featured).sort((a, b) => (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (b.featuredOrder ?? Number.MAX_SAFE_INTEGER)), [titles]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<AdminHomepageSection | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  const refreshSections = async () => {
    await Promise.all([utils.site.adminHomepageSections.invalidate(), utils.site.publicHomepageSections.invalidate(), utils.catalog.adminList.invalidate(), utils.catalog.publicList.invalidate()]);
  };
  const saveSection = trpc.site.saveHomepageSection.useMutation({ onSuccess: async () => { await refreshSections(); setEditing(null); setName(""); setIsVisible(true); toast.success("Homepage shelf saved"); }, onError: error => toast.error(error.message) });
  const deleteSection = trpc.site.deleteHomepageSection.useMutation({ onSuccess: async () => { await refreshSections(); toast.success("Homepage shelf removed"); }, onError: error => toast.error(error.message) });
  const reorderSections = trpc.site.reorderHomepageSections.useMutation({ onSuccess: async () => { await refreshSections(); }, onError: error => toast.error(error.message) });
  const reorderFeatured = trpc.site.reorderFeaturedTitles.useMutation({ onSuccess: async () => { await Promise.all([utils.catalog.adminList.invalidate(), utils.catalog.publicList.invalidate()]); }, onError: error => toast.error(error.message) });
  const unfeature = trpc.catalog.saveTitle.useMutation({ onSuccess: async () => { await Promise.all([utils.catalog.adminList.invalidate(), utils.catalog.publicList.invalidate()]); toast.success("Title removed from the hero"); }, onError: error => toast.error(error.message) });

  function editSection(section: AdminHomepageSection) {
    setEditing(section);
    setName(section.name);
    setIsVisible(section.isVisible);
  }
  function resetSectionForm() { setEditing(null); setName(""); setIsVisible(true); }
  function submitSection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveSection.mutate({ ...(editing ? { id: editing.id } : {}), name: name.trim(), isVisible });
  }
  function moveSection(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= sections.length) return;
    const ids = sections.map(section => section.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    reorderSections.mutate({ ids });
  }
  function moveFeatured(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= featured.length) return;
    const ids = featured.map(title => title.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    reorderFeatured.mutate({ ids });
  }
  function removeFromHero(title: AdminTitle) {
    if (!window.confirm(`Remove “${title.title}” from the homepage hero? It will remain in the catalog.`)) return;
    unfeature.mutate({
      id: title.id,
      title: title.title,
      kind: title.kind,
      synopsis: title.synopsis,
      releaseYear: title.releaseYear,
      durationMinutes: title.durationMinutes,
      rating: title.rating,
      posterUrl: title.posterUrl,
      backdropUrl: title.backdropUrl,
      categories: title.categories,
      interpreters: title.interpreters,
      homeSections: title.homeSections ?? [],
      trailerUrl: title.trailerUrl,
      playbackUrl: title.playbackUrl,
      downloadUrl: title.downloadUrl,
      rightsConfirmed: title.rightsConfirmed,
      featured: false,
      status: title.status,
    });
  }
  function askDelete(section: AdminHomepageSection) {
    if (!window.confirm(`Remove the “${section.name}” shelf and unassign its titles from that homepage row?`)) return;
    deleteSection.mutate({ id: section.id });
  }

  return <div className="homepage-manager">
    <section className="admin-panel">
      <div className="panel-head"><div><h2>Featured homepage slides</h2><p>The hero rotates through published titles marked “Feature on the homepage”. Use the arrows to set the order.</p></div><button className="button-primary" onClick={onAddTitle}><Plus size={14} /> Add a featured title</button></div>
      {titlesQuery.isLoading ? <div className="empty-state"><p>Loading featured titles…</p></div> : featured.length ? <div className="hero-manager-list">{featured.map((title, index) => <div className="hero-manager-row" key={title.id}>
        {title.backdropUrl || title.posterUrl ? <img src={title.backdropUrl || title.posterUrl || ""} alt="" /> : <span className="hero-manager-fallback"><Star size={16} /></span>}
        <div className="hero-manager-info"><strong>{title.title}</strong><span>{title.kind === "series" ? "Series" : "Movie"} · {title.releaseYear ?? "Year not set"} · <span className={`status-pill ${title.status}`}>{title.status}</span></span><small>Hero slide {index + 1} · {title.status === "published" ? "Visible to visitors" : "Publish the title to show it"}</small></div>
        <div className="row-actions"><button className="row-action" title="Move up" aria-label={`Move ${title.title} up`} disabled={index === 0 || reorderFeatured.isPending} onClick={() => moveFeatured(index, -1)}><ArrowUp size={14} /></button><button className="row-action" title="Move down" aria-label={`Move ${title.title} down`} disabled={index === featured.length - 1 || reorderFeatured.isPending} onClick={() => moveFeatured(index, 1)}><ArrowDown size={14} /></button><button className="row-action" title="Edit title" aria-label={`Edit ${title.title}`} onClick={() => onEditTitle(title)}><Pencil size={14} /></button><button className="row-action" title="Remove from hero" aria-label={`Remove ${title.title} from hero`} onClick={() => removeFromHero(title)}><Trash2 size={14} /></button></div>
      </div>)}</div> : <div className="empty-state"><h3>No featured slides yet</h3><p>Mark a catalog title as featured to add it to the homepage hero.</p><button className="button-secondary" onClick={onAddTitle}><Plus size={14} /> Create a title</button></div>}
    </section>

    <section className="admin-panel">
      <div className="panel-head"><div><h2>Custom homepage shelves</h2><p>Create rows and assign titles to them from the title editor.</p></div></div>
      <form className="homepage-section-form" onSubmit={submitSection}>
        <div className="form-field"><label htmlFor="homepage-section-name">Shelf name</label><input id="homepage-section-name" className="text-control" required maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Family favorites" /></div>
        <label className="section-checkbox visibility-check"><input type="checkbox" checked={isVisible} onChange={event => setIsVisible(event.target.checked)} /><span>Show on public homepage</span></label>
        <div className="row-actions"><button className="button-primary" type="submit" disabled={saveSection.isPending}><SaveIcon />{saveSection.isPending ? "Saving…" : editing ? "Save shelf" : "Create shelf"}</button>{editing && <button className="button-secondary" type="button" onClick={resetSectionForm}>Cancel</button>}</div>
      </form>
      {sectionsQuery.isLoading ? <div className="empty-state"><p>Loading homepage shelves…</p></div> : sections.length ? <div className="home-sections-list">{sections.map((section, index) => <div className="home-section-row" key={section.id}>
        <span className="section-order">{String(index + 1).padStart(2, "0")}</span>
        <div className="home-section-info"><strong>{section.name}</strong><small>{section.titleCount} assigned title{section.titleCount === 1 ? "" : "s"} · {section.isVisible ? "Public" : "Hidden"}</small></div>
        <div className="row-actions"><button className="row-action" title={section.isVisible ? "Hide from homepage" : "Show on homepage"} aria-label={section.isVisible ? `Hide ${section.name}` : `Show ${section.name}`} onClick={() => saveSection.mutate({ id: section.id, name: section.name, isVisible: !section.isVisible })}>{section.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}</button><button className="row-action" title="Move up" aria-label={`Move ${section.name} up`} disabled={index === 0 || reorderSections.isPending} onClick={() => moveSection(index, -1)}><ArrowUp size={14} /></button><button className="row-action" title="Move down" aria-label={`Move ${section.name} down`} disabled={index === sections.length - 1 || reorderSections.isPending} onClick={() => moveSection(index, 1)}><ArrowDown size={14} /></button><button className="row-action" title="Edit shelf" aria-label={`Edit ${section.name}`} onClick={() => editSection(section)}><Pencil size={14} /></button><button className="row-action" title="Remove shelf" aria-label={`Remove ${section.name}`} onClick={() => askDelete(section)}><Trash2 size={14} /></button></div>
      </div>)}</div> : <div className="empty-state"><h3>No custom shelves yet</h3><p>Create a shelf, then choose it in a title’s “Homepage shelves” field.</p></div>}
      <p className="admin-access-note">Only published titles assigned to a visible shelf appear to visitors. <Link className="section-link" href="/">View the homepage</Link></p>
    </section>
  </div>;
}

function SaveIcon() { return <Plus size={14} />; }
