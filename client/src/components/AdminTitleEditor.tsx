import { useState } from "react";
import { Save, X } from "lucide-react";
import type { AdminHomepageSection, AdminTitle, TitleEditorInput } from "@/lib/catalogTypes";
import { splitList } from "@/lib/catalogTypes";
import MediaUpload from "@/components/MediaUpload";

function initialForm(title: AdminTitle | null, defaultFeatured: boolean) {
  return {
    title: title?.title ?? "",
    kind: title?.kind ?? "movie" as const,
    synopsis: title?.synopsis ?? "",
    releaseYear: title?.releaseYear?.toString() ?? "",
    durationMinutes: title?.durationMinutes?.toString() ?? "",
    rating: title?.rating ?? "",
    posterUrl: title?.posterUrl ?? "",
    backdropUrl: title?.backdropUrl ?? "",
    categories: title?.categories.join(", ") ?? "",
    interpreters: title?.interpreters.join(", ") ?? "",
    homeSections: (title?.homeSections ?? []).join(", "),
    trailerUrl: title?.trailerUrl ?? "",
    playbackUrl: title?.playbackUrl ?? "",
    downloadUrl: title?.downloadUrl ?? "",
    rightsConfirmed: title?.rightsConfirmed ?? false,
    featured: title?.featured ?? defaultFeatured,
    status: title?.status ?? "draft" as const,
  };
}

function Field({ label, children, full = false, hint }: { label: string; children: React.ReactNode; full?: boolean; hint?: string }) {
  return <div className={`form-field${full ? " full" : ""}`}><label>{label}</label>{children}{hint && <span className="form-hint">{hint}</span>}</div>;
}

export default function AdminTitleEditor({
  title,
  homepageSections,
  defaultFeatured = false,
  saving,
  onCancel,
  onSubmit,
}: {
  title: AdminTitle | null;
  homepageSections: AdminHomepageSection[];
  defaultFeatured?: boolean;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: TitleEditorInput) => void;
}) {
  const [form, setForm] = useState(() => initialForm(title, defaultFeatured));
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm(previous => ({ ...previous, [key]: value }));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((form.playbackUrl.trim() || form.downloadUrl.trim()) && !form.rightsConfirmed) {
      window.alert("Confirm distribution rights before adding a full video or download source.");
      return;
    }
    onSubmit({
      ...(title ? { id: title.id } : {}),
      title: form.title.trim(),
      kind: form.kind,
      synopsis: form.synopsis.trim() || null,
      releaseYear: form.releaseYear ? Number(form.releaseYear) : null,
      durationMinutes: form.kind === "movie" && form.durationMinutes ? Number(form.durationMinutes) : null,
      rating: form.rating.trim() || null,
      posterUrl: form.posterUrl.trim() || null,
      backdropUrl: form.backdropUrl.trim() || null,
      categories: [...new Set(form.categories.split(",").map(value => value.trim()).filter(Boolean))],
      interpreters: [...new Set(form.interpreters.split(",").map(value => value.trim()).filter(Boolean))],
      homeSections: splitList(form.homeSections),
      trailerUrl: form.trailerUrl.trim() || null,
      playbackUrl: form.playbackUrl.trim() || null,
      downloadUrl: form.downloadUrl.trim() || null,
      rightsConfirmed: form.rightsConfirmed,
      featured: form.featured,
      status: form.status,
    });
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
    <form className="player-dialog admin-editor" role="dialog" aria-modal="true" aria-labelledby="title-editor-heading" onSubmit={submit}>
      <div className="dialog-head"><div><span className="eyebrow">Catalog management</span><h2 id="title-editor-heading" style={{ marginTop: 5 }}>{title ? "Edit title" : "Add a title"}</h2></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Close title editor"><X size={17} /></button></div>
      <div style={{ padding: 18, maxHeight: "calc(90vh - 68px)", overflowY: "auto" }}>
        <div className="form-grid">
          <Field label="Title"><input className="text-control" required maxLength={240} value={form.title} onChange={event => set("title", event.target.value)} placeholder="Enter the movie or series title" /></Field>
          <Field label="Format"><select className="select-control" value={form.kind} onChange={event => set("kind", event.target.value as "movie" | "series")}><option value="movie">Movie</option><option value="series">TV series</option></select></Field>
          <Field label="Release year"><input className="text-control" type="number" min={1888} max={2200} value={form.releaseYear} onChange={event => set("releaseYear", event.target.value)} placeholder="2026" /></Field>
          {form.kind === "movie" && <Field label="Runtime (minutes)"><input className="text-control" type="number" min={1} max={1000} value={form.durationMinutes} onChange={event => set("durationMinutes", event.target.value)} placeholder="105" /></Field>}
          <Field label="Content rating"><input className="text-control" maxLength={24} value={form.rating} onChange={event => set("rating", event.target.value)} placeholder="PG-13, TV-14…" /></Field>
          <Field label="Publication status"><select className="select-control" value={form.status} onChange={event => set("status", event.target.value as "draft" | "published")}><option value="draft">Draft · hidden from visitors</option><option value="published">Published</option></select></Field>
          <Field label="Synopsis" full><textarea className="textarea-control" maxLength={10000} value={form.synopsis} onChange={event => set("synopsis", event.target.value)} placeholder="A short summary for visitors…" /></Field>
          <Field label="Categories" hint="Separate labels with commas; these populate the category directory."><input className="text-control" value={form.categories} onChange={event => set("categories", event.target.value)} placeholder="Drama, Action" /></Field>
          <Field label="Interpreters" hint="Separate names with commas; these populate interpreter discovery."><input className="text-control" value={form.interpreters} onChange={event => set("interpreters", event.target.value)} placeholder="Interpreter names" /></Field>
          <Field label="Homepage shelves" full hint="Choose any custom shelves managed in the Homepage section.">
            {homepageSections.length ? <div className="section-checkboxes">{homepageSections.map(section => { const selected = new Set(splitList(form.homeSections)); return <label className="section-checkbox" key={section.id}><input type="checkbox" checked={selected.has(section.slug)} onChange={event => { const next = new Set(splitList(form.homeSections)); if (event.target.checked) next.add(section.slug); else next.delete(section.slug); set("homeSections", [...next].join(", ")); }} /><span>{section.name}</span></label>; })}</div> : <span className="form-hint">Create a custom homepage shelf before assigning titles to it.</span>}
          </Field>
          <Field label="Poster image URL" hint="Paste a secure HTTPS image or upload a file."><input className="text-control" type="text" value={form.posterUrl} onChange={event => set("posterUrl", event.target.value)} placeholder="https://… or /manus-storage/…" /><MediaUpload purpose="poster" label="poster image" onUploaded={url => set("posterUrl", url)} /></Field>
          <Field label="Backdrop image URL" hint="Paste a secure HTTPS image or upload a file."><input className="text-control" type="text" value={form.backdropUrl} onChange={event => set("backdropUrl", event.target.value)} placeholder="https://… or /manus-storage/…" /><MediaUpload purpose="backdrop" label="backdrop image" onUploaded={url => set("backdropUrl", url)} /></Field>
          <Field label="Trailer URL" full hint="Paste a YouTube, Vimeo, Dailymotion, or other secure video-page link for in-page playback; direct video files can also be uploaded."><input className="text-control" type="text" value={form.trailerUrl} onChange={event => set("trailerUrl", event.target.value)} placeholder="https://youtu.be/… or https://vimeo.com/…" /><MediaUpload purpose="trailer" label="trailer video" onUploaded={url => set("trailerUrl", url)} /></Field>
          <div className="form-field full"><div className="checkbox-line"><input id="rights-confirmed" type="checkbox" checked={form.rightsConfirmed} onChange={event => set("rightsConfirmed", event.target.checked)} /><label htmlFor="rights-confirmed"><strong>I confirm AgaStream has the right to distribute these full-length sources.</strong><span>This confirmation is required before a movie or episode playback URL or direct download URL can be saved or shown to visitors. Trailer embeds remain separate.</span></label></div></div>
          <Field label="Authorized movie/series source" full hint="Only rights-confirmed entries show a Play control. YouTube, Vimeo, Dailymotion, and embeddable HTTPS video pages play in-site; direct MP4/M4V/WebM/OGG/MOV files up to 2 GiB play natively."><input className="text-control" type="text" value={form.playbackUrl} onChange={event => set("playbackUrl", event.target.value)} placeholder="Video page, direct video URL, or /manus-storage/…" /><MediaUpload purpose="playback" label="full movie/series video" rightsConfirmed={form.rightsConfirmed} onUploaded={url => set("playbackUrl", url)} /></Field>
          <Field label="Direct download link" full hint="Provide a direct file URL or upload a file AgaStream is allowed to distribute."><input className="text-control" type="text" value={form.downloadUrl} onChange={event => set("downloadUrl", event.target.value)} placeholder="https://…/download.mp4" /><MediaUpload purpose="download" label="download video" rightsConfirmed={form.rightsConfirmed} onUploaded={url => set("downloadUrl", url)} /></Field>
          <div className="form-field full"><div className="checkbox-line"><input id="featured-title" type="checkbox" checked={form.featured} onChange={event => set("featured", event.target.checked)} /><label htmlFor="featured-title"><strong>Feature on the homepage</strong><span>Highlight this entry in the lead discovery area.</span></label></div></div>
        </div>
        <div className="admin-form-actions"><button className="button-secondary" type="button" onClick={onCancel}>Cancel</button><button className="button-primary" type="submit" disabled={saving}><Save size={14} />{saving ? "Saving…" : title ? "Save changes" : "Create title"}</button></div>
      </div>
    </form>
  </div>;
}
