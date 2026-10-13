import { useState } from "react";
import { Save, X } from "lucide-react";
import type { AdminEpisode, EpisodeEditorInput } from "@/lib/catalogTypes";
import MediaUpload from "@/components/MediaUpload";

function initialForm(episode: AdminEpisode | null, seriesId: number) {
  return {
    seasonNumber: episode?.seasonNumber.toString() ?? "1",
    episodeNumber: episode?.episodeNumber.toString() ?? "1",
    title: episode?.title ?? "",
    synopsis: episode?.synopsis ?? "",
    durationMinutes: episode?.durationMinutes?.toString() ?? "",
    playbackUrl: episode?.playbackUrl ?? "",
    downloadUrl: episode?.downloadUrl ?? "",
    rightsConfirmed: episode?.rightsConfirmed ?? false,
    status: episode?.status ?? "draft" as const,
    seriesId,
  };
}

export default function AdminEpisodeEditor({
  episode,
  seriesId,
  saving,
  onCancel,
  onSubmit,
}: {
  episode: AdminEpisode | null;
  seriesId: number;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: EpisodeEditorInput) => void;
}) {
  const [form, setForm] = useState(() => initialForm(episode, seriesId));
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm(previous => ({ ...previous, [key]: value }));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((form.playbackUrl.trim() || form.downloadUrl.trim()) && !form.rightsConfirmed) {
      window.alert("Confirm distribution rights before adding an episode video or download source.");
      return;
    }
    onSubmit({
      ...(episode ? { id: episode.id } : {}),
      seriesId: form.seriesId,
      seasonNumber: Number(form.seasonNumber),
      episodeNumber: Number(form.episodeNumber),
      title: form.title.trim(),
      synopsis: form.synopsis.trim() || null,
      durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
      playbackUrl: form.playbackUrl.trim() || null,
      downloadUrl: form.downloadUrl.trim() || null,
      rightsConfirmed: form.rightsConfirmed,
      status: form.status,
    });
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
    <form className="player-dialog admin-editor" role="dialog" aria-modal="true" aria-labelledby="episode-editor-heading" onSubmit={submit}>
      <div className="dialog-head"><div><span className="eyebrow">Series management</span><h2 id="episode-editor-heading" style={{ marginTop: 5 }}>{episode ? "Edit episode" : "Add an episode"}</h2></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Close episode editor"><X size={17} /></button></div>
      <div style={{ padding: 18, maxHeight: "calc(90vh - 68px)", overflowY: "auto" }}>
        <div className="form-grid">
          <div className="form-field"><label>Season</label><input className="text-control" type="number" min={1} max={99} required value={form.seasonNumber} onChange={event => set("seasonNumber", event.target.value)} /></div>
          <div className="form-field"><label>Episode</label><input className="text-control" type="number" min={1} max={999} required value={form.episodeNumber} onChange={event => set("episodeNumber", event.target.value)} /></div>
          <div className="form-field full"><label>Episode title</label><input className="text-control" required maxLength={240} value={form.title} onChange={event => set("title", event.target.value)} placeholder="Episode title" /></div>
          <div className="form-field"><label>Runtime (minutes)</label><input className="text-control" type="number" min={1} max={1000} value={form.durationMinutes} onChange={event => set("durationMinutes", event.target.value)} /></div>
          <div className="form-field"><label>Publication status</label><select className="select-control" value={form.status} onChange={event => set("status", event.target.value as "draft" | "published")}><option value="draft">Draft</option><option value="published">Published</option></select></div>
          <div className="form-field full"><label>Synopsis</label><textarea className="textarea-control" value={form.synopsis} onChange={event => set("synopsis", event.target.value)} placeholder="Optional episode summary" /></div>
          <div className="form-field full"><div className="checkbox-line"><input id="episode-rights-confirmed" type="checkbox" checked={form.rightsConfirmed} onChange={event => set("rightsConfirmed", event.target.checked)} /><label htmlFor="episode-rights-confirmed"><strong>I confirm AgaStream has the right to distribute the full episode sources.</strong><span>Episode playback and download actions stay hidden without this confirmation.</span></label></div></div>
          <div className="form-field full"><label>Authorized episode source</label><input className="text-control" type="text" value={form.playbackUrl} onChange={event => set("playbackUrl", event.target.value)} placeholder="https://…/episode.mp4 or /manus-storage/…" /><span className="form-hint">Use a secure HTTPS URL or upload a rights-cleared MP4/M4V/WebM/OGG/MOV up to 2 GiB.</span><MediaUpload purpose="playback" label="episode video" rightsConfirmed={form.rightsConfirmed} onUploaded={url => set("playbackUrl", url)} /></div>
          <div className="form-field full"><label>Direct download link</label><input className="text-control" type="text" value={form.downloadUrl} onChange={event => set("downloadUrl", event.target.value)} placeholder="https://…/episode.mp4" /><MediaUpload purpose="download" label="episode download" rightsConfirmed={form.rightsConfirmed} onUploaded={url => set("downloadUrl", url)} /></div>
        </div>
        <div className="admin-form-actions"><button className="button-secondary" type="button" onClick={onCancel}>Cancel</button><button className="button-primary" type="submit" disabled={saving}><Save size={14} />{saving ? "Saving…" : episode ? "Save episode" : "Create episode"}</button></div>
      </div>
    </form>
  </div>;
}
