import { defineConfig } from "vite";

// base relativa: funciona no GitHub Pages (subpasta) e abrindo o dist localmente.
export default defineConfig({ base: "./", build: { target: "es2022", chunkSizeWarningLimit: 900 } });
