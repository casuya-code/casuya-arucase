/**
 * Per-route document SEO: title, description, canonical, hreflang, robots,
 * Open Graph / Twitter (with image dimensions), and BreadcrumbList JSON-LD.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  SITE_NAME,
  SITE_ORIGIN,
  DEFAULT_PUBLIC_DESCRIPTION,
  getPublicPageSeo,
} from '../../constants/publicSiteNavSeo';

const BASE_URL = SITE_ORIGIN;

/** Default social preview (matches public/icons). */
const DEFAULT_OG_IMAGE = `${BASE_URL}/icons/icon-192x192.png`;
const OG_IMAGE_WIDTH = '192';
const OG_IMAGE_HEIGHT = '192';
const DEFAULT_OG_IMAGE_ALT = 'Arusha Catholic Seminary (ARUCASE) emblem';

/** Staff login only — not in indexable pages list. */
const STAFF_LOGIN_SEO = {
  title: `Staff Login | ${SITE_NAME}`,
  description: 'Staff portal login for Arusha Catholic Seminary school management system.',
  ogImageAlt: 'Staff login — Arusha Catholic Seminary',
};

function canonicalForPath(pathname) {
  return pathname === '/' ? `${BASE_URL}/` : `${BASE_URL}${pathname}`;
}

function homeItem() {
  return { name: 'Home', item: `${BASE_URL}/` };
}

/** Breadcrumb trails for public indexable routes (matches sitemap). */
function breadcrumbListForPath(pathname) {
  const h = homeItem();
  const trails = {
    '/': [h],
    '/about': [h, { name: 'About', item: `${BASE_URL}/about` }],
    '/admissions': [h, { name: 'Admissions', item: `${BASE_URL}/admissions` }],
    '/admissions/apply': [
      h,
      { name: 'Admissions', item: `${BASE_URL}/admissions` },
      { name: 'Apply online', item: `${BASE_URL}/admissions/apply` },
    ],
    '/staff': [h, { name: 'Staff', item: `${BASE_URL}/staff` }],
    '/student-life': [h, { name: 'Student life', item: `${BASE_URL}/student-life` }],
    '/student-report': [h, { name: 'Student report', item: `${BASE_URL}/student-report` }],
    '/school-fee': [h, { name: 'School fees', item: `${BASE_URL}/school-fee` }],
    '/gallery': [h, { name: 'Gallery', item: `${BASE_URL}/gallery` }],
    '/announcements': [h, { name: 'Announcements', item: `${BASE_URL}/announcements` }],
    '/necta-results': [h, { name: 'NECTA results', item: `${BASE_URL}/necta-results` }],
    '/contact': [h, { name: 'Contact', item: `${BASE_URL}/contact` }],
    '/privacy-policy': [h, { name: 'Privacy policy', item: `${BASE_URL}/privacy-policy` }],
    '/student-login': [h, { name: 'Student login', item: `${BASE_URL}/student-login` }],
  };
  return trails[pathname] || null;
}

function setMeta(nameOrProp, content, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, nameOrProp);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content ?? '');
}

function syncHreflang(canonicalUrl) {
  document.querySelectorAll('link[data-seo-hreflang="1"]').forEach((node) => node.remove());
  for (const hreflang of ['en', 'x-default']) {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.setAttribute('hreflang', hreflang);
    link.href = canonicalUrl;
    link.setAttribute('data-seo-hreflang', '1');
    document.head.appendChild(link);
  }
}

function syncBreadcrumbJsonLd(pathname) {
  const id = 'seo-breadcrumb-jsonld';
  let el = document.getElementById(id);
  const steps = breadcrumbListForPath(pathname);

  if (!steps) {
    if (el) el.remove();
    return;
  }

  const payload = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.name,
      item: s.item,
    })),
  };

  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(payload);
}

function resolveRouteSeo(pathname) {
  if (pathname === '/login') return STAFF_LOGIN_SEO;
  return getPublicPageSeo(pathname);
}

export default function PageSEO() {
  const { pathname } = useLocation();
  const config = resolveRouteSeo(pathname);
  const canonicalUrl = canonicalForPath(pathname);
  const title = config?.title || SITE_NAME;
  const description = config?.description || DEFAULT_PUBLIC_DESCRIPTION;
  const ogImage = DEFAULT_OG_IMAGE;
  const ogImageAlt = config?.ogImageAlt || DEFAULT_OG_IMAGE_ALT;

  const noIndex =
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname.startsWith('/student/dashboard');

  useEffect(() => {
    document.title = title;

    setMeta('description', description);
    const robotsContent = noIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
    setMeta('robots', robotsContent);
    setMeta('googlebot', robotsContent);
    setMeta('bingbot', robotsContent);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', canonicalUrl);

    syncHreflang(canonicalUrl);
    syncBreadcrumbJsonLd(pathname);

    setMeta('og:type', 'website', true);
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('og:image', ogImage, true);
    setMeta('og:image:width', OG_IMAGE_WIDTH, true);
    setMeta('og:image:height', OG_IMAGE_HEIGHT, true);
    setMeta('og:image:alt', ogImageAlt, true);
    setMeta('og:site_name', SITE_NAME, true);
    setMeta('og:locale', 'en_GB', true);

    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:url', canonicalUrl);
    setMeta('twitter:image', ogImage);
    setMeta('twitter:image:alt', ogImageAlt);
  }, [pathname, title, description, canonicalUrl, ogImage, ogImageAlt, noIndex]);

  return null;
}
