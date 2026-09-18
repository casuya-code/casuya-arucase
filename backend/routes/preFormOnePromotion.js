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

function clientError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Mirrors the frontend AuthContext.getAllowedPreFormOneModuleYears(): restricts
// non-admin users to permissions.preformone_module_years (falling back to years
// derived from preformone_score_subjects). null = unrestricted.
function parsePermissions(user) {
  const raw = user && user.permissions;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw;
  return {};
}

function getPreFormOneModuleYears(user) {
  const role = ((user && user.role) || '').toLowerCase();
  if (role === 'admin' || role === 'superadmin') return null;
  const permissions = parsePermissions(user);
  const explicit = Array.isArray(permissions.preformone_module_years)
    ? permissions.preformone_module_years.map(Number)
    : [];
  const allocs = permissions.preformone_score_subjects;
  const scoreYears = allocs && typeof allocs === 'object'
    ? Object.keys(allocs).filter((y) => Array.isArray(allocs[y]) && allocs[y].length > 0).map(Number)
    : [];
  const union = [...new Set([...explicit, ...scoreYears])];
  return union.length ? union : null;
}

// Express middleware: reject a non-admin user who lacks access to the requested year.
function requirePreFormOneYear(req, res, next) {
  const { year } = req.params;
  if (year === undefined) return next();
  const y = parseInt(year, 10);
  const allowedYears = getPreFormOneModuleYears(req.user);
  if (allowedYears !== null && !allowedYears.includes(y)) {
    return sendError(res, clientError('You do not have access to Pre-Form One data for this year. Contact an administrator.', 403));
  }
  return next();
}

/**
 * Get students eligible for promotion from a specific year
 */
router.get('/eligible/:year', requireAuth, requirePreFormOneYear, async (req, res) => {
  try {
    const { year } = req.params;
    
    if (!year || isNaN(parseInt(year, 10))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }

    const result = await query(
      `SELECT 
        id,
        admission_number,
        serial_number,
        first_name,
        middle_name,
        surname,
        sex,
        parish,
        year
       FROM preform_one_students 
       WHERE year = $1 
       ORDER BY admission_number`,
      [parseInt(year, 10)]
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
    const { selectedStudents, targetStreams, promoteAll } = req.body;

    if (!year || isNaN(parseInt(year, 10))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }

    const sourceYear = parseInt(year, 10);
    const targetYear = sourceYear + 1;

    const client = await withTransaction(async (client) => {
      try {
        // Get students to promote
        let studentsToPromote;
        if (promoteAll) {
          const result = await client.query(
            'SELECT * FROM preform_one_students WHERE year = $1 ORDER BY admission_number',
            [sourceYear]
          );
          studentsToPromote = result.rows;
        } else if (selectedStudents && selectedStudents.length > 0) {
          const placeholders = selectedStudents.map((_, index) => `$${index + 1}`).join(',');
          const result = await client.query(
            `SELECT * FROM preform_one_students WHERE id IN (${placeholders}) ORDER BY admission_number`,
            selectedStudents
          );
          studentsToPromote = result.rows;
        } else {
          return { success: false, message: 'No students selected for promotion' };
        }

        if (studentsToPromote.length === 0) {
          return { success: false, message: 'No students found for promotion' };
        }

        console.log(`ðŸ” PROMOTION: Promoting ${studentsToPromote.length} students from ${year} to Form One ${targetYear}`);

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
            let assignedStream = 'A'; // Default stream
            if (targetStreams && targetStreams[student.id]) {
              assignedStream = targetStreams[student.id];
            } else {
              // Stream assignment logic for Stream A and B only
              assignedStream = student.sex === 'Male' ? 'A' : 'B';
            }

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
              ...student,
              promotedTo: {
                level: 'FORM I',
                stream: assignedStream,
                year: targetYear,
                studentId: insertResult.rows[0].id
              }
            });

            console.log(`ðŸ” PROMOTION: Successfully promoted ${student.admission_number} to Form I ${assignedStream}`);

          } catch (error) {
            console.error(`ðŸ” PROMOTION ERROR: Failed to promote ${student.admission_number}:`, error);
            errors.push({
              admissionNumber: student.admission_number,
              name: `${student.first_name} ${student.surname}`,
              error: error.message
            });
          }
        }

        return {
          success: true,
          promoted: promotedStudents,
          errors: errors,
          summary: {
            total: studentsToPromote.length,
            successful: promotedStudents.length,
            failed: errors.length
          }
        };
      } catch (error) {
        console.error('Error in promotion transaction:', error);
        throw error;
      }
    });

    if (client.success) {
      await saveUserActivity({
        username: req.user?.username || req.user?.email || String(req.user?.id || 'unknown'),
        activity_type: 'PROMOTE_PREFORM_ONE',
        description: `Pre-Form One promotion: cohort ${year} → Form I ${targetYear}`,
        details: {
          sourceYear: year,
          targetYear,
          promotedCount: client.promoted?.length || 0,
          failedCount: client.errors?.length || 0
        }
      });

      await query(
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

      await query(
        `INSERT INTO promotion_activities (user_id, source_year, target_year, promoted_count, failed_count, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user?.user_id || null,
          sourceYear,
          targetYear,
          client.promoted?.length || 0,
          client.errors?.length || 0,
          JSON.stringify({
            promotedCount: client.promoted?.length || 0,
            failedCount: client.errors?.length || 0
          })
        ]
      );

      res.json({
        success: true,
        data: {
          promoted: client.promoted || [],
          errors: client.errors || [],
          summary: client.summary || { total: 0, successful: 0, failed: 0 }
        },
        message: `Promotion completed: ${client.summary?.successful || 0} students promoted successfully`
      });
    } else {
      res.json({
        success: false,
        message: client.message || 'Promotion failed'
      });
    }
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
