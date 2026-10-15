import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./", // относительные пути: сайт работает и на github.io/slovar/, и в корне своего домена
  build: {
    outDir: process.env.OUT_DIR || "dist",
    emptyOutDir: true,
    rollupOptions: { input: { main: "index.html", tutor: "tutor.html" } },
  },
  // в разработке API живёт отдельно (npm run dev поднимает оба)
  server: { proxy: { "/api": "http://localhost:8787" } },
  test: { environment: "happy-dom" },
});
