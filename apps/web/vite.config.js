import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./", // относительные пути: страница переезда работает на github.io/slovar/, игра — в корне шлюза
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // moved.html — страница переезда для старого адреса на GitHub Pages
    rollupOptions: { input: { main: "index.html", tutor: "tutor.html", moved: "moved.html" } },
  },
  // в разработке API живёт отдельно (npm run dev поднимает оба)
  server: { proxy: { "/api": "http://localhost:8787" } },
  test: { environment: "happy-dom" },
});
