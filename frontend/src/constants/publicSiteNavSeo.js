/**
 * Indexable public URLs: nav, sitemap, static HTML per route, and PageSEO metadata.
 */
export const SITE_NAME = 'Arusha Catholic Seminary';
export const SITE_ORIGIN = 'https://www.arushacatholicseminary.co.tz';

export const PUBLIC_INDEXABLE_PAGES = [
  {
    path: '/',
    name: 'Home',
    nameSw: 'Nyumbani',
    title: `${SITE_NAME} (ARUCASE) | St. Thomas Aquinas Seminary Arusha - Best Seminary & O-Level School in Oldonyosambu`,
    description:
      'Arusha Catholic Seminary (ARUCASE, S0171) - St. Thomas Aquinas Seminary Arusha, Seminari ya Jimbo, Jimbo Kuu la Arusha. Located in Oldonyosambu, Arusha, Tanzania. One of the best seminary schools and best O-Level schools in Tanzania. Catholic secondary school offering O-Level and A-Level education, Form I–VI, admissions, staff, NECTA results, fees, and contact.',
    ogImageAlt: 'Arusha Catholic Seminary — St. Thomas Aquinas Seminary, Oldonyosambu',
  },
  {
    path: '/about',
    name: 'About Us',
    nameSw: 'Kuhusu Sisi',
    title: `About Us | ${SITE_NAME}`,
    description:
      'Learn about Arusha Catholic Seminary in Oldonyosambu, Tanzania. Explore our mission, history since 1967, and Catholic education in Arusha.',
    ogImageAlt: 'About Arusha Catholic Seminary',
  },
  {
    path: '/staff',
    name: 'Staff',
    nameSw: 'Watumishi',
    title: `Staff | ${SITE_NAME}`,
    description: 'Meet the staff and teachers at Arusha Catholic Seminary, Arusha, Tanzania.',
    ogImageAlt: 'Staff at Arusha Catholic Seminary',
  },
  {
    path: '/necta-results',
    name: 'NECTA Results',
    nameSw: 'Matokeo ya NECTA',
    title: `NECTA Results | ${SITE_NAME} S0171`,
    description:
      'NECTA examination results for Arusha Catholic Seminary (S0171). View FTNA, CSEE, and ACSEE results by year on NECTA website.',
    ogImageAlt: 'NECTA results — Arusha Catholic Seminary S0171',
  },
  {
    path: '/admissions',
    name: 'Admissions',
    nameSw: 'Udahili',
    title: `Admissions | ${SITE_NAME} - Best O-Level School`,
    description:
      'Admission requirements, process, and how to apply to Arusha Catholic Seminary in Oldonyosambu. One of the best seminary schools and best O-Level schools in Arusha, Tanzania.',
    ogImageAlt: 'Admissions at Arusha Catholic Seminary',
  },
  {
    path: '/admissions/apply',
    name: 'Apply Online',
    nameSw: 'Maombi ya Udahili',
    title: `Apply Online | Admissions | ${SITE_NAME}`,
    description:
      'Apply for admission to Arusha Catholic Seminary (ARUCASE) online. Form guidance, required documents, and submission for O-Level and A-Level intake in Oldonyosambu, Arusha, Tanzania.',
    ogImageAlt: 'Online application — Arusha Catholic Seminary',
  },
  {
    path: '/student-life',
    name: 'Student Life',
    nameSw: 'Maisha ya Wanafunzi',
    title: `Student Life | ${SITE_NAME}`,
    description: 'Student life, activities, and formation at Arusha Catholic Seminary, Tanzania.',
    ogImageAlt: 'Student life at Arusha Catholic Seminary',
  },
  {
    path: '/student-report',
    name: 'Student Reports',
    nameSw: 'Ripoti za Mwanafunzi',
    title: `Student Report | ${SITE_NAME}`,
    description: 'Student report and progress at Arusha Catholic Seminary.',
    ogImageAlt: 'Student reports — Arusha Catholic Seminary',
  },
  {
    path: '/school-fee',
    name: 'School Fees',
    nameSw: 'Ada ya Shule',
    title: `School Fees | ${SITE_NAME}`,
    description: 'School fees structure and payment information for Arusha Catholic Seminary, Arusha, Tanzania.',
    ogImageAlt: 'School fees — Arusha Catholic Seminary',
  },
  {
    path: '/gallery',
    name: 'Gallery',
    nameSw: 'Picha',
    title: `Gallery | ${SITE_NAME}`,
    description: 'Photo gallery of Arusha Catholic Seminary campus, events, and activities in Arusha, Tanzania.',
    ogImageAlt: 'Photo gallery — Arusha Catholic Seminary',
  },
  {
    path: '/announcements',
    name: 'Announcements',
    nameSw: 'Matangazo',
    title: `Announcements | ${SITE_NAME}`,
    description: 'News and announcements from Arusha Catholic Seminary, Arusha, Tanzania.',
    ogImageAlt: 'Announcements — Arusha Catholic Seminary',
  },
  {
    path: '/contact',
    name: 'Contact',
    nameSw: 'Mawasiliano',
    title: `Contact | ${SITE_NAME}`,
    description:
      'Contact Arusha Catholic Seminary. Address, phone, email, WhatsApp, and directions in Arusha, Tanzania.',
    ogImageAlt: 'Contact Arusha Catholic Seminary',
  },
  {
    path: '/student-login',
    name: 'Student Login',
    nameSw: 'Ingia — Ripoti za Mwanafunzi',
    title: `Student Login | ${SITE_NAME}`,
    description: 'Student portal login for Arusha Catholic Seminary.',
    ogImageAlt: 'Student portal login — Arusha Catholic Seminary',
  },
  {
    path: '/privacy-policy',
    name: 'Privacy Policy',
    nameSw: 'Sera ya Faragha',
    title: `Privacy Policy | ${SITE_NAME}`,
    description: 'Privacy policy for Arusha Catholic Seminary website.',
    ogImageAlt: 'Privacy policy — Arusha Catholic Seminary',
  },
];

/** @deprecated alias — use PUBLIC_INDEXABLE_PAGES */
export const PUBLIC_INDEXABLE_NAV_LINKS = PUBLIC_INDEXABLE_PAGES.map(({ path, name, nameSw }) => ({
  path,
  name,
  nameSw,
}));

const SEO_BY_PATH = Object.fromEntries(PUBLIC_INDEXABLE_PAGES.map((p) => [p.path, p]));

export function getPublicPageSeo(pathname) {
  return SEO_BY_PATH[pathname] || null;
}

export const DEFAULT_PUBLIC_DESCRIPTION =
  'Arusha Catholic Seminary (ARUCASE, S0171) - St. Thomas Aquinas Seminary Arusha, Seminari ya Jimbo, Jimbo Kuu la Arusha. Located in Oldonyosambu, Arusha, Tanzania. One of the best seminary schools and best O-Level schools. O-Level and A-Level education.';

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
  const items = PUBLIC_INDEXABLE_PAGES.map(
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

/** Unique page copy for crawlers (fixes “crawled, not indexed” on SPA routes). */
export function buildSeoPageSnapshotHtml(page) {
  const canonical = absolutePublicUrl(page.path);
  return `    <article id="seo-page-snapshot" class="seo-page-snapshot">
      <h1>${escapeHtml(page.name)} — ${escapeHtml(SITE_NAME)}</h1>
      <p>${escapeHtml(page.description)}</p>
      <p><a href="${escapeHtml(canonical)}">View ${escapeHtml(page.name)}</a></p>
    </article>`;
}

/** ItemList + SiteNavigationElement for rich results / sitelink hints. */
export function buildSeoSiteNavJsonLd() {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Arusha Catholic Seminary main navigation',
    itemListElement: PUBLIC_INDEXABLE_PAGES.map((link, index) => ({
      '@type': 'SiteNavigationElement',
      position: index + 1,
      name: link.name,
      url: absolutePublicUrl(link.path),
    })),
  };
  return `    <script type="application/ld+json">\n${JSON.stringify(payload, null, 2)}\n    </script>`;
}
