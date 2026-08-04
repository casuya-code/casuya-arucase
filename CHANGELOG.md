# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Auth route tests (9 tests) and auth-refresh route tests (6 tests)
- Frontend component tests (Loading, SkeletonLoader — 12 tests)
- API service tests (7 tests)
- Utility tests (tokenDecoder, i18n, backendUrl — 16 tests)
- GitHub Actions CI with test-backend and test-frontend jobs
- CODE_OF_CONDUCT, CONTRIBUTING, SECURITY documentation
- MIT License

### Changed
- Homepage redesign: Digital Lavender announcements, brick red admissions, dark tech stats cards
- Admin cards: warm ivory leadership section, rector card with light green accent
- Hero CTA buttons: transparent style, no background
- Contact cards: per-channel tinted backgrounds (phone/email blue, WhatsApp green, location gold)
- Gallery section: warm off-white background, consistent horizontal gutter alignment
- All homepage sections: consistent `var(--home-gutter)` horizontal padding for uniform alignment
- Admin cards: equal height via CSS Grid `align-items: stretch` + `height: 100%`

### Fixed
- Security: removed suspicious dev comment from `index.html` (CWE-546)
- Security: added HSTS header `max-age=63072000; includeSubDomains; preload` to Vercel config
- CSS: admin grid source order bug — mobile `1fr` override now correctly wins over base `3-col`
- CSS: removed stray `}` that broke PostCSS parsing
- CSS: removed `max-width: 24rem` constraint from admin grid on mobile
- CSS: admissions CTA inner container — removed unnecessary grid layout
- Admin card icons: forced white color to prevent theme `i` color override
- Removed all hardcoded English from homepage (Swahili only)

### Removed
- Local dev tools (`dashboard/`, `scripts/`, `temp_*.js`) from git tracking
- Duplicate/legacy debug documentation from tracked files

### Fixed
- ESLint warnings (varsIgnorePattern for unused `_` params)
- CI Node version bumped from 20 to 22
- `jest --passWithNoErrors` flag for empty test suites
- Server startup guard (`require.main !== module`) for supertest
- uuid v13 ESM compatibility via Jest moduleNameMapper
- `safeError.js` `isProd` refactored from const to function for test isolation
- npm audit vulnerabilities (10 patches in frontend)

## [1.0.0] - 2025-03-XX

### Added
- Form V/VI promotion and navigation
- Google indexing for SPA public pages (per-route HTML, robots.txt)
- Public website with CMS, announcements, events, gallery
- Admin dashboard with user/student management
- Student report PDF generation (individual and bulk)
- CSV/Excel export for reports and data tables
- Photo management with Cloudinary uploads
- Database backup and restore functionality
- Public chatbot (powered by Mistral AI)
- Offline cache support and Sentry error monitoring
- Caching middleware for API routes
- Socket.IO real-time updates
- PWA install support
- Security headers (Mozilla Observatory compliance)
- Admission form PDF upload/download
- DTA Monitor audit tracking

### Fixed
- Report PDF pagination and signature placement
- Score save failures (unique constraint on score_change_audit)
- 429 rate-limit errors (increased limits 4x)
- Photo Management console errors
- CSP violations (lazy stylesheets, inline CSS)
- Monthly results PDF generation on Railway
- Public-pages 401 handling

### Performance
- Puppeteer browser pool (eliminates per-request Chrome launch)
- Homepage LCP optimizations (hero image, defer CSS, prefetch data)
- Code splitting and lazy loading
- Image lazy loading with WebP support
- Connection pooling for PostgreSQL
