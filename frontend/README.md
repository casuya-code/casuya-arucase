# Arusha Catholic Seminary — React Frontend

Modern React SPA for the school management system.

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **State Mgmt**: TanStack React Query + Context API
- **Routing**: React Router v6
- **Styling**: CSS Modules
- **Real-time**: Socket.IO Client
- **Charts**: Chart.js + react-chartjs-2
- **Testing**: Vitest + React Testing Library

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

App starts at `http://localhost:3000` (or `http://localhost:3001` in production build).

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build with optimizations |
| `npm run preview` | Preview production build |
| `npm test` | Run Vitest test suite |
| `npm run lint` | Run ESLint |

## Project Structure

```
frontend/
├── src/
│   ├── components/   # Reusable UI components
│   ├── pages/        # Page components
│   ├── services/     # API service layer (axios)
│   ├── hooks/        # Custom React hooks
│   ├── context/      # React Context providers
│   ├── utils/        # Utilities (i18n, logger, tokens)
│   └── styles/       # CSS files
├── public/           # Static assets
├── scripts/          # Build tooling scripts
└── __tests__/        # Vitest test files
```

## Testing

```bash
npm test
npm run test:watch  # Watch mode
```

Uses Vitest with jsdom. Tests cover: components (Loading, SkeletonLoader), services (API), and utilities (tokenDecoder, i18n, backendUrl).

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:5000` |

## Build Optimizations

The production build pipeline (`npm run build`) applies:
- CSS deferral for critical rendering path
- Font Awesome font-display patching
- SRI hash injection for security
- Per-route HTML generation for SEO
- Page-preload for homepage
