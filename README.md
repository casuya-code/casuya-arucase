# Arusha Catholic Seminary — School Management System

[![CI](https://github.com/casuya-code/casuya-arucase/actions/workflows/ci.yml/badge.svg)](https://github.com/casuya-code/casuya-arucase/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-22+-green)](https://nodejs.org)

Full-featured school management system built with **Node.js/Express** backend and **React** frontend, optimized for Railway deployment with PostgreSQL.

## Technology Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22+ |
| Framework | Express.js |
| Database | PostgreSQL 18 |
| Auth | JWT + bcrypt |
| Real-time | Socket.IO |
| File Upload | Multer + Cloudinary |
| PDF | PDFKit, Puppeteer, pdf-lib |
| Validation | express-validator |
| Cache | node-cache |
| Monitoring | Sentry |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Build | Vite 7 |
| State | TanStack React Query + Context API |
| Routing | React Router v6 |
| Styling | CSS Modules |
| Charts | Chart.js + react-chartjs-2 |
| Testing | Vitest + React Testing Library |
| Icons | Font Awesome 7 |

## Features

- **User Management**: Role-based access (admin, secretary, teacher, staff)
- **Student Management**: Registration, photos, scores, parish data, reports
- **Reports**: Individual and bulk PDF/CSV/Excel reports with ranking
- **Admin Dashboard**: User commands, DTA monitor, backup/restore, logs
- **Public Website**: CMS-managed homepage, announcements, events, gallery, chatbot
- **Photo Management**: Cloudinary uploads with rate limiting (30/min)
- **Analytics**: Performance tracking with Chart.js dashboards
- **Real-time**: Online staff presence, live updates via Socket.IO
- **AI Chatbot**: Mistral AI-powered public assistant
- **PWA**: Installable progressive web app

## Project Structure

```
├── backend/                  # Express API server
│   ├── config/               # Database, auth, Cloudinary config
│   ├── migrations/           # Versioned PostgreSQL migrations
│   ├── middleware/            # Auth, cache, error handling
│   ├── routes/               # API route handlers
│   ├── utils/                # Shared utilities
│   ├── scripts/              # DB scripts and tooling
│   ├── __tests__/            # Jest test suite (67 tests)
│   └── server.js             # Entry point
│
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API service layer (axios)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── context/          # React Context providers
│   │   └── utils/            # i18n, logger, tokens
│   ├── public/               # Static assets
│   └── __tests__/            # Vitest test suite (35 tests)
│
├── docs/                     # Technical documentation
├── .github/                  # CI workflows, issue templates
└── railway.json              # Railway deployment config
```

## Quick Start

```bash
# Clone
git clone https://github.com/casuya-code/casuya-arucase.git
cd casuya-arucase

# Backend
cd backend
npm install
cp .env.example .env    # Edit with your DB credentials
npm run dev             # http://localhost:5000

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env    # Set VITE_API_URL=http://localhost:5000
npm run dev             # http://localhost:3000
```

### Database Setup

```bash
cd backend
npm run init-db         # Create tables
npm run create-admin    # Create admin user
npm run db:migrate      # Apply versioned migrations
```

## Testing

The project has **102 tests** across backend and frontend, all passing.

### Backend (67 tests, 9 suites)
```bash
cd backend && npm test
```
Tests use Jest + supertest with a fully mocked database module. Coverage includes:
- `middleware/auth` (12) — requireAuth, requireRole, requirePermission, requireModule
- `middleware/cache` (7) — cacheMiddleware, clearCache, cacheStats
- `routes/auth` (9) — login, logout, /me, /presence
- `routes/authRefresh` (6) — refresh, enhanced login/logout
- `routes/systemGrades` (3) — grade range, authorization
- `routes/cloudinarySignature` (3) — validation
- `utils/responseHelper` (8) — sendSuccess, sendError
- `utils/safeError` (8) — production error hiding
- `config/database` (3) — DatabaseOverloadError

### Frontend (35 tests, 6 suites)
```bash
cd frontend && npm test
```
Uses Vitest + jsdom. Coverage includes:
- `utils/i18n` (6) — translation keys, createT
- `utils/tokenDecoder` (8) — JWT decoding, expiry
- `utils/backendUrl` (2) — API URL constant
- `services/api` (7) — axios interceptors, base config
- `components/Loading` (6) — spinner variants
- `components/SkeletonLoader` (6) — skeleton variants

## API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/auth/logout` | Invalidate session |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/refresh` | Refresh JWT token |
| GET | `/api/auth/presence/online-count` | Online staff count |

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/homepage` | Homepage data |
| GET | `/api/public/announcements` | Announcements |
| GET | `/api/public/events` | Events |
| GET | `/api/public/gallery` | Gallery photos |

### Admin (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users |
| POST | `/api/admin/users` | Create user |
| PUT | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Delete user |

### Students (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | List students |
| POST | `/api/students` | Create student |
| GET | `/api/students/:admNo` | Get by admission no |
| PUT | `/api/students/:admNo` | Update student |
| DELETE | `/api/students/:admNo` | Delete student |

### Reports (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/individual/:form/:stream/:year/:term/:admNo` | Report data (JSON) |
| GET | `/.../pdf` | Download PDF |
| GET | `/.../csv` | Download CSV |

## Railway Deployment

1. Create a PostgreSQL database on Railway
2. Deploy the backend service (root dir: `backend`)
   - Environment variables are auto-populated for PostgreSQL
3. Deploy the frontend service (root dir: `frontend`)
   - Set `VITE_API_URL=https://your-backend.railway.app`
4. Configure custom domain (SSL is automatic)

See [Railway documentation](https://docs.railway.app) for detailed instructions.

## Security

- **JWT authentication** with refresh token rotation
- **bcrypt** password hashing (no plaintext storage)
- **Helmet** security headers (CSP, HSTS, X-Frame-Options)
- **CORS** restricted to known origins
- **Rate limiting** on all API routes
- **Input validation** with express-validator
- **SQL injection** prevention via parameterized queries
- **Sentry** error monitoring (production)
- **SRI** hash injection on production builds

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE) — 2025 Arusha Catholic Seminary

