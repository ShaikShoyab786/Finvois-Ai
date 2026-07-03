import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// In production (e.g. on Render) this server also serves the built frontend
// as a single web service. On Replit in development, the frontend runs on its
// own Vite dev server behind the shared proxy, so this block is skipped.
if (process.env.NODE_ENV === "production") {
  const serverDir = path.dirname(fileURLToPath(import.meta.url));
  const publicDir = process.env.PUBLIC_DIR
    ? path.resolve(process.env.PUBLIC_DIR)
    : path.resolve(serverDir, "../../finvois/dist/public");

  if (fs.existsSync(path.join(publicDir, "index.html"))) {
    app.use(express.static(publicDir));
    // SPA fallback: any non-API GET serves index.html so client routing works.
    // Paths that look like files (contain a dot) are excluded so missing
    // static assets return a proper 404 instead of HTML.
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) return next();
      if (path.basename(req.path).includes(".")) return next();
      res.sendFile(path.join(publicDir, "index.html"));
    });
    logger.info({ publicDir }, "Serving static frontend");
  } else {
    logger.warn({ publicDir }, "Static frontend build not found; API-only mode");
  }
}

export default app;
