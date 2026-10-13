import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Readable } from "node:stream";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { PASSWORD_ADMIN_OPEN_ID } from "./adminIdentity";
import { MediaUploadError, requestManagedUploadTarget, validateMediaUpload } from "./mediaUpload";
import { sdk } from "./sdk";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  // This raw route must precede JSON/urlencoded parsers so even large videos stream without buffering.
  app.post("/api/admin/media-upload", async (req, res) => {
    res.set("Cache-Control", "no-store");
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Sign in as the AgaStream Admin before uploading files." });
      return;
    }
    if (user.isCron || user.openId !== PASSWORD_ADMIN_OPEN_ID || user.role !== "admin" || user.loginMethod !== "password") {
      res.status(403).json({ error: "Only the AgaStream Admin can upload files." });
      return;
    }

    const rawLength = req.headers["content-length"];
    const size = typeof rawLength === "string" && /^\d+$/.test(rawLength) ? Number(rawLength) : NaN;
    let spec;
    let target;
    try {
      spec = validateMediaUpload({
        purpose: req.header("x-agastream-purpose"),
        contentType: req.header("content-type"),
        size,
        rightsConfirmed: req.header("x-agastream-rights-confirmed") === "true",
      });
      target = await requestManagedUploadTarget(spec);
    } catch (error) {
      if (error instanceof MediaUploadError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      res.status(502).json({ error: "Managed storage could not prepare the upload. Please try again." });
      return;
    }

    try {
      const upstream = await fetch(target.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": spec.contentType, "Content-Length": String(spec.size) },
        body: Readable.toWeb(req),
        duplex: "half",
        signal: AbortSignal.timeout(2 * 60 * 60 * 1000),
      } as RequestInit & { duplex: "half" });
      if (!upstream.ok) {
        await upstream.body?.cancel().catch(() => undefined);
        res.status(502).json({ error: `Managed storage rejected the upload (HTTP ${upstream.status}). Please try again.` });
        return;
      }
      res.status(201).json({ assetUrl: target.assetUrl });
    } catch {
      if (!res.headersSent) res.status(502).json({ error: "The file could not be transferred to managed storage. Check your connection and try again." });
    }
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
