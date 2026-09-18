/**
 * Post-build: sanity-check the main index stylesheet link.
 *
 * Vite emits <link rel="stylesheet" crossorigin href="/assets/index-*.css">,
 * which loads normally. The earlier scheme converted that link into a
 * `rel="preload" as="style"` and swapped it to a stylesheet after `load`.
 * That produced "preloaded but not used" / "cross-world service worker
 * resource mismatch" console warnings on production (the service worker in
 * frontend/public/sw.js intercepts the same-origin asset fetch, so the
 * preloaded response was never reused). Loading the stylesheet as-is removes
 * the warnings and the duplicated CSS download.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, '../dist/index.html');

if (!fs.existsSync(indexPath)) {
  console.warn('[defer-index-css] dist/index.html not found, skipping');
  process.exit(0);
}

const html = fs.readFileSync(indexPath, 'utf8');

const INDEX_CSS_RE =
  /<link\s+rel="stylesheet"[^>]*href="(\/assets\/index-[^"]+\.css)"/i;

if (!INDEX_CSS_RE.test(html)) {
  console.warn('[defer-index-css] index stylesheet link not found, skipping');
  process.exit(0);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('[defer-index-css] Main stylesheet loads as-is (no preload)');