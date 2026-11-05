const { query, pool } = require('../config/database');
const { classKey, sortByName, selectRoster } = require('../utils/studentPhotoBackfill');

async function ensureSchema(dryRun) {
  if (dryRun) {
    const columns = await query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'individual_debt'`);
    return columns.rows.some((row) => row.column_name === 'adm_no');
  }
  await query(`ALTER TABLE individual_debt ADD COLUMN IF NOT EXISTS adm_no VARCHAR(50)`);
  await query(`ALTER TABLE individual_debt ALTER COLUMN student_index DROP NOT NULL`);
  await query(`
    DO $$
    DECLARE target TEXT;
    BEGIN
      SELECT conname INTO target
      FROM pg_constraint
      WHERE conrelid = 'individual_debt'::regclass
        AND contype = 'u'
        AND pg_get_constraintdef(oid) ILIKE '%student_index%';
      IF target IS NOT NULL THEN
        EXECUTE format('ALTER TABLE individual_debt DROP CONSTRAINT %I', target);
      END IF;
    END $$;
  `);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_individual_debt_adm_no ON individual_debt(level, stream, year, adm_no)`);
  return true;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`\n🔗 Linking individual_debt to adm_no${dryRun ? ' (dry run — no writes)' : ''}\n`);

  const hasAdmNo = await ensureSchema(dryRun);
  if (dryRun && !hasAdmNo) console.log('ℹ️  adm_no column does not exist yet — dry run will still compute the mapping.\n');

  const studentsResult = await query(`SELECT adm_no, first_name, middle_name, surname, level, stream, year, term FROM students ORDER BY level, stream, year`);
  const debtsResult = await query(`SELECT id, level, stream, year, student_index, adm_no, term FROM individual_debt WHERE adm_no IS NULL OR (level IN ('FORM V','FORM VI') AND term IS NULL) ORDER BY level, stream, year, student_index`);

  const studentsByClass = new Map();
  for (const s of studentsResult.rows) {
    const key = classKey(s);
    if (!studentsByClass.has(key)) studentsByClass.set(key, []);
    studentsByClass.get(key).push(s);
  }
  const debtsByClass = new Map();
  for (const d of debtsResult.rows) {
    const key = classKey(d);
    if (!debtsByClass.has(key)) debtsByClass.set(key, []);
    debtsByClass.get(key).push(d);
  }

  const updates = [];
  const orphans = [];
  const termChoices = [];

  for (const [key, debts] of debtsByClass.entries()) {
    const studentsInClass = studentsByClass.get(key) || [];
    const maxIdx = debts.reduce((max, d) => Math.max(max, Number(d.student_index) || 0), 0);
    const { roster, term, ambiguous } = selectRoster(studentsInClass, maxIdx);

    if (roster === null) {
      for (const d of debts) orphans.push({ ...d, reason: 'no roster large enough' });
      continue;
    }
    if (studentsInClass.length > 0 && roster.length !== studentsInClass.length) {
      termChoices.push({ class: key, students: studentsInClass.length, rosterUsed: roster.length, term, ambiguous });
    }

    for (const d of debts) {
      const isFormVOrVI = d.level === 'FORM V' || d.level === 'FORM VI';
      const inferredTerm = isFormVOrVI ? term : null;
      if (d.adm_no && d.term) continue;
      let owner = null;
      if (!d.adm_no) {
        owner = roster[Number(d.student_index)];
        if (!owner || !owner.adm_no) {
          orphans.push({ ...d, reason: `no student at index ${d.student_index}` });
          continue;
        }
      }
      updates.push({ id: d.id, admNo: d.adm_no || owner.adm_no, term: d.term || inferredTerm });
    }
  }

  console.log(`💳 Debts scanned: ${debtsResult.rows.length}`);
  console.log(`👥 Students scanned: ${studentsResult.rows.length}`);
  console.log(`🔗 To link: ${updates.length}`);

  if (termChoices.length > 0) {
    console.log('\n⚠️  Form V/VI classes where the term roster was inferred:');
    for (const c of termChoices) console.log(`   ${c.class} — ${c.students} student rows, used ${c.rosterUsed} (${c.term || 'no term'})${c.ambiguous ? ' [AMBIGUOUS]' : ''}`);
  }
  if (orphans.length > 0) {
    console.log('\n❗ Debts with no matching student (left unlinked):');
    for (const o of orphans) console.log(`   ${o.level} ${o.stream} ${o.year} index ${o.student_index} — ${o.reason}`);
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
      for (const u of updates) {
        await client.query(`UPDATE individual_debt SET adm_no = $1, term = COALESCE($2, term) WHERE id = $3`, [u.admNo, u.term, u.id]);
      }
      await client.query('COMMIT');
      console.log('\n✅ Linked ' + updates.length + ' debts to their students.\n');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } else {
    console.log('\n✅ Nothing to link — every debt already has adm_no.\n');
  }
  await pool.end();
}

main().catch(async (e) => {
  console.error('❌ Failed:', e.message);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});