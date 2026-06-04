/**
 * Form V / Form VI promotion: term rollover and Form V → Form VI.
 * DB model: calendar year + term (First Term Jul–Dec, Second Term Jan–Jun).
 */

const { normalizeTerm, getTermMatchValues } = require('./termNormalizer');

const PROMOTION_MODES = {
  TERM_ROLLOVER: 'term_rollover',
  TO_FORM_VI: 'to_form_vi',
};

/**
 * Resolve source/destination class for a promotion mode.
 */
function resolvePromotionTargets({ mode, level, stream, fromYear, fromTerm }) {
  const L = String(level).trim().toUpperCase();
  const S = String(stream).trim().toUpperCase();
  const y = parseInt(fromYear, 10);
  const term = normalizeTerm(fromTerm);

  if (mode === PROMOTION_MODES.TERM_ROLLOVER) {
    if (L !== 'FORM V' && L !== 'FORM VI') {
      throw new Error('Term rollover is only for FORM V and FORM VI');
    }
    if (term !== 'First Term') {
      throw new Error('Term rollover requires source term First Term');
    }
    return {
      from: { level: L, stream: S, year: y, term },
      to: { level: L, stream: S, year: y + 1, term: 'Second Term' },
      label: `${L} ${S}: ${y} First Term → ${y + 1} Second Term`,
    };
  }

  if (mode === PROMOTION_MODES.TO_FORM_VI) {
    if (L !== 'FORM V') {
      throw new Error('Form VI promotion requires source level FORM V');
    }
    if (term !== 'Second Term') {
      throw new Error('Form VI promotion requires source term Second Term');
    }
    return {
      from: { level: L, stream: S, year: y, term },
      to: { level: 'FORM VI', stream: S, year: y, term: 'First Term' },
      label: `FORM V ${S} ${y} Second Term → FORM VI ${S} ${y} First Term`,
    };
  }

  throw new Error(`Unknown promotion mode: ${mode}`);
}

async function fetchSourceStudents(queryFn, from, termValues) {
  const placeholders = termValues.map((_, i) => `$${4 + i}`).join(', ');
  const params = [from.level, from.stream, from.year, ...termValues];
  const result = await queryFn(
    `SELECT adm_no, first_name, middle_name, surname, sex, level, stream, year, term, com, status
     FROM students
     WHERE level = $1 AND stream = $2 AND year = $3 AND term IN (${placeholders})
     ORDER BY first_name, middle_name NULLS LAST, surname`,
    params
  );
  return result.rows;
}

async function destinationExists(queryFn, to, admNo, termValues) {
  const placeholders = termValues.map((_, i) => `$${5 + i}`).join(', ');
  const params = [to.level, to.stream, to.year, admNo, ...termValues];
  const result = await queryFn(
    `SELECT 1 FROM students
     WHERE level = $1 AND stream = $2 AND year = $3 AND adm_no = $4 AND term IN (${placeholders})
     LIMIT 1`,
    params
  );
  return result.rows.length > 0;
}

async function copyClassSubjectsAndTeachers(queryFn, from, to) {
  const subRows = await queryFn(
    `SELECT subject_code, subject_name, subject_abbreviation FROM subjects
     WHERE level = $1 AND stream = $2 AND year = $3`,
    [from.level, from.stream, from.year]
  );
  for (const row of subRows.rows) {
    await queryFn(
      `INSERT INTO subjects (level, stream, year, subject_code, subject_name, subject_abbreviation)
       SELECT $1, $2, $3, $4, $5, $6
       WHERE NOT EXISTS (
         SELECT 1 FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 AND subject_code = $4
       )`,
      [to.level, to.stream, to.year, row.subject_code, row.subject_name, row.subject_abbreviation]
    );
  }

  const teachRows = await queryFn(
    `SELECT subject_code, teacher_name, teacher_signature FROM subject_teachers
     WHERE level = $1 AND stream = $2 AND year = $3`,
    [from.level, from.stream, from.year]
  );
  for (const row of teachRows.rows) {
    await queryFn(
      `INSERT INTO subject_teachers (level, stream, year, subject_code, teacher_name, teacher_signature)
       SELECT $1, $2, $3, $4, $5, $6
       WHERE NOT EXISTS (
         SELECT 1 FROM subject_teachers
         WHERE level = $1 AND stream = $2 AND year = $3 AND subject_code = $4
       )`,
      [
        to.level,
        to.stream,
        to.year,
        row.subject_code,
        row.teacher_name,
        row.teacher_signature,
      ]
    );
  }
}

async function getExistingSession(queryFn, mode, from) {
  const result = await queryFn(
    `SELECT * FROM form_vvi_promotion_sessions
     WHERE mode = $1 AND from_level = $2 AND from_stream = $3 AND from_year = $4 AND from_term = $5
     LIMIT 1`,
    [mode, from.level, from.stream, from.year, from.term]
  );
  return result.rows[0] || null;
}

async function buildPreview(query, params) {
  const { mode, level, stream, year, term } = params;
  const targets = resolvePromotionTargets({
    mode,
    level,
    stream,
    fromYear: year,
    fromTerm: term,
  });
  const fromTermValues = getTermMatchValues(targets.from.term);
  const toTermValues = getTermMatchValues(targets.to.term);

  const students = await fetchSourceStudents(query, targets.from, fromTermValues);
  const session = await getExistingSession(query, mode, targets.from);

  const preview = [];
  for (const s of students) {
    const exists = await destinationExists(query, targets.to, s.adm_no, toTermValues);
    preview.push({
      ...s,
      already_at_destination: exists,
    });
  }

  const toPromote = preview.filter((s) => !s.already_at_destination);

  return {
    mode,
    label: targets.label,
    from: targets.from,
    to: targets.to,
    students: preview,
    total: preview.length,
    to_promote_count: toPromote.length,
    already_at_destination_count: preview.length - toPromote.length,
    session_completed: !!session,
    session,
  };
}

async function executePromotion(query, withTransaction, params, username) {
  const { mode, level, stream, year, term, excluded_adm_nos = [] } = params;
  const targets = resolvePromotionTargets({
    mode,
    level,
    stream,
    fromYear: year,
    fromTerm: term,
  });

  const existing = await getExistingSession(query, mode, targets.from);
  if (existing) {
    const err = new Error('This promotion has already been run for this class and term');
    err.status = 400;
    throw err;
  }

  const fromTermValues = getTermMatchValues(targets.from.term);
  const toTermValues = getTermMatchValues(targets.to.term);
  const excluded = new Set((excluded_adm_nos || []).map(String));

  let promotedCount = 0;
  let skippedCount = 0;

  await withTransaction(async (client) => {
    const q = (text, params) => client.query(text, params);
    const students = await fetchSourceStudents(q, targets.from, fromTermValues);
    await copyClassSubjectsAndTeachers(q, targets.from, targets.to);

    for (const student of students) {
      if (excluded.has(String(student.adm_no))) continue;

      const exists = await destinationExists(q, targets.to, student.adm_no, toTermValues);
      if (exists) {
        skippedCount += 1;
        continue;
      }

      const com =
        student.com ||
        (targets.to.level === 'FORM V' || targets.to.level === 'FORM VI'
          ? targets.to.stream
          : null);

      await client.query(
        `INSERT INTO students (adm_no, first_name, middle_name, surname, sex, level, stream, year, term, com, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (adm_no, level, stream, year, term)
         DO UPDATE SET
           first_name = EXCLUDED.first_name,
           middle_name = EXCLUDED.middle_name,
           surname = EXCLUDED.surname,
           sex = EXCLUDED.sex,
           com = COALESCE(EXCLUDED.com, students.com),
           status = EXCLUDED.status`,
        [
          student.adm_no,
          student.first_name,
          student.middle_name || null,
          student.surname,
          student.sex,
          targets.to.level,
          targets.to.stream,
          targets.to.year,
          targets.to.term,
          com,
          'ACTIVE',
        ]
      );

      await client.query(
        `INSERT INTO student_history (
           adm_no, full_name, current_level, current_stream, current_year,
           previous_level, previous_stream, previous_year, promoted_by, promotion_type
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (adm_no, current_level, current_stream, current_year) DO NOTHING`,
        [
          student.adm_no,
          `${student.first_name} ${student.middle_name || ''} ${student.surname}`.trim(),
          targets.to.level,
          targets.to.stream,
          targets.to.year,
          targets.from.level,
          targets.from.stream,
          targets.from.year,
          username || 'system',
          mode,
        ]
      );

      promotedCount += 1;
    }

    await client.query(
      `INSERT INTO form_vvi_promotion_sessions (
         mode, from_level, from_stream, from_year, from_term,
         to_level, to_stream, to_year, to_term,
         total_students, promoted_count, skipped_count, excluded_count, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        mode,
        targets.from.level,
        targets.from.stream,
        targets.from.year,
        targets.from.term,
        targets.to.level,
        targets.to.stream,
        targets.to.year,
        targets.to.term,
        students.length,
        promotedCount,
        skippedCount,
        excluded.size,
        username || 'system',
      ]
    );
  });

  return {
    message: `${targets.label}: ${promotedCount} student(s) promoted, ${skippedCount} already existed, ${excluded.size} excluded`,
    promoted_count: promotedCount,
    skipped_count: skippedCount,
    excluded_count: excluded.size,
    to: targets.to,
  };
}

module.exports = {
  PROMOTION_MODES,
  normalizeTerm,
  resolvePromotionTargets,
  buildPreview,
  executePromotion,
};
