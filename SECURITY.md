# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

We take security issues seriously. If you discover a vulnerability, please
report it privately before disclosing it publicly.

**Do not report security vulnerabilities through public GitHub issues.**

Instead, send a detailed report to the project maintainers via:

- Opening a [security advisory](https://github.com/casuya-code/casuya-arucase/security/advisories/new)
- (Or contact the development team directly)

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigation (if known)

We will acknowledge receipt within 48 hours and provide a timeline for a fix.

## Security Measures

This project implements:

- **JWT authentication** with token expiry and refresh
- **bcrypt password hashing** (no plaintext storage)
- **Helmet** security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS** restricted to known origins
- **Rate limiting** on API routes (express-rate-limit)
- **Input validation** on all endpoints (express-validator)
- **SQL injection prevention** via parameterized queries
- **Sentry** error monitoring (production only)

## Best Practices

- Keep dependencies up to date (`npm audit` regularly)
- Use strong, unique JWT secrets
- Restrict database access to application-only accounts
- Enable rate limiting in production
- Review API access logs periodically
