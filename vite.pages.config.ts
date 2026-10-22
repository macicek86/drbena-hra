import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Static game build.
 * Cloudflare Pages sets CF_PAGES=1 and the site is the domain root
 * (hra.…), so asset URLs must be `/game/...`.
 * GitHub Pages is a project site and needs `/drbena-hra/`.
 */
const onCloudflare = process.env.CF_PAGES === "1";
const base = process.env.PAGES_BASE || (onCloudflare ? "/" : "/drbena-hra/");

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
