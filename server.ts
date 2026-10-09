import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import generateImageHandler from "./api/generate-image";
import aiScriptToScenesHandler from "./api/ai-script-to-scenes";
import enhancePromptHandler from "./api/enhance-prompt";
import statusHandler from "./api/status";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Mount the exact same API handlers as Vercel serverless functions
app.all("/api/generate-image", (req, res) => generateImageHandler(req, res));
app.all("/api/ai-script-to-scenes", (req, res) => aiScriptToScenesHandler(req, res));
app.all("/api/enhance-prompt", (req, res) => enhancePromptHandler(req, res));
app.all("/api/status", (req, res) => statusHandler(req, res));

// Express + Vite Integration (for dev and standalone production server)
const isDev = process.env.NODE_ENV !== "production";
const PORT = Number(process.env.PORT) || 3000;

if (isDev) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: false,
    },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Multi-Scene Batch Image Studio server listening on port ${PORT}`);
});

export default app;
