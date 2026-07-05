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
