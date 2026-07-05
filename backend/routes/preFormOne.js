const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { query, withTransaction } = require('../config/database');
const { sendError } = require('../utils/safeError');

function clientError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const { saveUserActivity } = require('../utils/activityLogger');
const {
  buildInterviewResultsPdfData,
  buildContinuingResultsPdfData,
  generateInterviewResultsPdfHtml,
  generateContinuingResultsPdfHtml,
  resolveSchoolLogoForPdf,
  renderHtmlToPdfBuffer,
} = require('../utils/preFormOneInterviewResultsPdf');
const { calculateAndSavePreFormOneResults } = require('../utils/preFormOneResultsCalculate');
const { generateIndividualInterviewPDF } = require('../utils/individualInterviewPdfGenerator');

/**
 * Pre-Form One Routes
 * Handles all Pre-Form One student management operations
 */

// Get all Pre-Form One students for a specific year
router.get('/:year', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;
    
    // Validate year parameter
    if (!year || isNaN(parseInt(year))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }
    
    const result = await query(
      'SELECT * FROM preform_one_students WHERE year = $1 ORDER BY admission_number',
      [year]
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching Pre-Form One students:', error);
    sendError(res, error, 500);
  }
});

// Create a new Pre-Form One student
router.post('/', requireAuth, async (req, res) => {
  
  try {
    const result = await withTransaction(async (client) => {
      try {
        const {
          admission_number,
          serial_number,
          first_name,
          middle_name,
          surname,
          sex,
          parish
        } = req.body;
        // Validate required fields
        if (!admission_number || !serial_number || !first_name || !surname || !sex) {
          return { success: false, message: 'Missing required fields: admission number, serial number, first name, surname, and sex' };
        }
        // Validate sex value
        if (!['Male', 'Female'].includes(sex)) {
          return { success: false, message: 'Sex must be either Male or Female' };
        }
        // Get current year or use provided year
        const studentYear = req.body.year || new Date().getFullYear();
        const insertQuery = 'INSERT INTO preform_one_students (admission_number, serial_number, first_name, middle_name, surname, sex, parish, year) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *';
        const insertValues = [admission_number, serial_number, first_name, middle_name, surname, sex, parish, studentYear];
        const result = await client.query(insertQuery, insertValues);
        return { success: true, data: result.rows[0] };
      } catch (error) {
        console.error('Error creating Pre-Form One student:', error);
        
        // Handle specific database errors
        if (error.code === '23505') {
          if (error.constraint === 'preform_one_students_admission_number_key') {
            return { success: false, message: 'Admission number already exists. Please try again with a different serial number.' };
          }
          
          return { success: false, message: 'Duplicate data detected. Please check your input and try again.' };
        }
        
        throw error;
      }
    });
    res.json(result);
  } catch (error) {
    sendError(res, error, 500);
  }
});

// Create multiple Pre-Form One students (bulk registration)
router.post('/bulk', requireAuth, async (req, res) => {
  
  try {
    const result = await withTransaction(async (client) => {
      try {
        const { students } = req.body;
        if (!students || !Array.isArray(students) || students.length === 0) {
          return { success: false, message: 'Invalid students data' };
        }
        const studentYear = req.body.year || new Date().getFullYear();
        const values = students.map((student, index) => {
          return [
            student.admission_number,
            student.serial_number,
            student.first_name,
            student.middle_name || '',
            student.surname,
            student.sex,
            student.parish || '',
            studentYear
          ];
        });
        const placeholders = students.map((_, index) => 
          `($${index * 8 + 1}, $${index * 8 + 2}, $${index * 8 + 3}, $${index * 8 + 4}, $${index * 8 + 5}, $${index * 8 + 6}, $${index * 8 + 7}, $${index * 8 + 8})`
        ).join(', ');
        
        const bulkInsertQuery = `INSERT INTO preform_one_students (admission_number, serial_number, first_name, middle_name, surname, sex, parish, year) VALUES ${placeholders} RETURNING *`;
        
        const result = await client.query(bulkInsertQuery, values.flat());
        return { success: true, students: result.rows, count: students.length };
      } catch (error) {
        console.error('Error creating bulk Pre-Form One students:', error);
        throw error;
      }
    });
    res.json(result);
  } catch (error) {
    sendError(res, error, 500);
  }
});

// Update a Pre-Form One student's details
router.put('/:id', requireAuth, async (req, res) => {
  
  try {
    const result = await withTransaction(async (client) => {
      try {
        const { id } = req.params;
        const {
          serial_number,
          first_name,
          middle_name,
          surname,
          sex,
          parish
        } = req.body;
        // Validate required fields
        if (!id || !serial_number || !first_name || !surname || !sex) {
          return { success: false, message: 'Missing required fields: serial number, first name, surname, and sex' };
        }
        
        // Validate sex value
        if (!['Male', 'Female'].includes(sex)) {
          return { success: false, message: 'Sex must be either Male or Female' };
        }
        // First check if student exists
        const checkQuery = 'SELECT * FROM preform_one_students WHERE id = $1';
        const checkResult = await client.query(checkQuery, [id]);
        
        if (checkResult.rowCount === 0) {
          return { success: false, message: 'Student not found' };
        }
        
        const updateQuery = 'UPDATE preform_one_students SET serial_number = $1, first_name = $2, middle_name = $3, surname = $4, sex = $5, parish = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *';
        const updateValues = [serial_number, first_name, middle_name, surname, sex, parish || '', id];
        const result = await client.query(updateQuery, updateValues);
        return { success: true, data: result.rows[0] };
      } catch (error) {
        console.error('Error updating Pre-Form One student:', error);
        
        // Handle specific database errors
        if (error.code === '23505') {
          if (error.constraint === 'preform_one_students_serial_number_key') {
            return { success: false, message: 'Serial number already exists. Please use a different serial number.' };
          }
          
          return { success: false, message: 'Duplicate data detected. Please check your input and try again.' };
        }
        
        throw error;
      }
    });
    res.json(result);
  } catch (error) {
    sendError(res, error, 500);
  }
});

// Update a Pre-Form One student's parish
router.put('/:id/parish', requireAuth, async (req, res) => {
  
  const client = await withTransaction(async (client) => {
    try {
      const { id } = req.params;
      const { parish } = req.body;
      if (!id) {
        return { success: false, message: 'Student ID is required' };
      }
      
      // Allow empty parish (for removal) but not undefined/null
      if (parish === undefined || parish === null) {
        return { success: false, message: 'Parish value is required' };
      }
      // First check if student exists
      const checkQuery = 'SELECT * FROM preform_one_students WHERE id = $1';
      const checkResult = await client.query(checkQuery, [id]);
      if (checkResult.rowCount === 0) {
        return { success: false, message: 'Student not found' };
      }
      
      const updateQuery = 'UPDATE preform_one_students SET parish = $1 WHERE id = $2 RETURNING *';
      const updateValues = [parish, id];
      const result = await client.query(updateQuery, updateValues);
      return { success: true, data: result.rows[0] };
    } catch (error) {
      console.error('Error updating student parish:', error);
      throw error;
    }
  });
  
  try {
    res.json(client);
  } catch (error) {
    sendError(res, error, 500);
  }
});

// Bulk update parishes for multiple students
router.put('/bulk-parish', requireAuth, async (req, res) => {
  
  const client = await withTransaction(async (client) => {
    try {
      const { updates } = req.body;
      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return { success: false, message: 'Invalid updates data' };
      }
      // Process each update individually for better debugging
      const updatedStudents = [];
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        // First find the student by serial number
        const findQuery = 'SELECT * FROM preform_one_students WHERE serial_number = $1';
        const findResult = await client.query(findQuery, [update.serial_number]);
        if (findResult.rowCount === 0) {
          continue; // Skip this update but continue with others
        }
        
        // Update the parish
        const updateQuery = 'UPDATE preform_one_students SET parish = $1 WHERE serial_number = $2 RETURNING *';
        const updateResult = await client.query(updateQuery, [update.parish, update.serial_number]);
        updatedStudents.push(updateResult.rows[0]);
      }
      
      return { success: true, students: updatedStudents, count: updatedStudents.length };
    } catch (error) {
      console.error('Error bulk updating parishes:', error);
      throw error;
    }
  });
  
  try {
    res.json(client);
  } catch (error) {
    sendError(res, error, 500);
  }
});

// Delete a Pre-Form One student
router.delete('/:id', requireAuth, async (req, res) => {
  
  try {
    const result = await withTransaction(async (client) => {
      try {
        const { id } = req.params;
        if (!id) {
          return { success: false, message: 'Student ID is required' };
        }
        // First check if student exists
        const checkQuery = 'SELECT * FROM preform_one_students WHERE id = $1';
        const checkResult = await client.query(checkQuery, [id]);
        
        if (checkResult.rowCount === 0) {
          return { success: false, message: 'Student not found' };
        }
        
        const result = await client.query(
          'DELETE FROM preform_one_students WHERE id = $1 RETURNING *',
          [id]
        );
        return { success: true, message: 'Student deleted successfully', data: result.rows[0] };
      } catch (error) {
        console.error('Error deleting Pre-Form One student:', error);
        throw error;
      }
    });
    res.json(result);
  } catch (error) {
    sendError(res, error, 500);
  }
});

// Export Pre-Form One students to CSV
router.get('/:year/export', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;
    
    if (!year || isNaN(parseInt(year))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }
    
    const result = await query(
      'SELECT * FROM preform_one_students WHERE year = $1 ORDER BY admission_number',
      [year]
    );
    
    // Create CSV content
    const headers = ['admission_number', 'serial_number', 'first_name', 'middle_name', 'surname', 'sex', 'parish', 'year'];
    const csvContent = [
      headers.join(','),
      ...result.rows.map(student => [
        student.admission_number,
        student.serial_number,
        student.first_name,
        student.middle_name,
        student.surname,
        student.sex,
        student.parish,
        student.year
      ].map(field => field || ''))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="preform-one-students-${year}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting Pre-Form One students:', error);
    sendError(res, error, 500);
  }
});

// Get interview results for a specific year
router.get('/:year/interview-results', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;
    
    // Validate year parameter
    if (!year || isNaN(parseInt(year))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }
    
    const result = await query(
      'SELECT * FROM preform_one_interview_results WHERE year = $1 ORDER BY position',
      [year]
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching Pre-Form One interview results:', error);
    sendError(res, error, 500);
  }
});

// Get continuing results for a specific year
router.get('/:year/continuing-results', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;
    
    // Validate year parameter
    if (!year || isNaN(parseInt(year))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }
    
    const result = await query(
      'SELECT * FROM preform_one_continuing_results WHERE year = $1 ORDER BY position',
      [year]
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching Pre-Form One continuing results:', error);
    sendError(res, error, 500);
  }
});

// Calculate interview results
router.post('/:year/interview-results/calculate', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;

    if (!year || isNaN(parseInt(year, 10))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }

    const results = await withTransaction(async (client) =>
      calculateAndSavePreFormOneResults(client, {
        year,
        scoreType: 'interview',
        subjectsTable: 'preformone_interview_subjects',
        resultsTable: 'preform_one_interview_results',
      })
    );

    res.json({
      success: true,
      message: 'Interview results calculated and saved successfully!',
      results,
    });
  } catch (error) {
    console.error('Error calculating interview results:', error);
    sendError(res, error, 500);
  }
});

// Calculate continuing results
router.post('/:year/continuing-results/calculate', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;

    if (!year || isNaN(parseInt(year, 10))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }

    const results = await withTransaction(async (client) =>
      calculateAndSavePreFormOneResults(client, {
        year,
        scoreType: 'continuing',
        subjectsTable: 'preformone_continuing_subjects',
        resultsTable: 'preform_one_continuing_results',
      })
    );

    res.json({
      success: true,
      message: 'Continuing results calculated and saved successfully!',
      results,
    });
  } catch (error) {
    console.error('Error calculating continuing results:', error);
    sendError(res, error, 500);
  }
});

// Get individual interview score
router.get('/interview-score/:studentId/:subjectId', requireAuth, async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    
    const result = await query(
      'SELECT score FROM preform_one_scores WHERE student_id = $1 AND subject_id = $2 AND subject_type = $3',
      [studentId, subjectId, 'interview']
    );
    
    res.json({
      success: true,
      data: result.rows[0]?.score || 0
    });
  } catch (error) {
    console.error('Error fetching interview score:', error);
    sendError(res, error, 500);
  }
});

// Get individual continuing score
router.get('/continuing-score/:studentId/:subjectId', requireAuth, async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    
    const result = await query(
      'SELECT score FROM preform_one_scores WHERE student_id = $1 AND subject_id = $2 AND subject_type = $3',
      [studentId, subjectId, 'continuing']
    );
    
    res.json({
      success: true,
      data: result.rows[0]?.score || 0
    });
  } catch (error) {
    console.error('Error fetching continuing score:', error);
    sendError(res, error, 500);
  }
});

// Save individual interview score
router.post('/interview-score/:studentId/:subjectId', requireAuth, async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const { score } = req.body;
    
    const savedRow = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (student_id, subject_id, subject_type)
         DO UPDATE SET score = EXCLUDED.score, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [studentId, subjectId, 'interview', score, req.user?.id || 1]
      );
      return result.rows[0];
    });

    res.json({
      success: true,
      message: 'Interview score saved successfully!',
      data: savedRow,
    });
  } catch (error) {
    console.error('Error saving interview score:', error);
    sendError(res, error, 500);
  }
});

// Save individual continuing score
router.post('/continuing-score/:studentId/:subjectId', requireAuth, async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const { score } = req.body;
    
    const savedRow = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (student_id, subject_id, subject_type)
         DO UPDATE SET score = EXCLUDED.score, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [studentId, subjectId, 'continuing', score, req.user?.id || 1]
      );
      return result.rows[0];
    });

    res.json({
      success: true,
      message: 'Continuing score saved successfully!',
      data: savedRow,
    });
  } catch (error) {
    console.error('Error saving continuing score:', error);
    sendError(res, error, 500);
  }
});

// Download interview results PDF (matches admin page preview)
router.get('/:year/interview-results/pdf', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;

    if (!year || isNaN(parseInt(year))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }

    const { students, subjects, rows } = await buildInterviewResultsPdfData(year, query);

    if (students.length === 0) {
      return sendError(
        res,
        clientError('No Pre-Form One students found for this year.'),
        404
      );
    }

    let logoUrl = null;
    try {
      logoUrl = await resolveSchoolLogoForPdf(query);
      if (!logoUrl) {
        console.warn('Interview results PDF: school logo not embedded (missing or failed to load)');
      }
    } catch (logoErr) {
      console.warn('Interview results PDF: could not load school logo:', logoErr.message);
    }

    const htmlContent = generateInterviewResultsPdfHtml({
      subjects,
      rows,
      year,
      logoUrl,
    });

    if (!htmlContent || htmlContent.length === 0) {
      return sendError(res, clientError('Failed to build PDF content', 500), 500);
    }

    try {
      const pdfBuffer = Buffer.from(await renderHtmlToPdfBuffer(htmlContent));

      if (!pdfBuffer.length || pdfBuffer.toString('ascii', 0, 4) !== '%PDF') {
        return sendError(res, clientError('Generated file is not a valid PDF', 500), 500);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="preform-one-interview-results-${year}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Interview results PDF generation failed:', error);
      const message =
        error.message?.includes('Chrome') || error.message?.includes('Puppeteer')
          ? error.message
          : `PDF generation failed: ${error.message}`;
      return sendError(res, clientError(message, 500), 500);
    }
  } catch (error) {
    console.error('Error generating interview results PDF:', error);
    sendError(res, error, 500);
  }
});

// Download individual interview results PDF for a specific student
router.get('/:year/interview-results/:studentId/pdf', requireAuth, async (req, res) => {
  try {
    const { year, studentId } = req.params;
    
    if (!year || isNaN(parseInt(year))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }
    
    if (!studentId || isNaN(parseInt(studentId))) {
      return sendError(res, clientError('Invalid student ID parameter'), 400);
    }
    
    // Get student information
    const student = await query('SELECT * FROM preform_one_students WHERE id = $1 AND year = $2', [studentId, year]);
    
    if (student.rows.length === 0) {
      return sendError(res, clientError('Student not found'), 404);
    }
    
    const studentData = student.rows[0];
    
    // Get interview results for this student
    const results = await query('SELECT r.*, s.first_name, s.middle_name, s.surname, s.admission_number, s.parish FROM preform_one_interview_results r JOIN preform_one_students s ON r.student_id = s.id WHERE r.student_id = $1 AND r.year = $2', [studentId, year]);
    
    if (results.rows.length === 0) {
      return sendError(res, clientError('No interview results found for this student. Please enter scores and calculate results first.'), 404);
    }
    
    const resultData = results.rows[0];
    
    // Get subjects for PDF generation
    const subjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code');
    
    // Get subject scores for this student
    const scores = await query(`
      SELECT sc.score, sc.student_id, sub.subject_code 
        FROM preform_one_scores sc
        JOIN preformone_interview_subjects sub ON sc.subject_id = sub.id
        WHERE sc.subject_type = 'interview' AND sc.student_id = $1
    `, [studentId]);
    
    // Create a map of subject_code -> score
    const scoresMap = {};
    scores.rows.forEach(scoreRow => {
      const subjectCode = scoreRow.subject_code;
      scoresMap[subjectCode] = scoreRow.score;
    });
    
    let logoUrl = null;
    try {
      logoUrl = await resolveSchoolLogoForPdf(query);
    } catch (logoErr) {
      console.warn('Individual interview PDF: could not load school logo:', logoErr.message);
    }

    try {
      const pdfBuffer = Buffer.from(
        await generateIndividualInterviewPDF(
          studentData,
          resultData,
          subjects.rows,
          scoresMap,
          year,
          logoUrl
        )
      );

      if (!pdfBuffer.length || pdfBuffer.toString('ascii', 0, 4) !== '%PDF') {
        return sendError(res, clientError('Generated file is not a valid PDF', 500), 500);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="PreFormOne_Interview_Report_${studentData.admission_number}_${year}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Individual interview PDF generation failed:', error);
      const message =
        error.message?.includes('Chrome') || error.message?.includes('Puppeteer')
          ? error.message
          : `PDF generation failed: ${error.message}`;
      return sendError(res, clientError(message, 500), 500);
    }
    
  } catch (error) {
    console.error('Error generating individual interview results PDF:', error);
    sendError(res, error, 500);
  }
});

// Download continuing results PDF (matches admin page preview)
router.get('/:year/continuing-results/pdf', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;

    if (!year || isNaN(parseInt(year, 10))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }

    const { students, subjects, rows } = await buildContinuingResultsPdfData(year, query);

    if (students.length === 0) {
      return sendError(
        res,
        clientError('No Pre-Form One students found for this year.'),
        404
      );
    }

    let logoUrl = null;
    try {
      logoUrl = await resolveSchoolLogoForPdf(query);
      if (!logoUrl) {
        console.warn('Continuing results PDF: school logo not embedded (missing or failed to load)');
      }
    } catch (logoErr) {
      console.warn('Continuing results PDF: could not load school logo:', logoErr.message);
    }

    const htmlContent = generateContinuingResultsPdfHtml({
      subjects,
      rows,
      year,
      logoUrl,
    });

    if (!htmlContent || htmlContent.length === 0) {
      return sendError(res, clientError('Failed to build PDF content', 500), 500);
    }

    try {
      const pdfBuffer = Buffer.from(await renderHtmlToPdfBuffer(htmlContent));

      if (!pdfBuffer.length || pdfBuffer.toString('ascii', 0, 4) !== '%PDF') {
        return sendError(res, clientError('Generated file is not a valid PDF', 500), 500);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="preform-one-continuing-results-${year}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Continuing results PDF generation failed:', error);
      const message =
        error.message?.includes('Chrome') || error.message?.includes('Puppeteer')
          ? error.message
          : `PDF generation failed: ${error.message}`;
      return sendError(res, clientError(message, 500), 500);
    }
  } catch (error) {
    console.error('Error generating continuing results PDF:', error);
    sendError(res, error, 500);
  }
});

// Download individual continuing results PDF for a specific student
router.get('/:year/continuing-results/:studentId/pdf', requireAuth, async (req, res) => {
  try {
    const { year, studentId } = req.params;

    if (!year || isNaN(parseInt(year, 10))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }

    if (!studentId || isNaN(parseInt(studentId, 10))) {
      return sendError(res, clientError('Invalid student ID parameter'), 400);
    }

    const student = await query(
      'SELECT * FROM preform_one_students WHERE id = $1 AND year = $2',
      [studentId, year]
    );

    if (student.rows.length === 0) {
      return sendError(res, clientError('Student not found'), 404);
    }

    const studentData = student.rows[0];

    const results = await query(
      `SELECT r.*, s.first_name, s.middle_name, s.surname, s.admission_number, s.parish
       FROM preform_one_continuing_results r
       JOIN preform_one_students s ON r.student_id = s.id
       WHERE r.student_id = $1 AND r.year = $2`,
      [studentId, year]
    );

    if (results.rows.length === 0) {
      return sendError(
        res,
        clientError(
          'No continuing results found for this student. Please enter scores and calculate results first.'
        ),
        404
      );
    }

    const resultData = results.rows[0];

    const subjects = await query(
      'SELECT id, subject_code FROM preformone_continuing_subjects WHERE is_active = true ORDER BY subject_code'
    );

    const scores = await query(
      `
      SELECT sc.score, sc.student_id, sub.subject_code
        FROM preform_one_scores sc
        JOIN preformone_continuing_subjects sub ON sc.subject_id = sub.id
        WHERE sc.subject_type = 'continuing' AND sc.student_id = $1
    `,
      [studentId]
    );

    const scoresMap = {};
    scores.rows.forEach((scoreRow) => {
      scoresMap[scoreRow.subject_code] = scoreRow.score;
    });

    let logoUrl = null;
    try {
      logoUrl = await resolveSchoolLogoForPdf(query);
    } catch (logoErr) {
      console.warn('Individual continuing PDF: could not load school logo:', logoErr.message);
    }

    try {
      const pdfBuffer = Buffer.from(
        await generateIndividualInterviewPDF(
          studentData,
          resultData,
          subjects.rows,
          scoresMap,
          year,
          logoUrl,
          'continuing'
        )
      );

      if (!pdfBuffer.length || pdfBuffer.toString('ascii', 0, 4) !== '%PDF') {
        return sendError(res, clientError('Generated file is not a valid PDF', 500), 500);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="PreFormOne_Continuing_Report_${studentData.admission_number}_${year}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Individual continuing PDF generation failed:', error);
      const message =
        error.message?.includes('Chrome') || error.message?.includes('Puppeteer')
          ? error.message
          : `PDF generation failed: ${error.message}`;
      return sendError(res, clientError(message, 500), 500);
    }
  } catch (error) {
    console.error('Error generating individual continuing results PDF:', error);
    sendError(res, error, 500);
  }
});

// Helper functions
function calculateGrade(average) {
  if (average >= 80) return 'A';
  if (average >= 70) return 'B';
  if (average >= 55) return 'C';
  if (average >= 45) return 'D';
  return 'F';
}

function getRemarks(grade) {
  switch (grade) {
    case 'A': return 'Excellent';
    case 'B': return 'Good';
    case 'C': return 'Satisfactory';
    case 'D': return 'Needs Improvement';
    case 'F': return 'Fail';
    default: return '';
  }
}

// Save individual interview result
router.post('/interview-result', requireAuth, async (req, res) => {
  try {
    const { year, student_index, total_marks, average, grade, position, remarks } = req.body;
    
    if (!year || !student_index) {
      return sendError(res, clientError('Year and student index are required'), 400);
    }
    
    const client = await withTransaction(async (client) => {
      // Get student by admission number
      const studentResult = await client.query(
        'SELECT id FROM preform_one_students WHERE admission_number = $1 AND year = $2',
        [student_index, year]
      );
      
      if (studentResult.rowCount === 0) {
        return { success: false, message: 'Student not found' };
      }
      
      const studentId = studentResult.rows[0].id;
      
      // Save or update interview result
      const result = await client.query(`
        INSERT INTO preform_one_interview_results 
        (student_id, admission_number, total_marks, average, grade, position, remarks, year)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (student_id, year) 
        DO UPDATE SET 
          total_marks = EXCLUDED.total_marks,
          average = EXCLUDED.average,
          grade = EXCLUDED.grade,
          position = EXCLUDED.position,
          remarks = EXCLUDED.remarks,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [studentId, student_index, total_marks, average, grade, position, remarks, year]);
      
      return { success: true, data: result.rows[0] };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error saving interview result:', error);
    sendError(res, error, 500);
  }
});

// Save individual continuing result
router.post('/continuing-result', requireAuth, async (req, res) => {
  try {
    const { year, student_index, total_marks, average, grade, position, remarks } = req.body;
    
    if (!year || !student_index) {
      return sendError(res, clientError('Year and student index are required'), 400);
    }
    
    const client = await withTransaction(async (client) => {
      // Get student by admission number
      const studentResult = await client.query(
        'SELECT id FROM preform_one_students WHERE admission_number = $1 AND year = $2',
        [student_index, year]
      );
      
      if (studentResult.rowCount === 0) {
        return { success: false, message: 'Student not found' };
      }
      
      const studentId = studentResult.rows[0].id;
      
      // Save or update continuing result
      const result = await client.query(`
        INSERT INTO preform_one_continuing_results 
        (student_id, admission_number, total_marks, average, grade, position, remarks, year)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (student_id, year) 
        DO UPDATE SET 
          total_marks = EXCLUDED.total_marks,
          average = EXCLUDED.average,
          grade = EXCLUDED.grade,
          position = EXCLUDED.position,
          remarks = EXCLUDED.remarks,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [studentId, student_index, total_marks, average, grade, position, remarks, year]);
      
      return { success: true, data: result.rows[0] };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error saving continuing result:', error);
    sendError(res, error, 500);
  }
});

// Delete individual interview result
router.delete('/interview-result/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { year } = req.query;
    
    if (!studentId || !year) {
      return sendError(res, clientError('Student ID and year are required'), 400);
    }
    
    const result = await query(
      'DELETE FROM preform_one_interview_results WHERE student_id = $1 AND year = $2 RETURNING *',
      [studentId, year]
    );
    
    res.json({
      success: true,
      message: 'Interview result deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting interview result:', error);
    sendError(res, error, 500);
  }
});

// Delete individual continuing result
router.delete('/continuing-result/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { year } = req.query;
    
    if (!studentId || !year) {
      return sendError(res, clientError('Student ID and year are required'), 400);
    }
    
    const result = await query(
      'DELETE FROM preform_one_continuing_results WHERE student_id = $1 AND year = $2 RETURNING *',
      [studentId, year]
    );
    
    res.json({
      success: true,
      message: 'Continuing result deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting continuing result:', error);
    sendError(res, error, 500);
  }
});

module.exports = router;


