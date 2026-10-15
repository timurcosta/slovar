import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./", // относительные пути: сайт работает и на github.io/slovar/, и в корне своего домена
  build: { outDir: "dist", emptyOutDir: true },
  test: { environment: "happy-dom" },
});
