/**
 * Pre-Form One Teachers API Routes
 * Allocates teachers to existing continuing subjects for Pre-Form One in a particular year.
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const LEVEL = 'PRE-FORM ONE';
const STREAM = 'A';

// Get continuing subjects with teacher assignments for a year
router.get('/', requireAuth, async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    if (isNaN(year)) {
      return sendError(res, 400, 'year query parameter is required');
    }

    // Fetch all active continuing subjects
    const subjectsResult = await query(
      'SELECT id, subject_name, subject_code, is_active FROM preformone_continuing_subjects WHERE is_active = true ORDER BY subject_name'
    );

    // Fetch teacher assignments for this year
    const teachersResult = await query(
      'SELECT subject_code, teacher_name, teacher_signature FROM subject_teachers WHERE level = $1 AND stream = $2 AND year = $3',
      [LEVEL, STREAM, year]
    );
    const teacherMap = {};
    teachersResult.rows.forEach((row) => {
      teacherMap[row.subject_code] = {
        teacher_name: row.teacher_name,
        teacher_signature: row.teacher_signature,
      };
    });

    const subjects = subjectsResult.rows.map((s) => ({
      ...s,
      teacher_name: teacherMap[s.subject_code]?.teacher_name || '',
      teacher_signature: teacherMap[s.subject_code]?.teacher_signature || '',
    }));

    return sendSuccess(res, 200, 'Pre-Form One teachers retrieved successfully', { subjects, year });
  } catch (error) {
    console.error('Error fetching pre-form-one teachers:', error);
    return sendError(res, 500, 'Failed to fetch pre-form-one teachers', error);
  }
});

// Save (upsert) a teacher for a continuing subject in a year
router.post('/', requireAuth, async (req, res) => {
  try {
    const { year, subject_code, teacher_name, teacher_signature } = req.body;

    if (!year || !subject_code || !teacher_name) {
      return sendError(res, 400, 'year, subject_code, and teacher_name are required');
    }

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      return sendError(res, 400, 'Invalid year');
    }

    const code = String(subject_code).trim().toUpperCase();

    const result = await query(
      `INSERT INTO subject_teachers (level, stream, year, subject_code, teacher_name, teacher_signature)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (level, stream, year, subject_code)
       DO UPDATE SET teacher_name = EXCLUDED.teacher_name, teacher_signature = EXCLUDED.teacher_signature, updated_at = NOW()
       RETURNING *`,
      [LEVEL, STREAM, yearNum, code, teacher_name, teacher_signature || null]
    );

    return sendSuccess(res, 201, 'Teacher assigned successfully', result.rows[0]);
  } catch (error) {
    console.error('Error saving pre-form-one teacher:', error);
    return sendError(res, 500, 'Failed to assign teacher', error);
  }
});

// Delete a teacher assignment for a continuing subject in a year
router.delete('/', requireAuth, async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const subject_code = req.query.subject_code;

    if (isNaN(year) || !subject_code) {
      return sendError(res, 400, 'year and subject_code query parameters are required');
    }

    const code = String(subject_code).trim().toUpperCase();

    const result = await query(
      'DELETE FROM subject_teachers WHERE level = $1 AND stream = $2 AND year = $3 AND subject_code = $4',
      [LEVEL, STREAM, year, code]
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, 'Teacher assignment not found');
    }

    return sendSuccess(res, 200, 'Teacher assignment removed successfully');
  } catch (error) {
    console.error('Error deleting pre-form-one teacher:', error);
    return sendError(res, 500, 'Failed to remove teacher assignment', error);
  }
});

module.exports = router;
