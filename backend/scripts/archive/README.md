# Archived migration scripts

These scripts are **historical records** of the migration from the positional
`student_index` to `adm_no`. The `student_index` columns no longer exist, so most
of these scripts will fail if re-run against the current database.

**Do not run them against a live or restored database.**

> **Ordering bug (fixed).** The name-sorted linkers originally queried students
> without the name columns, so `sortByName` saw empty keys and kept database
> order — silently misattributing rows. They now fetch
> `first_name, middle_name, surname` ordered by
> `first_name ASC, middle_name ASC NULLS LAST, surname ASC` and pass
> `{ presorted: true }`, matching the app's SQL roster exactly.
> `linkParishesSafe.js` additionally passes `{ dedupeByAdmNo: true }` because the
> parish endpoint drops repeated admission numbers (FORM V/VI students have one
> student row per term). `sortByName` now throws instead of falling back to
> database order. Verify any replay with `node scripts/verifyStudentLinkOrdering.js`.

| Script | What it did |
| --- | --- |
| `linkCommentsToAdmNo.js` | Filled `comments.adm_no` from the name-sorted roster position. |
| `linkTabiaToAdmNo.js` | Filled `tabia_mwenendo.adm_no` from the name-sorted roster position. |
| `linkStudentParishesToAdmNo.js` | Filled `student_parishes.adm_no` from the name-sorted roster position. Aborts on classes with duplicate positional rows; superseded by `linkParishesSafe.js`. |
| `linkParishesSafe.js` | Collision-safe `student_parishes.adm_no` backfill: fills NULL rows only, skips duplicate copies and orphans, never deletes. This is the script that was used for the live run. |
| `linkIndividualDebtToAdmNo.js` | Filled `individual_debt.adm_no` from the name-sorted roster position. |
| `linkMonthlyResultsToAdmNo.js` | Filled `monthly_results.adm_no` from the adm_no-sorted roster. |
| `linkStudentPhotosToAdmNo.js` | Filled `student_photos.adm_no` from the name-sorted roster position. |
| `linkPreFormOneDebtsToAdmNo.js` | Mapped Pre-Form One debts onto `admission_number`. |
| `linkCommentsTabiaParishesToAdmNo.js` | Earlier combined comments/tabia/parishes backfill. |
| `reportUnlinkedStudentIndexRows.js` | Reported rows whose index was out of range. |
| `exportOrphanedRows.js` | Exported unlinked rows to `reports/orphaned_student_index_rows_*.csv`. |
| `archiveOrphanedRows.js` | Copied unlinked rows into `student_index_orphan_archive` before the drop. |

The outcome of these runs is described in `backend/STUDENT_IDENTITY.md`.
The correction that fixed the monthly-results ordering mistake lives in
`scripts/fixMonthlyResultsAdmNoOrdering.js`; it is kept at the top level because
it documents the one non-obvious mapping bug.
