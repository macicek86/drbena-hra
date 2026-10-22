#!/bin/sh
set -eu
npx --yes wrangler@4 kv namespace create hra-plays >/tmp/kv-create.txt 2>&1 || true
npx --yes wrangler@4 kv namespace list > /tmp/kv.json
ID=$(node --input-type=module -e '
import { readFileSync } from "node:fs";
const raw = JSON.parse(readFileSync("/tmp/kv.json", "utf8"));
const list = Array.isArray(raw) ? raw : raw.result || [];
const hit = list.find((item) => item.title === "hra-plays");
if (!hit?.id) {
  console.error(readFileSync("/tmp/kv-create.txt", "utf8"));
  process.exit(1);
}
process.stdout.write(hit.id);
')
mkdir -p cloudflare
cat > cloudflare/wrangler.json <<EOF
{
  "name": "hra-pocitadlo",
  "main": "plays.js",
  "compatibility_date": "2026-10-22",
  "workers_dev": true,
  "kv_namespaces": [{ "binding": "PLAYS", "id": "$ID" }]
}
EOF
npx --yes wrangler@4 deploy --config cloudflare/wrangler.json > /tmp/counter-deploy.txt
cat /tmp/counter-deploy.txt
URL=$(node --input-type=module -e '
import { readFileSync } from "node:fs";
const text = readFileSync("/tmp/counter-deploy.txt", "utf8");
const match = text.match(/https:\/\/[a-z0-9-]+\.[a-z0-9.-]+\.workers\.dev\/?/);
if (!match) process.exit(1);
process.stdout.write(match[0].replace(/\/$/, ""));
')
echo "url=$URL" >> "$GITHUB_OUTPUT"
