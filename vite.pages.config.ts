import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Static build for GitHub Pages: https://macicek86.github.io/drbena-hra/ */
const base = process.env.PAGES_BASE || "/drbena-hra/";

export default defineConfig({
  base,
  plugins: [tailwindcss(), react()],
  resolve: { tsconfigPaths: true },
  build: {
    outDir: "pages-dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "index.pages.html",
    },
  },
});
