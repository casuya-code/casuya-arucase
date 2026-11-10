# Student identity: `adm_no` is canonical

All per-student academic data is keyed by **admission number (`adm_no`)**.
The old positional `student_index` is **retired** and its columns have been
dropped.

## Why

`student_index` was a position in a roster sorted by name or admission number.
Any roster change (new student, rename, transfer) shifted every later position,
so saved comments, scores, parishes, photos and debts silently moved to a
different student. `adm_no` travels with the student instead.

## Schema

These tables have `adm_no NOT NULL` and a unique key that includes it:

| Table | Unique key |
| --- | --- |
| `students` | `(adm_no, level, stream, year, term)` |
| `student_photos` | `(level, stream, year, adm_no)` |
| `student_parishes` | `(level, stream, year, adm_no)` |
| `individual_scores` | `(level, stream, year, month, subject_code, adm_no)` |
| `monthly_results` | `(level, stream, year, month, adm_no)` |
| `comments` | `(comment_type, level, stream, year, term, adm_no)` |
| `tabia_mwenendo` | `(level, stream, year, term, adm_no, criterion)` |
| `individual_debt` | `(level, stream, year, term, adm_no)` (NULLS NOT DISTINCT) |

Pre-Form One is separate: `preform_one_*` tables use
`preform_one_students.id` (a stable primary key), plus `admission_number` on the
result tables. They never used a positional index.

`fees_announcements.announcement_index` is a fee-slot number (1–10), not a
student reference.

## Guards

- `node scripts/verifyStudentIdentitySchema.js` — live database: fails if any
  `student_index` column exists or if an identity table is missing a
  `NOT NULL adm_no`.
- `__tests__/scripts/initDatabaseStudentIdentity.test.js` — fresh-install
  regression: `scripts/initDatabase.js` must not contain `student_index` and must
  create each per-student table with `adm_no NOT NULL`.
- `__tests__/utils/monthlyResultsBackfill.test.js` — keeps the adm_no ordering
  lexicographic, matching Postgres `ORDER BY adm_no`.

## Ordering rule

Whenever a roster position must be replayed (historical migration only), sort
`adm_no` **lexicographically**, exactly like Postgres `ORDER BY adm_no`. Do not
sort numerically: `'11754' < '1711'` in Postgres, but not as numbers. Mixing the
two orders misallocated 1,559 `monthly_results` rows during the first backfill;
`scripts/fixMonthlyResultsAdmNoOrdering.js` corrected them in place.

## Known historical residue

- **FORM V/VI `student_parishes`** (60 rows): the table has no `term`, so the
  source roster for some rows cannot be reconstructed uniquely. 40 rows are
  deterministic (5 differ from the stored `adm_no`), 20 are ambiguous or
  unverifiable. Review `reports/form_v_vi_parish_review_<date>.csv` with the
  school before changing anything. Generate it with
  `node scripts/generateParishReviewCsv.js`.
- **162 `monthly_results` rows** have totals that no longer match the current
  subject scores (scores were edited after the result was calculated). These are
  stale historical snapshots, not identity errors; there are no swap cycles.
- **1 duplicate position** (FORM III/A 2026 February, position 63) is a
  pre-existing tie.

## Legacy naming

Some code still says "index" but does not store one:

- Frontend `getStudentIndex()` helpers are React state keys only; API writes send
  `adm_no`.
- `utils/monthlyResultsBackfill.js`, `utils/nameSortedBackfill.js`,
  `utils/studentPhotoBackfill.js` are pure helpers retained for historical
  replay/tests.
- Pre-Form One result endpoints accept `adm_no` and still read the legacy
  `student_index` request field, whose value has always been the admission
  number.
