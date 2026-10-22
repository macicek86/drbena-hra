import { copyFileSync, writeFileSync } from "node:fs";

const dir = "pages-dist";
copyFileSync(`${dir}/index.pages.html`, `${dir}/index.html`);
copyFileSync(`${dir}/index.html`, `${dir}/404.html`);
writeFileSync(`${dir}/.nojekyll`, "");
// Cloudflare Pages: unknown paths still open the game. Real files win.
writeFileSync(`${dir}/_redirects`, "/* /index.html 200\n");
