import { useState } from "react";
import { Info, Pencil, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PublicTitle } from "@/lib/catalogTypes";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSiteAdminAccess } from "@/components/SiteLayout";
import MediaPlayer from "@/components/MediaPlayer";

export default function TitleCard({ title, isAdmin, onAdminEdit, onAdminDelete }: { title: PublicTitle; isAdmin?: boolean; onAdminEdit?: () => void; onAdminDelete?: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [player, setPlayer] = useState<{ url: string; label: string } | null>(null);
  const [, setLocation] = useLocation();
  const contextAdmin = useSiteAdminAccess();
  const canManage = isAdmin ?? contextAdmin;
  const year = title.releaseYear ? String(title.releaseYear) : "New";
  const kindLabel = title.kind === "series" ? "Series" : "Movie";
  const detailHref = title.status === "draft" && canManage ? `/admin?edit=${title.id}` : `/title/${encodeURIComponent(title.slug)}`;
  const primaryLabel = title.status === "draft" && canManage ? "Edit draft" : title.rightsConfirmed && title.playbackUrl ? "Play" : title.trailerUrl ? "Watch trailer" : "View title";
  function playFromCard() {
    if (title.status === "draft" && canManage) {
      if (onAdminEdit) onAdminEdit(); else setLocation(detailHref);
    } else if (title.rightsConfirmed && title.playbackUrl) setPlayer({ url: title.playbackUrl, label: "Now playing" });
    else if (title.trailerUrl) setPlayer({ url: title.trailerUrl, label: "Trailer" });
    else setLocation(detailHref);
  }
  return (
    <article className="title-card">
      <div className="poster-frame">
        <Link className="poster-link" href={detailHref} aria-label={`View ${title.title}`}>
          {title.posterUrl && !imageFailed ? <img src={title.posterUrl} alt={`${title.title} poster`} loading="lazy" onError={() => setImageFailed(true)} /> : <div className="poster-placeholder" aria-hidden="true"><span>{title.title.slice(0, 1).toUpperCase()}</span></div>}
          {title.featured && <span className="poster-badge">Featured</span>}
          {title.status === "draft" && canManage && <span className="poster-draft-badge">Draft</span>}
          <span className="poster-kind">{kindLabel}</span>
        </Link>
        <div className="poster-actions" aria-label={`${title.title} actions`}>
          <button className="poster-action poster-action-play" type="button" onClick={playFromCard}><Play size={13} fill="currentColor" />{primaryLabel}</button>
          <Link className="poster-action" href={detailHref}><Info size={13} />More info</Link>
          {canManage && <div className="poster-admin-actions">
            {onAdminEdit ? <button className="poster-action admin-action" type="button" onClick={onAdminEdit}><Pencil size={12} />Edit</button> : <Link className="poster-action admin-action" href={`/admin?edit=${title.id}`}><Pencil size={12} />Edit</Link>}
            {onAdminDelete ? <button className="poster-action admin-action danger-action" type="button" onClick={onAdminDelete}><Trash2 size={12} />Remove</button> : <PublicCardRemove title={title} />}
          </div>}
        </div>
      </div>
      <h3 className="card-title"><Link href={detailHref}>{title.title}</Link></h3>
      <p className="card-meta">{year}{title.categories?.[0] ? ` · ${title.categories[0]}` : ""}{title.interpreters?.[0] ? ` · ${title.interpreters[0]}` : ""}</p>
      {player && <MediaPlayer url={player.url} title={title.title} label={player.label} onClose={() => setPlayer(null)} />}
    </article>
  );
}

function PublicCardRemove({ title }: { title: PublicTitle }) {
  const utils = trpc.useUtils();
  const remove = trpc.catalog.deleteTitle.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.catalog.publicList.invalidate(),
        utils.catalog.publicBySlug.invalidate({ slug: title.slug }),
        utils.catalog.publicCategories.invalidate(),
        utils.catalog.publicInterpreters.invalidate(),
        utils.site.publicHomepageSections.invalidate(),
      ]);
      toast.success("Title removed from AgaStream");
    },
    onError: error => toast.error(error.message),
  });
  return <button className="poster-action admin-action danger-action" type="button" disabled={remove.isPending} onClick={() => {
    if (window.confirm(`Remove “${title.title}” and all of its episodes from AgaStream? This cannot be undone.`)) remove.mutate({ id: title.id });
  }}><Trash2 size={12} />{remove.isPending ? "Removing…" : "Remove"}</button>;
}
