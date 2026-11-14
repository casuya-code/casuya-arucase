/**
 * Comments & Assessment, tabia mwenendo, parish, debt, and fees announcements
 * for individual / bulk PDF reports. Everything is resolved by adm_no so the
 * data follows the student even when the class roster order changes.
 */
const { query } = require('../config/database');
const {
  dedupeCommentRowsByTypePreferA,
  dedupeTabiaRowsByCriterionPreferA,
} = require('./reportCommentDedupe');
const { getTermMatchValues } = require('./termNormalizer');
const { normalizeStream } = require('./streamNormalizer');

const FORM_I_TO_IV = /^FORM\s+(I|II|III|IV)$/i;
const FORM_V_OR_VI = /^FORM\s+(V|VI|5|6)$/i;

function getReportStudentLookupQuery({
  admNo,
  form,
  stream,
  normalizedStream,
  yearNum,
  normalizedTerm,
}) {
  const streamsToCheck = normalizedStream === 'A' ? ['A', 'NA'] : [normalizedStream, stream];
  const uniqueStreams = [...new Set(streamsToCheck)];
  const params = [admNo, form];
  let sql = 'SELECT * FROM students WHERE adm_no = $1 AND level = $2';

  if (uniqueStreams.length === 1) {
    sql += ` AND stream = $${params.length + 1}`;
    params.push(uniqueStreams[0]);
  } else {
    sql += ` AND stream IN ($${params.length + 1}, $${params.length + 2})`;
    params.push(uniqueStreams[0], uniqueStreams[1]);
  }

  sql += ` AND year = $${params.length + 1}`;
  params.push(yearNum);

  if (FORM_V_OR_VI.test(form)) {
    const termMatchValues = getTermMatchValues(normalizedTerm);
    sql += ` AND term = ANY($${params.length + 1}::text[])`;
    params.push(termMatchValues);
  }

  return { sql, params, uniqueStreams };
}

/**
 * Format individual debt for reports (individual + bulk).
 * - Amount empty/zero, description present → description only
 * - Amount present (non-zero), description empty → amount only
 * - Both present and amount non-zero → "amount - description"
 * - Both empty → "0.0"
 * @param {number|string|null|undefined} amount
 * @param {string|null|undefined} description
 * @returns {string}
 */
function formatStudentFeesDebt(amount, description) {
  const desc = String(description ?? '').trim();
  const parsed = amount != null && amount !== '' ? parseFloat(amount) : NaN;
  const hasAmount = !Number.isNaN(parsed) && parsed !== 0;
  const hasDescription = desc.length > 0;

  if (hasAmount && hasDescription) {
    return `${parsed.toFixed(0)} - ${desc}`;
  }
  if (hasAmount) {
    return parsed.toFixed(0);
  }
  if (hasDescription) {
    return desc;
  }
  return '0.0';
}

/**
 * Load assessment-related fields for one student report.
 * @param {{
 *   student: object,
 *   form: string,
 *   normalizedStream: string,
 *   yearNum: number,
 *   normalizedTerm: string,
 * }} ctx
 */
async function loadReportStudentExtras({
  student,
  form,
  normalizedStream,
  yearNum,
  normalizedTerm,
}) {
  const isFormIToIV = FORM_I_TO_IV.test(form);

  let comments = [];
  let tabia_mwenendo = [];

  const admNo = student?.adm_no;
  if (admNo) {
    if (isFormIToIV && normalizedStream === 'A') {
      try {
        const cr = await query(
          `SELECT * FROM comments WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND term = $6`,
          [admNo, form, 'A', 'NA', yearNum, normalizedTerm]
        );
        comments = dedupeCommentRowsByTypePreferA(cr.rows);
      } catch (e) {
        if (e.message && e.message.includes('column "adm_no" does not exist')) {
          comments = [];
        } else {
          throw e;
        }
      }

      try {
        const tr = await query(
          `SELECT * FROM tabia_mwenendo WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND term = $6`,
          [admNo, form, 'A', 'NA', yearNum, normalizedTerm]
        );
        tabia_mwenendo = dedupeTabiaRowsByCriterionPreferA(tr.rows);
      } catch (e) {
        if (e.message && e.message.includes('column "adm_no" does not exist')) {
          tabia_mwenendo = [];
        } else {
          throw e;
        }
      }
    } else {
      try {
        const cr = await query(
          `SELECT * FROM comments WHERE adm_no = $1 AND level = $2 AND stream IN ($3, 'ALL', 'A', 'NA') AND year = $4 AND term = $5`,
          [admNo, form, normalizedStream, yearNum, normalizedTerm]
        );
        // Prefer comments stored under the student's actual stream over combined 'ALL' rows.
        const byType = new Map();
        for (const row of cr.rows) {
          const prev = byType.get(row.comment_type);
          if (!prev || (prev.stream === 'ALL' && row.stream !== 'ALL')) {
            byType.set(row.comment_type, row);
          }
        }
        comments = Array.from(byType.values());
      } catch (e) {
        if (e.message && e.message.includes('column "adm_no" does not exist')) {
          comments = [];
        } else {
          throw e;
        }
      }

      try {
        const tr = await query(
          'SELECT * FROM tabia_mwenendo WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = $5',
          [admNo, form, normalizedStream, yearNum, normalizedTerm]
        );
        tabia_mwenendo = tr.rows;
      } catch (e) {
        if (e.message && e.message.includes('column "adm_no" does not exist')) {
          tabia_mwenendo = [];
        } else {
          throw e;
        }
      }
    }
  }

  let student_parish = 'Not specified';
  try {
    const admNoParish = student?.adm_no;
   if (admNoParish) {
      try {
        const parishResult = (isFormIToIV && normalizedStream === 'A')
          ? await query(
            `SELECT parish_name FROM student_parishes WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5
             ORDER BY CASE WHEN stream = $3 THEN 0 ELSE 1 END LIMIT 1`,
            [admNoParish, form, 'A', 'NA', yearNum]
          )
          : await query(
            'SELECT parish_name FROM student_parishes WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4',
            [admNoParish, form, normalizedStream, yearNum]
          );
        if (parishResult.rows.length > 0 && parishResult.rows[0]) {
          student_parish =
            parishResult.rows[0].parish_name ||
            student.parish ||
            student.parish_name ||
            'Not specified';
        } else {
          student_parish = student.parish || student.parish_name || 'Not specified';
        }
      } catch (e) {
        if (e.message && e.message.includes('column "adm_no" does not exist')) {
          student_parish = student.parish || student.parish_name || 'Not specified';
        } else {
          throw e;
        }
      }
   } else {
      student_parish = student.parish || student.parish_name || 'Not specified';
    }
  } catch {
    student_parish = student.parish || student.parish_name || 'Not specified';
  }

  let student_fees_debt = '0.0';
  try {
    const admNo = student?.adm_no;
    if (admNo) {
      // Debts are keyed to the student (adm_no), not to their position in the sorted
      // class list - see scripts/archive/linkIndividualDebtToAdmNo.js. FORM I-IV stream A still
      // checks both 'A' and 'NA' because some deployments stored those debts under either value.
      const isFormVOrVI = FORM_V_OR_VI.test(form);
      const debtResult = (isFormIToIV && normalizedStream === 'A')
        ? (isFormVOrVI
          ? await query(
            `SELECT amount, description FROM individual_debt WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND term = $6
             ORDER BY CASE WHEN stream = $3 THEN 0 ELSE 1 END LIMIT 1`,
            [admNo, form, 'A', 'NA', yearNum, normalizedTerm]
          )
          : await query(
            `SELECT amount, description FROM individual_debt WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5
             ORDER BY CASE WHEN stream = $3 THEN 0 ELSE 1 END LIMIT 1`,
            [admNo, form, 'A', 'NA', yearNum]
          ))
        : (isFormVOrVI
          ? await query(
            'SELECT amount, description FROM individual_debt WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = $5',
            [admNo, form, normalizedStream, yearNum, normalizedTerm]
          )
          : await query(
            'SELECT amount, description FROM individual_debt WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4',
            [admNo, form, normalizedStream, yearNum]
          ));
      const debt = debtResult.rows[0] || null;
      if (debt) {
        student_fees_debt = formatStudentFeesDebt(debt.amount, debt.description);
      }
    }
  } catch {
    student_fees_debt = student.fees_debt || student.debt || '0.0';
  }

  let class_fees_announcements = {};
  try {
    let feesAnnouncementsResult;
    try {
      feesAnnouncementsResult = await query(
        `SELECT announcement_index, announcement_text FROM fees_announcements
         WHERE UPPER(TRIM(level)) = UPPER(TRIM($1)) AND stream IN ($2, $3) AND year = $4 AND term = $5
         ORDER BY announcement_index`,
        [form, normalizedStream, 'NA', yearNum, normalizedTerm]
      );
    } catch (e) {
      if (e.message && e.message.includes('column') && e.message.includes('term')) {
        feesAnnouncementsResult = await query(
          `SELECT announcement_index, announcement_text FROM fees_announcements
           WHERE UPPER(TRIM(level)) = UPPER(TRIM($1)) AND stream IN ($2, $3) AND year = $4
           ORDER BY announcement_index`,
          [form, normalizedStream, 'NA', yearNum]
        );
      } else {
        throw e;
      }
    }
    feesAnnouncementsResult.rows.forEach((row) => {
      const index =
        row.announcement_index ||
        (feesAnnouncementsResult.rows.indexOf(row) + 1).toString();
      class_fees_announcements[index.toString()] = row.announcement_text || '';
    });
  } catch {
    class_fees_announcements = {};
  }

  return {
    comments,
    tabia_mwenendo,
    student_parish,
    student_fees_debt,
    class_fees_announcements,
  };
}

/**
 * Fetch a student's photo by adm_no.
 *
 * Photos are keyed to the student, not to their position in the sorted class list —
 * see scripts/archive/linkStudentPhotosToAdmNo.js. FORM I-IV stream A still checks both 'A' and
 * 'NA' because some deployments stored those photos under either value.
 *
 * @param {(sql: string, params?: unknown[]) => Promise<{ rows: Array<{ photo_filename?: string|null }> }>} queryFn
 * @returns {Promise<string|null>} photo filename, or null when the student has no photo
 */
async function getStudentPhotoFilename(
  queryFn = query,
  { admNo, level, normalizedStream, yearNum, normalizedTerm, isFormIToIV = false } = {}
) {
  if (!admNo || !level || !yearNum) return null;

  const isFormVOrVI = /^FORM\s+(V|VI|5|6)$/i.test(level);
  let streamForLookup = normalizedStream ? String(normalizedStream).trim() : '';

  // Combined Form V/VI classes use stream=ALL, but photos are stored under the
  // student's real stream (PCB, PCM, HGE...). Resolve it before querying.
  if (!streamForLookup || streamForLookup.toUpperCase() === 'ALL') {
    try {
      const termValues =
        isFormVOrVI && normalizedTerm
          ? [
              normalizedTerm,
              normalizedTerm.replace('First Term', 'Term I').replace('Second Term', 'Term II'),
            ]
          : [];
      const resolvedResult =
        termValues.length > 0
          ? await queryFn(
              `SELECT stream FROM students
                WHERE adm_no = $1 AND level = $2 AND year = $3 AND term = ANY($4::text[])
                ORDER BY stream LIMIT 1`,
              [admNo, level, yearNum, termValues]
            )
          : await queryFn(
              `SELECT stream FROM students
                WHERE adm_no = $1 AND level = $2 AND year = $3
                ORDER BY stream LIMIT 1`,
              [admNo, level, yearNum]
            );
      const resolvedStream = resolvedResult?.rows?.[0]?.stream;
      if (resolvedStream) streamForLookup = normalizeStream(resolvedStream);
    } catch {
      // Fall back to the requested stream below.
    }
  }
  if (!streamForLookup) return null;

  // Only show a photo if the student is actually registered in this year/term.
  // Photos follow the student (adm_no) across terms/years, not a specific position.
  let studentExists = false;
  try {
    if (isFormVOrVI) {
      const existsResult = await queryFn(
        `SELECT 1 FROM students WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = ANY($5::text[]) LIMIT 1`,
        [admNo, level, streamForLookup, yearNum, normalizedTerm ? [normalizedTerm, normalizedTerm.replace('First Term', 'Term I').replace('Second Term', 'Term II')] : []]
      );
      studentExists = existsResult.rows.length > 0;
    } else {
      const existsResult = await queryFn(
        `SELECT 1 FROM students WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 LIMIT 1`,
        [admNo, level, streamForLookup === 'A' ? 'A' : streamForLookup, streamForLookup === 'A' ? 'NA' : streamForLookup, yearNum]
      );
      studentExists = existsResult.rows.length > 0;
    }
  } catch {
    studentExists = false;
  }
  if (!studentExists) return null;

  // Photo belongs to the student (adm_no + level + stream), not to a specific year/term.
  const streams = (isFormIToIV && streamForLookup === 'A')
    ? ['A', 'NA']
    : [streamForLookup];

  const params = [admNo, level, ...streams];
  const sql = streams.length === 2
    ? `SELECT photo_filename FROM student_photos
       WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4)
       ORDER BY year DESC, id DESC LIMIT 1`
    : `SELECT photo_filename FROM student_photos
       WHERE adm_no = $1 AND level = $2 AND stream = $3
       ORDER BY year DESC, id DESC LIMIT 1`;

  const result = await queryFn(sql, params);
  return result?.rows?.[0]?.photo_filename || null;
}

module.exports = {
  FORM_I_TO_IV,
  getReportStudentLookupQuery,
  formatStudentFeesDebt,
  loadReportStudentExtras,
  getStudentPhotoFilename,
};
