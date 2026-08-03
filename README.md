# Arusha Catholic Seminary — School Management System

[![CI](https://github.com/casuya-code/casuya-arucase/actions/workflows/ci.yml/badge.svg)](https://github.com/casuya-code/casuya-arucase/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-22+-green)](https://nodejs.org)

Full-featured school management system built with **Node.js/Express** backend and **React** frontend, optimized for Railway deployment with PostgreSQL.

---

## Cybersecurity Deception Module (Casuya-defence Integration)

Arusha Catholic Seminary includes **integrated cybersecurity deception capabilities** powered by the **Casuya Deception Framework**:

### 8-Layer Biological Defense Pipeline

Integrated into the backend middleware, the system includes comprehensive deception mechanisms to detect and delay attackers:

#### Layer 1: Token Monitor
- Honeytoken protection for bait paths (`/.env`, `/phpmyadmin`, `/backup.zip`, etc.)
- IP blocking and security alert webhooks
- Dynamic junk data serving

#### Layer 2: Bombardier Beetle  
- Rate limiting with 3-tier response (429/503)
- Exothermic discharge simulation with thermal output headers
- Resource pool depletion tracking

#### Layer 3: Mimic Octopus
- Polymorphic signature spoofing by attacker fingerprint
- Dynamic response profiles for scanners, crawlers, exploit kits
- 200 OK responses with rotating variants to waste parser logic

#### Layer 4: Hairy Frog
- Sacrificial trap endpoint deployment after 50 hits
- Fake database configuration with placeholder credentials
- Honeypot login forms to capture attacker credentials

#### Layer 5: Horned Lizard
- Resource exhaustion via autohaemorrhaging data bursts
- After 30 hits: dumps 1-3MB random binary data
- Bandwidth and memory buffer exhaustion

#### Layer 6: Virginia Opossum
- Dead service emulation after 3 repeat hits
- Random error responses (502/503/504/500/404)
- Outdated headers to make services appear abandoned

#### Layer 7: Recursive Tarpit
- Infinite junk byte streaming (1MB chunks) at slow intervals
- Prevents automated tools from crawling bait directories
- Limited to 50 concurrent tarpits to prevent self-inflicted DoS

#### Layer 8: Router Redirect
- Final bait template routing system
- Matches request to configured bait path
- Serves corresponding HTML template with appropriate content type

### Advanced Counterintelligence

The framework includes advanced modules that counter experienced attackers:

#### Timing Analysis Shield
- Detects uniform request timing patterns (automated scanning)
- Detects sequential directory enumeration
- Applies variable jitter delays to defeat timing analysis

#### Traffic Pattern Analysis
- Identifies scanner user agents, sequential path probing
- Detects resource overfetch patterns
- Tracks suspicious extensions and sensitive path targeting

#### Honeypot Detection Countermeasures
- Detects when attackers are actively searching for honeypot signatures
- Tracks sequential fingerprinting attempts
- Identifies deception detection payloads in requests

#### Deception Depth Escalation
- Multi-stage deception that deepens based on attacker persistence
- Stage 1: Surface bait (basic fake pages)
- Stage 2: Deep bait (fake credentials, configs)
- Stage 3: Adaptive bait (technology-matched responses)
- Stage 4: Reactive camouflage (deep fake service emulation)

#### False Positive Prevention
- Whitelists localhost, private networks, and trusted user agents
- Requires browser-like headers for non-whitelisted traffic
- Rate limits to prevent abuse while protecting legitimate traffic

### SIEM Dashboard

Real-time visualization of intruder breakdown patterns across all defense layers:

- **Exothermic Spike Tracker** — Bombardier Beetle activation intensity
- **Polymorphic Disorientation Grid** — Mimic Octopus signature spoofing
- **Structural Trauma Map** — Hairy Frog trap deployments
- **Foul Taste Index** — Horned Lizard resource exhaustion
- **Catatonic Deception Gauge** — Opossum dead service emulation
- **Intruder Breakdown Tracker** — Individual attacker progression through stages 0-5

API endpoints:
- `GET /dashboard` — Serves SIEM visualization dashboard
- `GET /api/metrics` — Real-time dashboard data
- `GET /api/alerts` — Active biological defense alerts
- `GET /api/footprints` — Intruder tracking data

### Attack Flow

```text
Attacker Scanner
      │
      ├─ probes /wp-admin ──────────────────► Mimic Octopus: routed to fake admin portal (URL unchanged)
      ├─ crawls bait directory ─────────────► Recursive Tarpit: served infinite junk folders
      ├─ requests database_backup_fake.sql ─► Token Monitor: IP blocked + corrupted payload + webhook alert
      ├─ rapid-fire scanning detected ──────► Bombardier Beetle: cavitation blast (429 + thermal output)
      ├─ repeated requests from same IP ────► Bombardier Beetle: rate limited with 429/503 responses
      ├─ scanner fingerprint detected ─────► Mimic Octopus: polymorphic signature spoofing
      ├─ 50+ hits on same endpoint ─────────► Hairy Frog: trap endpoints deployed
      ├─ 30+ hits persist ──────────────────► Horned Lizard: resource exhaustion data dump
      └─ 3+ repeat hits ───────────────────► Opossum: dead service emulation
```

### Deployment Configuration

Configure deception behavior in `backend/middleware/deception/config/`:

#### deception_routes.json
```json
{
  "bait_routes": [
    "/wp-admin",
    "/.env",
    "/backup.zip",
    "/phpmyadmin",
    "/server-status",
    "/config.php"
  ],
  "bait_templates": {
    "/wp-admin": "admin_login_fake.html",
    "/.env": "config_env_canary.json",
    "/backup.zip": "backup_dashboard.html",
    "/phpmyadmin": "admin_login_fake.html",
    "/server-status": "backup_dashboard.html",
    "/config.php": "admin_login_fake.html"
  },
  "protected_paths": [
    "/api",
    "/dashboard",
    "/admin"
  ]
}
```

#### threshold_rules.conf
```ini
# Activate the tarpit after N rapid requests from one IP
tarpit.threshold_requests = 25
tarpit.slow_stream_bytes = 1048576

# Block IPs after repeated honeytoken hits
block.ip_repeat_hits = 3
block.autoban_ttl_hours = 24

# Webhook alert destination
alert.webhook_url = https://your-ops-team.example.com/alerts
alert.encryption_key = CHANGE_ME

# Anti-fingerprinting (attackers detect X- headers and canned responses)
stealth.emit_layer_headers = false
stealth.vary_response = true
stealth.rotation_interval_hours = 168
```

### Security Integration

The deception middleware automatically integrates with the existing security stack:

- **Fail-open design**: If any deception layer crashes, requests continue to the real application
- **Dynamic protected paths**: Runtime registration of production endpoints without restart
- **Route rotation**: Bait routes rotate every 24 hours using hash-based variations to prevent fingerprinting
- **Advanced counterintelligence**: Timing analysis, traffic pattern detection, and false positive prevention run automatically before any defense layer engages

### Testing and Validation

All deception modules are thoroughly tested:
- **Unit tests**: Comprehensive test coverage for all deception layers
- **Security audit**: Tests for timing side-channels and vulnerability vectors
- **CI/CD validation**: Automated deployment verification and configuration validation

> The value of this deception architecture is **detection and delay**, delivered at low cost. It does not replace hardening — it only makes reconnaissance expensive enough that attackers move on to easier targets.

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

