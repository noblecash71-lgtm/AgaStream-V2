import type { Express } from "express";
import { ENV } from "./env";
import { isTrustedManagedStorageUrl } from "./storageSecurity";

const ASSET_KEY = /^agastream\/(?:logo|favicon|poster|backdrop|interpreter|trailer|playback|download)\/[0-9a-f-]{36}\.(?:png|jpg|jpeg|webp|avif|gif|mp4|m4v|webm|ogv|mov)$/i;

/** Optional for standalone hosts only; Webdev Cloud intercepts its reserved /manus-storage path before this app. */
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ASSET_KEY.test(key)) {
      res.status(404).send("Asset not found");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        console.error(`[StorageProxy] forge error: ${forgeResp.status}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const result = await forgeResp.json().catch(() => null) as { url?: unknown } | null;
      if (typeof result?.url !== "string" || !isTrustedManagedStorageUrl(result.url)) {
        console.error("[StorageProxy] backend returned an invalid signed URL");
        res.status(502).send("Invalid signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, result.url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
