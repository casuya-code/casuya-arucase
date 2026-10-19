/**
 * Link every student_photos row to the student it actually depicts, by adm_no.
 *
 * Why this exists
 * ---------------
 * student_photos was keyed by (level, stream, year, student_index) — a *position* in the
 * alphabetically sorted class list, not the student's identity. Any roster change (a student
 * is added, dropped or renamed, or two names swap A-Z order) shifts every position after that
 * point, so photos silently end up attached to the wrong student.
 *
 * This script adds adm_no and backfills it by replaying the same name ordering the app uses
 * (first_name, middle_name, surname — see PhotoManagement.sortStudentsByName).
 *
 * Form V/VI caveat: those students hold one row per term, and photos were uploaded against a
 * term-scoped list, so the index alone does not identify the term. We pick the smallest term
 * roster that can still hold the deepest photo index (latest term wins ties) and report it.
 * Review the report below before trusting Form V/VI links.
 *
 * Usage:
 *   node scripts/linkStudentPhotosToAdmNo.js            # apply changes
 *   node scripts/linkStudentPhotosToAdmNo.js --dry-run  # report only, no writes
 */
const { query, pool } = require('../config/database');
const { classKey, sortByName, selectRoster } = require('../utils/studentPhotoBackfill');

async function ensureSchema(dryRun) {
  if (dryRun) {
    const columns = await query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'student_photos'`
    );
    return columns.rows.some((row) => row.column_name === 'adm_no');
  }

  await query(`ALTER TABLE student_photos ADD COLUMN IF NOT EXISTS adm_no VARCHAR(50)`);
  await query(`ALTER TABLE student_photos ALTER COLUMN student_index DROP NOT NULL`);
  // The old positional key is retired: positions shift when the roster changes, so it
  // cannot stay unique. adm_no takes over as the per-class identity.
  await query(`
    DO $$
    DECLARE target TEXT;
    BEGIN
      SELECT conname INTO target
      FROM pg_constraint
      WHERE conrelid = 'student_photos'::regclass
        AND contype = 'u'
        AND pg_get_constraintdef(oid) ILIKE '%student_index%';
      IF target IS NOT NULL THEN
        EXECUTE format('ALTER TABLE student_photos DROP CONSTRAINT %I', target);
      END IF;
    END $$;
  `);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_student_photos_adm_no
    ON student_photos(level, stream, year, adm_no)
  `);
  return true;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`\n🔗 Linking student_photos to adm_no${dryRun ? ' (dry run — no writes)' : ''}\n`);

  const hasAdmNo = await ensureSchema(dryRun);
  if (dryRun && !hasAdmNo) {
    console.log('ℹ️  adm_no column does not exist yet — dry run will still compute the mapping.\n');
  }

  const studentsResult = await query(`
    SELECT adm_no, first_name, middle_name, surname, level, stream, year, term
    FROM students
    ORDER BY level, stream, year
  `);

  const photosResult = await query(`
    SELECT id, level, stream, year, student_index, adm_no
    FROM student_photos
    ORDER BY level, stream, year, student_index
  `);

  const studentsByClass = new Map();
  for (const student of studentsResult.rows) {
    const key = classKey(student);
    if (!studentsByClass.has(key)) studentsByClass.set(key, []);
    studentsByClass.get(key).push(student);
  }

  const photosByClass = new Map();
  for (const photo of photosResult.rows) {
    const key = classKey(photo);
    if (!photosByClass.has(key)) photosByClass.set(key, []);
    photosByClass.get(key).push(photo);
  }

  const updates = [];
  const orphans = [];
  const termChoices = [];

  for (const [key, photos] of photosByClass.entries()) {
    const studentsInClass = studentsByClass.get(key) || [];
    const maxIdx = photos.reduce((max, photo) => Math.max(max, Number(photo.student_index) || 0), 0);
    const { roster, term, ambiguous } = selectRoster(studentsInClass, maxIdx);

    if (roster === null) {
      for (const photo of photos) orphans.push({ ...photo, reason: 'no roster large enough' });
      continue;
    }

    if (studentsInClass.length > 0 && roster.length !== studentsInClass.length) {
      termChoices.push({ class: key, students: studentsInClass.length, rosterUsed: roster.length, term, ambiguous });
    }

    for (const photo of photos) {
      if (photo.adm_no) continue; // already linked
      const owner = roster[Number(photo.student_index)];
      if (!owner || !owner.adm_no) {
        orphans.push({ ...photo, reason: `no student at index ${photo.student_index}` });
        continue;
      }
      updates.push({ id: photo.id, admNo: owner.adm_no });
    }
  }

  console.log(`📸 Photos scanned: ${photosResult.rows.length}`);
  console.log(`👥 Students scanned: ${studentsResult.rows.length}`);
  console.log(`🔗 To link: ${updates.length}`);

  if (termChoices.length > 0) {
    console.log('\n⚠️  Form V/VI classes where the term roster was inferred:');
    for (const choice of termChoices) {
      console.log(`   ${choice.class} — ${choice.students} student rows, used ${choice.rosterUsed} (${choice.term || 'no term'})${choice.ambiguous ? ' [AMBIGUOUS]' : ''}`);
    }
  }

  if (orphans.length > 0) {
    console.log('\n❗ Photos with no matching student (left unlinked — re-upload or delete these):');
    for (const orphan of orphans) {
      console.log(`   ${orphan.level} ${orphan.stream} ${orphan.year} index ${orphan.student_index} — ${orphan.reason}`);
    }
  }

  if (dryRun) {
    console.log('\n✅ Dry run complete — nothing was written.\n');
    await pool.end();
    return;
  }

  if (updates.length > 0) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const update of updates) {
        await client.query(
          `UPDATE student_photos SET adm_no = $1 WHERE id = $2`,
          [update.admNo, update.id]
        );
      }
      await client.query('COMMIT');
      console.log('\n✅ Linked ' + updates.length + ' photos to their students.\n');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else {
    console.log('\n✅ Nothing to link — every photo already has adm_no.\n');
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error('❌ Failed:', error.message);
  try { await pool.end(); } catch (_) { /* ignore */ }
  process.exit(1);
});
