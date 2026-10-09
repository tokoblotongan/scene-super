import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import app from "./src/server/app";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
