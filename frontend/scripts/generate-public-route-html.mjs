/**
 * Post-build: emit dist/<route>/index.html with route-specific title, meta, and
 * crawler-visible copy so Google does not see the same empty SPA shell on every URL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PUBLIC_INDEXABLE_PAGES,
  SITE_ORIGIN,
  absolutePublicUrl,
  buildSeoPageSnapshotHtml,
} from '../src/constants/publicSiteNavSeo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const templatePath = path.join(distDir, 'index.html');

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function setMeta(html, attr, key, content) {
  const re = new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*/>`, 'i');
  const tag = `<meta ${attr}="${key}" content="${escapeHtmlAttr(content)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

function setTitle(html, title) {
  return html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtmlAttr(title)}</title>`);
}

function setCanonical(html, url) {
  const re = /<link rel="canonical" href="[^"]*"\s*\/?>/i;
  const tag = `<link rel="canonical" href="${escapeHtmlAttr(url)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

function injectSnapshot(html, page) {
  const snapshot = buildSeoPageSnapshotHtml(page);
  if (html.includes('id="seo-page-snapshot"')) {
    return html.replace(/<article id="seo-page-snapshot"[\s\S]*?<\/article>/, snapshot.trim());
  }
  if (html.includes('<!-- SEO_SITE_NAV_BLOCK -->')) {
    return html.replace('<!-- SEO_SITE_NAV_BLOCK -->', `${snapshot}\n    <!-- SEO_SITE_NAV_BLOCK -->`);
  }
  return html.replace('<div id="root">', `${snapshot}\n    <div id="root">`);
}

function tailorHtml(baseHtml, page) {
  const canonical = absolutePublicUrl(page.path);
  let html = baseHtml;
  html = setTitle(html, page.title);
  html = setCanonical(html, canonical);
  html = setMeta(html, 'name', 'description', page.description);
  html = setMeta(html, 'name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  html = setMeta(html, 'property', 'og:title', page.title);
  html = setMeta(html, 'property', 'og:description', page.description);
  html = setMeta(html, 'property', 'og:url', canonical);
  html = setMeta(html, 'property', 'og:image:alt', page.ogImageAlt);
  html = setMeta(html, 'name', 'twitter:title', page.title);
  html = setMeta(html, 'name', 'twitter:description', page.description);
  html = setMeta(html, 'name', 'twitter:url', canonical);
  html = setMeta(html, 'name', 'twitter:image:alt', page.ogImageAlt);
  html = injectSnapshot(html, page);
  return html;
}

function distFileForPath(routePath) {
  if (routePath === '/') return path.join(distDir, 'index.html');
  const segments = routePath.replace(/^\//, '').split('/');
  return path.join(distDir, ...segments, 'index.html');
}

if (!fs.existsSync(templatePath)) {
  console.warn('[generate-public-route-html] dist/index.html not found, skipping');
  process.exit(0);
}

const template = fs.readFileSync(templatePath, 'utf8');
let written = 0;

for (const page of PUBLIC_INDEXABLE_PAGES) {
  const html = tailorHtml(template, page);
  const outFile = distFileForPath(page.path);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html, 'utf8');
  written += 1;
}

console.log(`[generate-public-route-html] Wrote ${written} route HTML files under dist/ (${SITE_ORIGIN})`);
