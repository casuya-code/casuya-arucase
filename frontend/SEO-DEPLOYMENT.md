# SEO – Make the site easy to find in search engines

When you deploy, use this checklist so **Google, Bing, and other search engines** can discover and index the site.

---

## Already set up in this project

| Item | Location | Purpose |
|------|----------|---------|
| **Title & description** | `index.html` | Homepage meta for search results |
| **Keywords** | `index.html` | `meta name="keywords"` |
| **Canonical URL** | `index.html` + `PageSEO.jsx` | Tells engines the main URL (avoids duplicate content) |
| **Robots** | `index.html` + `public/robots.txt` | `index, follow` + sitemap link; admin/login disallowed |
| **Sitemap** | `public/sitemap.xml` | Lists all public pages for crawlers |
| **Open Graph** | `index.html` + `PageSEO.jsx` | Good titles/descriptions when shared on Facebook, LinkedIn |
| **Twitter Card** | `index.html` + `PageSEO.jsx` | Good preview when shared on Twitter/X |
| **JSON-LD** | `index.html` | Structured data (EducationalOrganization) for rich results |
| **Per-page SEO** | `PageSEO.jsx` | Title, description, canonical, og, twitter per route |

---

## Before / after deployment – check these

### 1. Base URL

- In **`index.html`**: all URLs use `https://www.arushacatholicseminary.co.tz` (or your real domain).
- In **`frontend/public/robots.txt`**: `Sitemap:` line uses the same domain.
- In **`frontend/public/sitemap.xml`**: every `<loc>` uses the same domain.
- In **`frontend/src/components/common/PageSEO.jsx`**: `BASE_URL` is the same domain.

If you use a **different domain** (e.g. `arushacatholicseminary.online`), replace that URL in all four places.

### 2. Sitemap is reachable

After deploy, open in a browser:

- `https://www.arushacatholicseminary.co.tz/sitemap.xml`  
  You should see the XML with all public URLs.

If the app is a **single-page app (SPA)** and the server serves `index.html` for every path, ensure:

- `sitemap.xml` and `robots.txt` are served as **static files** (from `public/` in build), not as the app’s `index.html`.

### 3. Robots.txt is reachable

Open:

- `https://www.arushacatholicseminary.co.tz/robots.txt`  
  You should see:

  - `User-agent: *`
  - `Allow: /`
  - `Sitemap: https://www.arushacatholicseminary.co.tz/sitemap.xml`
  - `Disallow: /admin`, `/login`, etc.

### 4. Submit to search engines (optional but recommended)

- **Google**: [Google Search Console](https://search.google.com/search-console) – add the property, submit sitemap URL.
- **Bing**: [Bing Webmaster Tools](https://www.bing.com/webmasters) – add site, submit sitemap.

### 5. Update sitemap when you add pages

When you add new **public** routes:

1. Add the route in the app (e.g. `App.jsx`).
2. Add an entry in `public/sitemap.xml` with `<loc>`, `<lastmod>`, `<changefreq>`, `<priority>`.
3. Optionally add the path and SEO text in `PageSEO.jsx` (title/description).

---

## Quick test after deploy

1. Open the homepage and View Page Source (Ctrl+U / Cmd+U).  
   Check: `<title>`, `<meta name="description">`, `<link rel="canonical">`, `og:title`, `og:url`.
2. Open `/about` (or any public page) and View Page Source.  
   After the SPA loads, the same meta tags should reflect that page (PageSEO updates them in the DOM).
3. Open `/sitemap.xml` and `/robots.txt` in the browser – both should return the correct content, not the app HTML.

If all of the above are correct, the site is set up to be **easily found by search engines** when deployed.
