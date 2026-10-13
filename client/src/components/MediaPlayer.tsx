import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { resolveMediaSource } from "@/lib/mediaSource";

type MediaPlayerProps = {
  url: string;
  title: string;
  label: string;
  onClose: () => void;
};

export default function MediaPlayer({ url, title, label, onClose }: MediaPlayerProps) {
  const source = resolveMediaSource(url, window.location.origin);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => setVideoError(false), [url]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="player-dialog" role="dialog" aria-modal="true" aria-label={`${label}: ${title}`}>
        <div className="dialog-head">
          <h2>{label} · {title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close player"><X size={17} /></button>
        </div>
        <div className="player-frame">
          {source.kind === "embed" ? (
            <iframe
              src={source.url}
              title={`${label}: ${title}`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox={source.sandboxed ? "allow-scripts allow-forms allow-presentation" : undefined}
            />
          ) : source.kind === "video" ? (
            <>
              <video src={source.url} controls autoPlay playsInline preload="metadata" aria-label={`${label}: ${title}`} onError={() => setVideoError(true)} />
              {videoError && <div className="player-error" role="status"><strong>This source could not be played in this browser.</strong><span>Try a direct MP4/WebM file or an embeddable video-page link.</span><a href={source.url} target="_blank" rel="noreferrer">Open source video</a></div>}
            </>
          ) : (
            <div className="empty-state">
              <h3>That source can’t be played here</h3>
              <p>Use a secure HTTPS video page, an official YouTube/Vimeo/Dailymotion link, or a direct video file.</p>
            </div>
          )}
        </div>
        {source.kind === "embed" && <a className="player-source-link" href={source.externalUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /> If the provider blocks embedding, open the source in a new tab</a>}
        <p className="player-note">Playback is provided by the configured source. AgaStream does not copy or host third-party film files.</p>
      </section>
    </div>
  );
}
