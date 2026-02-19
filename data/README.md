# Data Folder (Legacy / Backup Only)

This folder was used for **SQLite database files** and SQL backups. It is **not read by the application** at runtime.

- **Runtime data** is served from the **PostgreSQL database** via the backend API.
- Unused files (school_data.db, .db-shm, .db-wal, backups/*.sql) have been removed. Scripts such as `restoreStudentsFromSQLite.js` or `migrateScoresFromSQLite.js` expect a DB file here if you run them; add it back if you need to run those scripts again.
