/**
 * Indexable public URLs for search engines (sitemap, static HTML nav, JSON-LD).
 * English `name` helps sitelink labels; Swahili `nameSw` matches the live site UI.
 */
export const SITE_ORIGIN = 'https://www.arushacatholicseminary.co.tz';

/** Paths allowed in sitemap / static nav (excludes staff /login, /admin, student dashboard). */
export const PUBLIC_INDEXABLE_NAV_LINKS = [
  { path: '/', name: 'Home', nameSw: 'Nyumbani' },
  { path: '/about', name: 'About Us', nameSw: 'Kuhusu Sisi' },
  { path: '/staff', name: 'Staff', nameSw: 'Watumishi' },
  { path: '/necta-results', name: 'NECTA Results', nameSw: 'Matokeo ya NECTA' },
  { path: '/admissions', name: 'Admissions', nameSw: 'Udahili' },
  { path: '/admissions/apply', name: 'Apply Online', nameSw: 'Maombi ya Udahili' },
  { path: '/student-life', name: 'Student Life', nameSw: 'Maisha ya Wanafunzi' },
  { path: '/student-report', name: 'Student Reports', nameSw: 'Ripoti za Mwanafunzi' },
  { path: '/school-fee', name: 'School Fees', nameSw: 'Ada ya Shule' },
  { path: '/gallery', name: 'Gallery', nameSw: 'Picha' },
  { path: '/announcements', name: 'Announcements', nameSw: 'Matangazo' },
  { path: '/contact', name: 'Contact', nameSw: 'Mawasiliano' },
  { path: '/student-login', name: 'Student Login', nameSw: 'Ingia — Ripoti za Mwanafunzi' },
  { path: '/privacy-policy', name: 'Privacy Policy', nameSw: 'Sera ya Faragha' },
];

export function absolutePublicUrl(path) {
  return path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Crawler-visible nav in index.html (SPA shell before React hydrates). */
export function buildSeoSiteNavHtml() {
  const items = PUBLIC_INDEXABLE_NAV_LINKS.map(
    (link) =>
      `      <li><a href="${escapeHtml(absolutePublicUrl(link.path))}">${escapeHtml(link.name)}</a></li>`
  ).join('\n');

  return `    <nav id="seo-site-nav" class="seo-crawler-nav" aria-label="Main site pages">
      <p class="seo-crawler-nav__title">Arusha Catholic Seminary — site pages</p>
      <ul>
${items}
      </ul>
    </nav>`;
}

/** ItemList + SiteNavigationElement for rich results / sitelink hints. */
export function buildSeoSiteNavJsonLd() {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Arusha Catholic Seminary main navigation',
    itemListElement: PUBLIC_INDEXABLE_NAV_LINKS.map((link, index) => ({
      '@type': 'SiteNavigationElement',
      position: index + 1,
      name: link.name,
      url: absolutePublicUrl(link.path),
    })),
  };
  return `    <script type="application/ld+json">\n${JSON.stringify(payload, null, 2)}\n    </script>`;
}
