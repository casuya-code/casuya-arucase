/**
 * Post-build: sanity-check the homepage chunk.
 *
 * This used to inject <link rel="modulepreload" crossorigin href="/js/HomePage-*.js">
 * so the homepage chunk downloaded in parallel with the entry bundle. On
 * production the service worker (frontend/public/sw.js) intercepts /js/ asset
 * fetches with cacheFirst, so browsers log "cross-world service worker
 * resource mismatch" and "preloaded but not used" for the preload — the
 * response was never reused and the chunk was fetched twice. The manual
 * modulepreload is therefore removed; the chunk still loads normally when
 * the homepage route imports it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const indexPath = path.join(distDir, 'index.html');
const jsDir = path.join(distDir, 'js');

if (!fs.existsSync(indexPath) || !fs.existsSync(jsDir)) {
  console.warn('[inject-home-preload] dist output not found, skipping');
  process.exit(0);
}

const homeChunk = fs.readdirSync(jsDir).find((f) => /^HomePage-/.test(f) && f.endsWith('.js'));
if (!homeChunk) {
  console.warn('[inject-home-preload] HomePage chunk not found, skipping');
  process.exit(0);
}

const html = fs.readFileSync(indexPath, 'utf8');
if (/rel="modulepreload"[^>]*href="\/js\/HomePage-[^"]+\.js"/i.test(html)) {
  fs.writeFileSync(
    indexPath,
    html.replace(/\s*<link\s+rel="modulepreload"[^>]*href="\/js\/HomePage-[^"]+\.js"[^>]*>/gi, ''),
    'utf8'
  );
  console.log(`[inject-home-preload] Removed stale modulepreload for ${homeChunk}`);
} else {
  console.log(`[inject-home-preload] HomePage chunk loads normally (no modulepreload)`);
}