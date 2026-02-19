# Files/Folders Not Needed for Dev or Production

Use this when cleaning up, deploying, or building a minimal copy of the project.

---

## Already in .gitignore (do not commit / do not deploy)

| Item | Reason |
|------|--------|
| `node_modules/` | Dependencies; reinstall with `npm install` in backend and frontend |
| `frontend/dist/` | Build output; generate with `npm run build` in frontend |
| `.env`, `.env.local`, `.env.production`, `.env.development` | Secrets; set on server or in CI |
| `*.log`, `logs/` | Runtime logs |
| `*.db`, `*.sqlite`, `*.sqlite3` | Local/legacy DB files (app uses PostgreSQL) |
| `backend/backups/` | PostgreSQL dumps from backup script |
| `static/uploads/*` (keep `.gitkeep`) | User uploads; store on server or volume |
| `.vscode/`, `.idea/`, `*.swp`, `*.swo`, `*~` | IDE/editor |
| `.DS_Store`, `Thumbs.db` | OS metadata |
| `.cache/`, `*.tmp`, `*.temp` | Temp/cache |
| `.railway/` | Railway CLI |

---

## Optional at runtime (keep in repo for reference)

- **`backend/scripts/`** – One-off migrations and fix scripts (e.g. `migrateSQLiteToPostgreSQL.js`, `fixParishesSequence.js`, `removeStudentsByAdmRange.js`). Not required to start the server; useful for maintenance.
- **Root and frontend `*.md` docs** – e.g. `FAST_LOADING.md`, `STUDENT_PHOTO_SERVER_EVALUATION.md`, `frontend/SEO-*.md`, `OPTIMIZATION_SUMMARY.md`. Not needed to run the app; safe to omit from a minimal deploy.

---

## What you need to run

**Development**

- Repo (without `node_modules`, without `frontend/dist`)
- `npm install` in `backend` and `frontend`
- `.env` (or env vars) for backend (DB, JWT, etc.)
- Run: `npm run dev` in backend, `npm run dev` in frontend

**Production**

- Backend: repo (no `node_modules`), then `npm install --production` and `node server.js` (or `npm start`).
- Frontend: either serve `frontend/dist` (after `npm run build`) or build on the server; no need to deploy `frontend/node_modules` if you build in CI or on server.

---

## One-line summary

Do **not** commit or deploy: `node_modules`, `dist`, `.env*`, `backend/backups`, `static/uploads` contents, logs, or IDE/OS junk. Optional to deploy: one-off scripts and planning/docs; everything else is needed to run the app.
