/**
 * Pre-Form One Scores API Routes
 * Handles CRUD operations for Pre-Form One student scores
 */

const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { requireAuth } = require('../middleware/auth');

// Create scores table if it doesn't exist
const createScoresTable = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS preform_one_scores (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES preform_one_students(id),
        subject_id INTEGER NOT NULL,
        subject_type VARCHAR(20) NOT NULL CHECK (subject_type IN ('interview', 'continuing')),
        score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
        grade VARCHAR(2) CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
        remarks TEXT,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, subject_id, subject_type)
      )
    `);

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_preformone_scores_student ON preform_one_scores(student_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_preformone_scores_subject ON preform_one_scores(subject_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_preformone_scores_type ON preform_one_scores(subject_type)`);
    
    console.log('✅ Pre-Form One scores table ensured');
  } catch (error) {
    console.error('❌ Error creating scores table:', error);
  }
};

// Initialize table on module load
createScoresTable();

// Helper function to calculate grade from score using system grade configuration
const calculateGrade = (score) => {
  // Match interview/continuing results grading (average scale applied per subject)
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 45) return 'D';
  return 'F';
};

// Get all scores for a Pre-Form One year and type (interview | continuing)
router.get('/year/:year', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;
    const { type = 'interview' } = req.query;

    if (!year || Number.isNaN(parseInt(year, 10))) {
      return sendError(res, 400, 'Invalid year parameter');
    }

    const subjectsTable =
      type === 'continuing' ? 'preformone_continuing_subjects' : 'preformone_interview_subjects';

    const result = await query(
      `
      SELECT
        sc.student_id,
        sc.score,
        sc.subject_id,
        sub.subject_code,
        st.admission_number
      FROM preform_one_scores sc
      JOIN ${subjectsTable} sub ON sc.subject_id = sub.id
      JOIN preform_one_students st ON sc.student_id = st.id
      WHERE sc.subject_type = $1 AND st.year = $2
      ORDER BY st.admission_number, sub.subject_code
      `,
      [type, parseInt(year, 10)]
    );

    return sendSuccess(res, 200, 'Scores retrieved successfully', result.rows);
  } catch (error) {
    console.error('Error getting scores by year:', error);
    return sendError(res, 500, 'Failed to get scores', error);
  }
});

// Get scores for a specific subject and type
router.get('/subject/:subjectId', requireAuth, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { type = 'interview' } = req.query;
    
    const result = await query(`
      SELECT 
        sc.*,
        st.admission_number,
        st.first_name,
        st.surname,
        sc.score,
        sc.grade,
        sc.remarks,
        sc.created_at
      FROM preform_one_scores sc
      JOIN preform_one_students st ON sc.student_id = st.id
      WHERE sc.subject_id = $1 AND sc.subject_type = $2
      ORDER BY st.admission_number
    `, [subjectId, type]);
    
    return sendSuccess(res, 200, 'Scores retrieved successfully', result.rows);
  } catch (error) {
    console.error('Error getting scores:', error);
    return sendError(res, 500, 'Failed to get scores', error);
  }
});

// Save or update a single student score
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      student_id,
      subject_id,
      subject_type,
      score,
      remarks
    } = req.body;
    
    const created_by = req.user?.id || 1; // Default to user ID 1 if authentication fails
    
    // Validate input
    if (!student_id || !subject_id || !subject_type || score === undefined) {
      return sendError(res, 400, 'Missing required fields');
    }
    
    if (score < 0 || score > 100) {
      return sendError(res, 400, 'Score must be between 0 and 100');
    }
    
    const grade = calculateGrade(score);
    
    const result = await withTransaction(async (client) => {
      // Check if score already exists
      const existingScore = await client.query(
        'SELECT id FROM preform_one_scores WHERE student_id = $1 AND subject_id = $2 AND subject_type = $3',
        [student_id, subject_id, subject_type]
      );
      
      if (existingScore.rowCount > 0) {
        // Update existing score
        const updateResult = await client.query(`
          UPDATE preform_one_scores 
          SET score = $1, grade = $2, remarks = $3, updated_at = CURRENT_TIMESTAMP
          WHERE student_id = $4 AND subject_id = $5 AND subject_type = $6
          RETURNING *
        `, [score, grade, remarks, student_id, subject_id, subject_type]);
        
        return updateResult.rows[0];
      } else {
        // Insert new score
        const insertResult = await client.query(`
          INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, grade, remarks, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [student_id, subject_id, subject_type, score, grade, remarks, created_by]);
        
        return insertResult.rows[0];
      }
    });
    
    return sendSuccess(res, 200, 'Score saved successfully', result);
  } catch (error) {
    console.error('Error saving score:', error);
    return sendError(res, 500, 'Failed to save score', error);
  }
});

// Save multiple scores (bulk save)
router.post('/bulk', requireAuth, async (req, res) => {
  try {
    const { scores } = req.body;
    const created_by = req.user?.id || 1; // Default to user ID 1 if authentication fails
    
    if (!scores || !Array.isArray(scores) || scores.length === 0) {
      return sendError(res, 400, 'Invalid scores data');
    }
    
    const results = await withTransaction(async (client) => {
      const savedScores = [];
      
      for (const scoreData of scores) {
        const { student_id, subject_id, subject_type, score, remarks } = scoreData;
        
        // Validate input - skip invalid entries instead of failing
        if (!student_id || !subject_id || !subject_type || score === undefined) {
          console.warn(`Skipping invalid score data for student ${student_id}`);
          continue;
        }
        
        if (score < 0 || score > 100) {
          console.warn(`Skipping invalid score value for student ${student_id}: ${score}`);
          continue;
        }
        
        const grade = calculateGrade(score);
        
        // Check if score already exists
        const existingScore = await client.query(
          'SELECT id FROM preform_one_scores WHERE student_id = $1 AND subject_id = $2 AND subject_type = $3',
          [student_id, subject_id, subject_type]
        );
        
        let result;
        if (existingScore.rowCount > 0) {
          // Update existing score
          result = await client.query(`
            UPDATE preform_one_scores 
            SET score = $1, grade = $2, remarks = $3, updated_at = CURRENT_TIMESTAMP
            WHERE student_id = $4 AND subject_id = $5 AND subject_type = $6
            RETURNING *
          `, [score, grade, remarks, student_id, subject_id, subject_type]);
        } else {
          // Insert new score
          result = await client.query(`
            INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, grade, remarks, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `, [student_id, subject_id, subject_type, score, grade, remarks, created_by]);
        }
        
        savedScores.push(result.rows[0]);
      }
      
      return savedScores;
    });
    
    return sendSuccess(res, 200, 'Scores saved successfully', results);
  } catch (error) {
    console.error('Error bulk saving scores:', error);
    return sendError(res, 500, 'Failed to save scores', error);
  }
});

// Get score statistics for a subject
router.get('/stats/:subjectId', requireAuth, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { type = 'interview', year } = req.query;

    const yearNum = parseInt(year, 10);
    if (!year || Number.isNaN(yearNum)) {
      return sendError(res, 400, 'Valid year query parameter is required');
    }

    const result = await query(`
      SELECT 
        COUNT(*) as total_students,
        COUNT(sc.score) as scored_students,
        ROUND(AVG(sc.score), 2) as average_score,
        MAX(sc.score) as highest_score,
        MIN(sc.score) as lowest_score,
        COUNT(CASE WHEN sc.score >= 60 THEN 1 END) as passed_students,
        COUNT(CASE WHEN sc.grade = 'A' THEN 1 END) as grade_a,
        COUNT(CASE WHEN sc.grade = 'B' THEN 1 END) as grade_b,
        COUNT(CASE WHEN sc.grade = 'C' THEN 1 END) as grade_c,
        COUNT(CASE WHEN sc.grade = 'D' THEN 1 END) as grade_d,
        COUNT(CASE WHEN sc.grade = 'F' THEN 1 END) as grade_f
      FROM preform_one_students st
      LEFT JOIN preform_one_scores sc ON st.id = sc.student_id AND sc.subject_id = $1 AND sc.subject_type = $2
      WHERE st.year = $3
    `, [subjectId, type, yearNum]);
    
    const stats = result.rows[0];
    stats.pass_rate = stats.scored_students > 0 ? 
      Math.round((stats.passed_students / stats.scored_students) * 100) : 0;
    
    return sendSuccess(res, 200, 'Statistics retrieved successfully', stats);
  } catch (error) {
    console.error('Error getting statistics:', error);
    return sendError(res, 500, 'Failed to get statistics', error);
  }
});

// Export scores to CSV
router.get('/export/:subjectId', requireAuth, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { type = 'interview', year } = req.query;

    const yearNum = parseInt(year, 10);
    if (!year || Number.isNaN(yearNum)) {
      return sendError(res, 400, 'Valid year query parameter is required');
    }

    const result = await query(`
      SELECT 
        st.admission_number,
        st.first_name,
        st.surname,
        sc.score,
        sc.grade,
        sc.remarks,
        sc.created_at
      FROM preform_one_students st
      LEFT JOIN preform_one_scores sc ON st.id = sc.student_id AND sc.subject_id = $1 AND sc.subject_type = $2
      WHERE st.year = $3
      ORDER BY st.admission_number
    `, [subjectId, type, yearNum]);
    
    // Generate CSV
    const csvHeader = 'Admission Number,First Name,Surname,Score,Grade,Remarks,Created At\n';
    const csvData = result.rows.map(row => 
      `"${row.admission_number}","${row.first_name}","${row.surname}","${row.score || ''}","${row.grade || ''}","${row.remarks || ''}","${row.created_at || ''}"`
    ).join('\n');
    
    const csv = csvHeader + csvData;
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="preformone_scores_${type}_${subjectId}.csv"`);
    
    res.send(csv);
  } catch (error) {
    console.error('Error exporting scores:', error);
    return sendError(res, 500, 'Failed to export scores', error);
  }
});

module.exports = router;
