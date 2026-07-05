# Arusha Catholic Seminary — Backend API

Node.js/Express backend for the school management system.

## Tech Stack

- **Runtime**: Node.js 22+
- **Framework**: Express.js
- **Database**: PostgreSQL (via `pg`)
- **Authentication**: JWT + bcrypt
- **Real-time**: Socket.IO
- **File Upload**: Multer + Cloudinary
- **PDF**: PDFKit, Puppeteer, pdf-lib
- **Validation**: express-validator
- **Caching**: node-cache

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Server starts at `http://localhost:5000`.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Production start |
| `npm run dev` | Development with nodemon |
| `npm test` | Run Jest test suite |
| `npm run init-db` | Initialize database tables |
| `npm run create-admin` | Create admin user |
| `npm run db:migrate` | Apply versioned migrations |
| `npm run db:backup` | Backup database |
| `npm run db:restore` | Restore database |

## Project Structure

```
backend/
├── config/          # DB, auth, cloudinary configuration
├── middleware/      # auth, cache, error handling
├── routes/         # API route handlers
├── utils/          # Shared utilities
├── scripts/        # DB scripts and tooling
├── migrations/     # Versioned SQL migrations
├── __tests__/      # Jest test files
├── __mocks__/      # Jest module mocks (uuid, etc.)
└── server.js       # Entry point
```

## Testing

```bash
npm test
```

Tests use Jest + supertest. The database module is fully mocked — no real DB required.
Test coverage includes: middleware (auth, cache), routes (auth, auth-refresh, system grades, cloudinary), utilities, and configuration.

## API Endpoints

Full API documentation is available in the project [README](../README.md#api-documentation).
