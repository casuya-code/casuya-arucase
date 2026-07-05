# Contributing to Arusha Catholic Seminary

Thank you for considering contributing to the Arusha Catholic Seminary School Management System.

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

1. Check the [issue tracker](https://github.com/casuya-code/casuya-arucase/issues) for existing reports
2. If none exists, [open a new issue](https://github.com/casuya-code/casuya-arucase/issues/new?template=bug_report.md) with:
   - A clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (browser, OS, Node version)

### Suggesting Features

Open a [feature request](https://github.com/casuya-code/casuya-arucase/issues/new?template=feature_request.md) with:
- A clear description of the feature
- The problem it solves
- Any alternative solutions considered

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Follow the commit convention (see below)
4. Write or update tests as needed
5. Ensure all tests pass
6. Open a pull request against `main`

## Development Setup

```bash
# Clone the repo
git clone https://github.com/casuya-code/casuya-arucase.git
cd casuya-arucase

# Install backend deps
cd backend && npm install && cd ..

# Install frontend deps
cd frontend && npm install && cd ..

# Set up environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

See the main [README](README.md) for detailed setup instructions.

## Commit Convention

This project uses [conventional commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
```

Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `ci`, `revert`.

Examples:
- `feat: add student bulk upload`
- `fix: correct report PDF pagination`
- `test: add auth route tests`
- `docs: update API endpoints`

A commitlint hook validates messages automatically.

## Code Style

- **Backend**: Standard JavaScript, 2-space indent
- **Frontend**: ESLint (React config) — run `npm run lint` before committing
- Run lint-staged before each commit (configured via husky)

## Testing

All contributions must maintain or improve test coverage.

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

The CI pipeline runs both test suites on every push to `main`.

## Project Structure

```
├── backend/          # Express API server
│   ├── config/       # DB, auth, cloudinary config
│   ├── middleware/    # Express middleware
│   ├── routes/       # API route handlers
│   ├── utils/        # Shared utilities
│   └── scripts/      # DB scripts, migrations
├── frontend/         # React SPA
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   └── public/
└── docs/             # Technical documentation
```

## Questions?

Open a [discussion](https://github.com/casuya-code/casuya-arucase/discussions) or contact the development team.
