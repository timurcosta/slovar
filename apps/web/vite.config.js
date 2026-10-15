import { defineConfig } from "vite";

export default defineConfig({
  base: "./",   // относительные пути: сайт работает и на github.io/slovar/, и в корне своего домена
  build: { outDir: "dist", emptyOutDir: true },
});
