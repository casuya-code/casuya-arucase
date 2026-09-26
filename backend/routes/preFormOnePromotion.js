/**
 * Pre-Form One Promotion Routes
 * Handles promotion of Pre-Form One students to Form One
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { query, withTransaction } = require('../config/database');
const { sendError } = require('../utils/safeError');
const { saveUserActivity } = require('../utils/activityLogger');
const { userHasPreFormOneYearAccess } = require('../utils/preFormOneAccess');

function clientError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const FORM_ONE_STREAMS = new Set(['A', 'B']);

/**
 * promotion_activities.user_id references users.id (INTEGER) while the JWT
 * carries the username, so the numeric id has to be resolved from users.
 * Returns null for a token whose user no longer exists so the FK stays valid.
 */
async function resolvePromotionActorId(user) {
  const username =
    (user && (user.username || (typeof user.user_id === 'string' ? user.user_id : null))) || null;
  if (!username) return null;
  try {
    const result = await query('SELECT id FROM users WHERE username = $1', [username]);
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    console.warn('Could not resolve promotion actor id:', error.message);
    return null;
  }
}

/**
 * Writes the promotion audit row inside the promotion transaction. A failing
 * audit write must abort the whole promotion: committed promotions are never
 * left without a matching history record, and the caller never sees a 500 for
 * a promotion that was already saved.
 */
async function recordPromotionActivity(client, { actorId, sourceYear, targetYear, promotedCount, failedCount }) {
  await client.query(
    `CREATE TABLE IF NOT EXISTS promotion_activities (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      source_year INTEGER NOT NULL,
      target_year INTEGER NOT NULL,
      promoted_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await client.query(
    `INSERT INTO promotion_activities (user_id, source_year, target_year, promoted_count, failed_count, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      actorId,
      sourceYear,
      targetYear,
      promotedCount,
      failedCount,
      JSON.stringify({ promotedCount, failedCount }),
    ]
  );
}

// Express middleware: reject a non-admin user who lacks access to the requested year.
function requirePreFormOneYear(req, res, next) {
  const { year } = req.params;
  if (year === undefined) return next();
  if (!userHasPreFormOneYearAccess(req.user, year)) {
    return sendError(res, clientError('You do not have access to Pre-Form One data for this year. Contact an administrator.', 403));
  }
  return next();
}

/**
 * Get students eligible for promotion from a specific year.
 * already_promoted flags students who already have a Form One record for the
 * target year so the UI can exclude them from selection.
 */
router.get('/eligible/:year', requireAuth, requirePreFormOneYear, async (req, res) => {
  try {
    const { year } = req.params;

    if (!year || isNaN(parseInt(year, 10))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }

    const sourceYear = parseInt(year, 10);

    const result = await query(
      `SELECT
        p.id,
        p.admission_number,
        p.serial_number,
        p.first_name,
        p.middle_name,
        p.surname,
        p.sex,
        p.parish,
        p.year,
        EXISTS (
          SELECT 1 FROM students s
          WHERE s.adm_no = p.admission_number
            AND s.level = 'FORM I'
            AND s.year = $2
        ) AS already_promoted
       FROM preform_one_students p
       WHERE p.year = $1
       ORDER BY p.admission_number`,
      [sourceYear, sourceYear + 1]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
      message: `Found ${result.rowCount} students eligible for promotion from ${year}`
    });
  } catch (error) {
    console.error('Error fetching eligible students:', error);
    sendError(res, error, 500);
  }
});

/**
 * Get promotion status for a specific year
 */
router.get('/status/:year', requireAuth, requirePreFormOneYear, async (req, res) => {
  try {
    const { year } = req.params;

    if (!year || isNaN(parseInt(year, 10))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }

    const sourceYear = parseInt(year, 10);
    const targetYear = sourceYear + 1;

    // Check if students from this year have already been promoted
    const preFormOneCount = await query(
      'SELECT COUNT(*) as count FROM preform_one_students WHERE year = $1',
      [sourceYear]
    );

    const promotedCount = await query(
      `SELECT COUNT(DISTINCT s.id) AS count
       FROM students s
       INNER JOIN preform_one_students p
         ON p.admission_number = s.adm_no AND p.year = $1
       WHERE s.level = 'FORM I' AND s.year = $2`,
      [sourceYear, targetYear]
    );

    const status = {
      sourceYear: year,
      targetYear: targetYear,
      totalPreFormOneStudents: parseInt(preFormOneCount.rows[0].count),
      alreadyPromoted: parseInt(promotedCount.rows[0].count),
      canPromote: parseInt(preFormOneCount.rows[0].count) > parseInt(promotedCount.rows[0].count),
      promotionCompleted: parseInt(preFormOneCount.rows[0].count) === parseInt(promotedCount.rows[0].count)
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching promotion status:', error);
    sendError(res, error, 500);
  }
});

/**
 * Promote Pre-Form One students to Form One
 */
router.post('/promote/:year', requireAuth, requirePreFormOneYear, async (req, res) => {
  try {
    const { year } = req.params;
    const { selectedStudents, targetStreams, promoteAll } = req.body || {};

    if (!year || isNaN(parseInt(year, 10))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }

    const sourceYear = parseInt(year, 10);
    const targetYear = sourceYear + 1;

    // Stream assignments are only accepted for valid Form One streams; anything
    // else falls back to the default sex-based assignment.
    const requestedStreams = {};
    if (targetStreams && typeof targetStreams === 'object' && !Array.isArray(targetStreams)) {
      Object.entries(targetStreams).forEach(([studentId, stream]) => {
        const value = String(stream == null ? '' : stream).trim().toUpperCase();
        if (FORM_ONE_STREAMS.has(value)) {
          requestedStreams[studentId] = value;
        }
      });
    }

    let selectedIds = null;
    if (!promoteAll) {
      selectedIds = [...new Set(
        (Array.isArray(selectedStudents) ? selectedStudents : [])
          .map((id) => parseInt(id, 10))
          .filter((id) => Number.isInteger(id) && id > 0)
      )];

      if (selectedIds.length === 0) {
        return res.json({
          success: false,
          message: 'No valid students selected for promotion',
        });
      }
    }

    const actorId = await resolvePromotionActorId(req.user);

    const outcome = await withTransaction(async (client) => {
      try {
        const outOfCohortIds = [];

        // Get students to promote. Both the promoteAll and the explicit-selection
        // paths are scoped to the source cohort and exclude students who already
        // have a Form One record for the target year.
        let studentsToPromote;
        if (promoteAll) {
          const result = await client.query(
            `SELECT p.*
             FROM preform_one_students p
             WHERE p.year = $1
               AND NOT EXISTS (
                 SELECT 1 FROM students s
                 WHERE s.adm_no = p.admission_number
                   AND s.level = 'FORM I'
                   AND s.year = $2
               )
             ORDER BY p.admission_number`,
            [sourceYear, targetYear]
          );
          studentsToPromote = result.rows;
        } else {
          const placeholders = selectedIds.map((_, index) => `$${index + 1}`).join(',');
          const result = await client.query(
            `SELECT * FROM preform_one_students
             WHERE id IN (${placeholders}) AND year = $${selectedIds.length + 1}
             ORDER BY admission_number`,
            [...selectedIds, sourceYear]
          );
          studentsToPromote = result.rows;

          const foundIds = new Set(studentsToPromote.map((s) => s.id));
          selectedIds
            .filter((id) => !foundIds.has(id))
            .forEach((id) => {
              outOfCohortIds.push(id);
            });
        }

        if (studentsToPromote.length === 0) {
          return {
            success: false,
            message: outOfCohortIds.length > 0
              ? 'The selected students do not belong to this Pre-Form One cohort'
              : 'No students found for promotion',
            outOfCohortIds: [...outOfCohortIds],
          };
        }

        console.log(`PROMOTION: Promoting ${studentsToPromote.length} students from ${year} to Form One ${targetYear}`);

        const promotedStudents = [];
        const errors = [];

        for (const student of studentsToPromote) {
          try {
            // Check if student already exists in main students table
            const existingStudent = await client.query(
              `SELECT id FROM students
               WHERE adm_no = $1 AND level = 'FORM I' AND year = $2`,
              [student.admission_number, targetYear]
            );

            if (existingStudent.rows.length > 0) {
              errors.push({
                admissionNumber: student.admission_number,
                name: `${student.first_name} ${student.surname}`,
                error: 'Student already exists in Form One'
              });
              continue;
            }

            // Assign stream based on targetStreams or default logic
            const requested = requestedStreams[student.id] || requestedStreams[String(student.id)];
            const assignedStream = FORM_ONE_STREAMS.has(requested)
              ? requested
              : (student.sex === 'Male' ? 'A' : 'B');

            // Insert student into main students table
            const insertResult = await client.query(
              `INSERT INTO students (
                adm_no, first_name, middle_name, surname,
                sex, level, stream, year, term, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              RETURNING *`,
              [
                student.admission_number,
                student.first_name,
                student.middle_name || null,
                student.surname,
                student.sex,
                'FORM I',
                assignedStream,
                targetYear,
                'First Term',
                'Active'
              ]
            );

            promotedStudents.push({
              id: student.id,
              admission_number: student.admission_number,
              serial_number: student.serial_number,
              first_name: student.first_name,
              middle_name: student.middle_name,
              surname: student.surname,
              sex: student.sex,
              parish: student.parish,
              year: student.year,
              promotedTo: {
                level: 'FORM I',
                stream: assignedStream,
                year: targetYear,
                studentId: insertResult.rows[0].id
              }
            });
          } catch (error) {
            console.error(`PROMOTION ERROR: Failed to promote ${student.admission_number}:`, error);
            errors.push({
              admissionNumber: student.admission_number,
              name: `${student.first_name} ${student.surname}`,
              error: error.message
            });
          }
        }

        if (promotedStudents.length > 0) {
          // Thrown errors abort the transaction, so a failed audit can never
          // leave committed promotions behind.
          await recordPromotionActivity(client, {
            actorId,
            sourceYear,
            targetYear,
            promotedCount: promotedStudents.length,
            failedCount: errors.length,
          });
        }

        return {
          success: true,
          promoted: promotedStudents,
          errors: errors,
          summary: {
            total: studentsToPromote.length,
            successful: promotedStudents.length,
            failed: errors.length,
            skipped: outOfCohortIds.length,
          },
          outOfCohortIds: [...outOfCohortIds],
        };
      } catch (error) {
        console.error('Error in promotion transaction:', error);
        throw error;
      }
    });

    if (!outcome.success) {
      return res.json({
        success: false,
        message: outcome.message || 'Promotion failed',
        outOfCohortIds: outcome.outOfCohortIds || [],
      });
    }

    // The authoritative audit row is already committed with the promotions, so
    // this secondary activity log must never turn a completed promotion into a
    // 500 response for the user.
    try {
      await saveUserActivity({
        username: req.user?.username || req.user?.email || String(req.user?.id || 'unknown'),
        activity_type: 'PROMOTE_PREFORM_ONE',
        description: `Pre-Form One promotion: cohort ${year} ? Form I ${targetYear}`,
        details: {
          sourceYear: year,
          targetYear,
          promotedCount: outcome.promoted?.length || 0,
          failedCount: outcome.errors?.length || 0
        }
      });
    } catch (activityError) {
      console.error('Failed to write promotion activity log:', activityError.message);
    }

    return res.json({
      success: true,
      data: {
        promoted: outcome.promoted || [],
        errors: outcome.errors || [],
        summary: outcome.summary || { total: 0, successful: 0, failed: 0, skipped: 0 },
        outOfCohortIds: outcome.outOfCohortIds || [],
      },
      message: `Promotion completed: ${outcome.summary?.successful || 0} students promoted successfully`
    });
  } catch (error) {
    console.error('Error promoting students:', error);
    sendError(res, error, 500);
  }
});

/**
 * Get promotion history
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT
        pa.*,
        u.username as promoted_by
       FROM promotion_activities pa
       LEFT JOIN users u ON pa.user_id = u.id
       ORDER BY pa.created_at DESC
       LIMIT 50`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching promotion history:', error);
    sendError(res, error, 500);
  }
});

module.exports = router;
