import { useRef, useState } from "react";
import { CloudUpload } from "lucide-react";
import { toast } from "sonner";

export type MediaUploadPurpose = "logo" | "favicon" | "poster" | "backdrop" | "interpreter" | "trailer" | "playback" | "download";

type Props = {
  purpose: MediaUploadPurpose;
  label: string;
  onUploaded: (stableUrl: string) => void;
  rightsConfirmed?: boolean;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", avif: "image/avif", gif: "image/gif",
  mp4: "video/mp4", m4v: "video/x-m4v", webm: "video/webm", ogv: "video/ogg", ogg: "video/ogg", mov: "video/quicktime",
};
const IMAGE_PURPOSES = new Set<MediaUploadPurpose>(["logo", "favicon", "poster", "backdrop", "interpreter"]);

type UploadResponse = { assetUrl?: string; error?: string };

function contentTypeFor(file: File) {
  const browserType = file.type.trim().toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (browserType && browserType !== "application/octet-stream" && MIME_BY_EXTENSION[extension] !== browserType) return browserType;
  return browserType === "application/octet-stream" || !browserType ? MIME_BY_EXTENSION[extension] ?? "" : browserType;
}

function uploadFile(
  purpose: MediaUploadPurpose,
  file: File,
  contentType: string,
  rightsConfirmed: boolean,
  onProgress: (percent: number) => void,
) {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/media-upload");
    request.withCredentials = true;
    request.setRequestHeader("Content-Type", contentType);
    request.setRequestHeader("X-AgaStream-Purpose", purpose);
    request.setRequestHeader("X-AgaStream-Rights-Confirmed", rightsConfirmed ? "true" : "false");
    request.timeout = 2 * 60 * 60 * 1000;
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    request.onload = () => {
      let result = request.response as UploadResponse | null;
      if (!result || typeof result !== "object") {
        try { result = JSON.parse(request.responseText) as UploadResponse; } catch { result = null; }
      }
      if (request.status >= 200 && request.status < 300 && typeof result?.assetUrl === "string") {
        resolve(result.assetUrl);
      } else {
        reject(new Error(result?.error || `Upload failed (HTTP ${request.status}). Please try again.`));
      }
    };
    request.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    request.ontimeout = () => reject(new Error("Upload timed out. Try again on a stable connection."));
    request.onabort = () => reject(new Error("Upload was canceled."));
    request.send(file);
  });
}

export default function MediaUpload({ purpose, label, onUploaded, rightsConfirmed = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const imageOnly = IMAGE_PURPOSES.has(purpose);
  const requiresRights = purpose === "playback" || purpose === "download";

  async function selectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const contentType = contentTypeFor(file);
    const image = contentType.startsWith("image/");
    const maxBytes = image ? 20 * 1024 * 1024 : 2 * 1024 * 1024 * 1024;
    if (!contentType || imageOnly !== image) {
      toast.error(imageOnly ? "Choose a PNG, JPEG, WebP, AVIF, or GIF image." : "Choose an MP4, WebM, OGG, M4V, or MOV video.");
      return;
    }
    if (file.size <= 0 || file.size > maxBytes) {
      toast.error(image ? "Images must be 20 MiB or smaller." : "Video uploads must be 2 GiB or smaller.");
      return;
    }
    if (requiresRights && !rightsConfirmed) {
      toast.error("Confirm distribution rights before uploading a full-length source.");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const stableUrl = await uploadFile(purpose, file, contentType, rightsConfirmed, setProgress);
      onUploaded(stableUrl);
      toast.success(`${label} uploaded. Save the form to publish this asset address.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed. Use a secure HTTPS URL instead.");
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  return <div className="media-upload-control">
    <input
      ref={inputRef}
      className="visually-hidden"
      type="file"
      accept={imageOnly ? "image/png,image/jpeg,image/webp,image/avif,image/gif" : "video/mp4,video/webm,video/ogg,video/x-m4v,video/quicktime"}
      disabled={uploading}
      onChange={selectFile}
      aria-label={`Choose ${label.toLowerCase()} file to upload`}
    />
    <button className="button-secondary media-upload-button" type="button" disabled={uploading || (requiresRights && !rightsConfirmed)} onClick={() => inputRef.current?.click()}>
      <CloudUpload size={14} />{uploading ? `Uploading ${progress ?? 0}%` : `Upload ${label.toLowerCase()}`}
    </button>
    <span className="form-hint" aria-live="polite">{uploading ? "Keep this page open while AgaStream securely transfers the file." : requiresRights && !rightsConfirmed ? "Confirm distribution rights before uploading a full-length source." : imageOnly ? "Images up to 20 MiB. Files remain in storage if you close before saving or later remove this record." : "Videos up to 2 GiB. Files remain in storage if you close before saving or later remove this record."}</span>
  </div>;
}
