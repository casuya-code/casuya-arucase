# Search Console & SEO Compliance (2025–2026)

This document confirms that the site’s sitemap, robots.txt, and meta setup meet current requirements for **Google Search Console**, **Microsoft Bing Webmaster Tools**, and other search engines that follow the standard Sitemaps protocol.

## Compliance summary

| Requirement | Status | Notes |
|-------------|--------|--------|
| **Sitemap (sitemaps.org 0.9)** | ✓ | XML, UTF-8, `<urlset>`, `<url>`, `<loc>`; optional `<lastmod>` (ISO 8601), `<changefreq>`, `<priority>` |
| **Sitemap size** | ✓ | &lt; 50,000 URLs, &lt; 50 MB (this sitemap is tiny) |
| **lastmod format** | ✓ | ISO 8601 with time (e.g. `2025-02-10T00:00:00+00:00`) for Bing 2025+ preference |
| **robots.txt** | ✓ | Root; `User-agent: *`, `Allow: /`, `Sitemap: <full URL>`, optional `Disallow` for admin/login |
| **Google Search Console** | ✓ | Submit property, then add sitemap URL in Sitemaps section |
| **Bing Webmaster Tools** | ✓ | Add site, verify, submit sitemap (or rely on robots.txt) |
| **Meta & indexing** | ✓ | `meta name="robots" content="index, follow"`, unique titles/descriptions per page |

## Submitting to search engines

### Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console).
2. Add property: `https://www.arushacatholicseminary.co.tz` (or your live domain).
3. Verify ownership (HTML file, DNS, or meta tag).
4. **Sitemaps**: Open “Sitemaps”, add: `https://www.arushacatholicseminary.co.tz/sitemap.xml`, submit.
5. “URL inspection” can be used to request indexing for important pages.

### Microsoft Bing Webmaster Tools
1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters).
2. Add your site and verify (same options as Google).
3. **Sitemaps**: In the dashboard, submit sitemap URL: `https://www.arushacatholicseminary.co.tz/sitemap.xml`.  
   Bing also discovers the sitemap via the `Sitemap:` line in `robots.txt`.

### Other engines
- **Yandex**: [Webmaster](https://webmaster.yandex.com/) — add site, verify, submit sitemap.
- **Others**: Most accept the same XML sitemap and robots.txt; submit the sitemap URL in each engine’s “Sitemaps” or “Indexing” section.

## Files involved

- **`/robots.txt`** — at site root (from `frontend/public/robots.txt` in build).
- **`/sitemap.xml`** — at site root (from `frontend/public/sitemap.xml` in build).
- **`index.html`** — meta description, Open Graph, Twitter Card, canonical, JSON-LD.
- **Per-page SEO** — `PageSEO.jsx` updates document title and meta description by route.

## Keeping sitemap valid

- When you add or remove public pages, update `sitemap.xml` with the new `<url>` entries.
- Set `<lastmod>` to the real last modification date (W3C Datetime / ISO 8601); update it when the page content meaningfully changes.
- Ensure all `<loc>` URLs use the same scheme (https) and host as the live site.

As of 2025–2026 there are no additional formal “qualification” steps beyond having a valid sitemap, a correct robots.txt, and verified ownership in each search console. This setup meets those requirements.
