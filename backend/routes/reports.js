/**
 * Reports Routes - Full Functionality with PDF Generation
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../config/database');
const PDFDocument = require('pdfkit');
const { generateIndividualReportPDF, generateBulkReportPDF } = require('../utils/pdfGenerator');
const { normalizeStream } = require('../utils/streamNormalizer');
const { sendError } = require('../utils/safeError');
const {
  calculateGrade,
  getSwahiliRemarks,
  calculateOLevelDivisionPoint,
  calculateALevelDivisionPoint,
  getOLevelDivision,
  getALevelDivision,
  calculateWeightedTotal,
  calculateOverallAverage
} = require('../utils/calculations');

// All report routes require authentication
router.use(requireAuth);

// Get individual student report data
router.get('/individual/:form/:stream/:year/:term/:admNo', async (req, res) => {
  try {
    const { form, stream, year, term, admNo } = req.params;
    
    // Normalize stream: NA -> A
    const normalizedStream = normalizeStream(stream);
    
    // Get student data - check both normalized stream (A) and original stream (NA) 
    // This handles cases where DB might have either value
    // For FORM I-IV, both NA and A refer to the same class
    const streamsToCheck = normalizedStream === 'A' ? ['A', 'NA'] : [normalizedStream, stream];
    const uniqueStreams = [...new Set(streamsToCheck)]; // Remove duplicates
    
    let studentResult;
    if (uniqueStreams.length === 1) {
      // Single stream value
      studentResult = await query(
        'SELECT * FROM students WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4',
        [admNo, form, uniqueStreams[0], parseInt(year)]
      );
    } else {
      // Check both streams
      studentResult = await query(
        'SELECT * FROM students WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5',
        [admNo, form, uniqueStreams[0], uniqueStreams[1], parseInt(year)]
      );
    }
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ 
        message: `Student not found: ${admNo} in ${form} (checked streams: ${uniqueStreams.join(', ')}) ${year}`,
        details: { admNo, form, stream, normalizedStream, checkedStreams: uniqueStreams, year, term }
      });
    }
    
    const student = studentResult.rows[0];
    
    // Get subjects - use the stream from the found student (might be NA or A)
    const actualStream = student.stream;
    // Check both actual stream and normalized stream for subjects (FORM I-IV can have either)
    const subjectStreams = actualStream === 'NA' || normalizedStream === 'A' ? ['A', 'NA'] : [actualStream];
    const uniqueSubjectStreams = [...new Set(subjectStreams)];
    
    let subjectsResult;
    if (uniqueSubjectStreams.length === 1) {
      subjectsResult = await query(
        'SELECT * FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY subject_code',
        [form, uniqueSubjectStreams[0], parseInt(year)]
      );
    } else {
      subjectsResult = await query(
        'SELECT * FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4 ORDER BY subject_code',
        [form, uniqueSubjectStreams[0], uniqueSubjectStreams[1], parseInt(year)]
      );
    }
    
    // Get months based on term
    // Term I: February, March, April, May (Form I-IV) or February, March, April, May (Form V-VI)
    // Term II: August, September, October, November (Form I-IV) or August, September, October, November (Form V-VI)
    const getMonthsForTerm = (termParam) => {
      if (termParam === 'Term I' || termParam === 'Term 1') {
        return ['February', 'March', 'April', 'May'];
      } else {
        return ['August', 'September', 'October', 'November'];
      }
    };
    
    const formCode = form.replace('FORM ', '').trim();
    const months = getMonthsForTerm(term);
    
    // Get marks configuration from database (needed for calculations)
    let marksConfig = {
      month_weights: {
        February: 40.0,
        March: 0.0,
        April: 40.0,
        May: 20.0,
        August: 40.0,
        September: 0.0,
        October: 40.0,
        November: 20.0
      }
    };
    
    try {
      const marksConfigResult = await query('SELECT * FROM marks_config WHERE id = 1');
      if (marksConfigResult.rows.length > 0) {
        const config = marksConfigResult.rows[0];
        marksConfig = {
          month_weights: {
            February: parseFloat(config.february_weight || 40.0),
            March: parseFloat(config.march_weight || 0.0),
            April: parseFloat(config.april_weight || 40.0),
            May: parseFloat(config.may_weight || 20.0),
            August: parseFloat(config.august_weight || 40.0),
            September: parseFloat(config.september_weight || 0.0),
            October: parseFloat(config.october_weight || 40.0),
            November: parseFloat(config.november_weight || 20.0)
          }
        };
      }
    } catch (e) {
      // Use default weights if table doesn't exist
      console.log('Marks config table not found, using defaults');
    }
    
    // Get individual scores for this student using individual_scores table
    // Check both actual stream and normalized stream for backward compatibility
    const monthlyResult = await query(
      'SELECT * FROM individual_scores WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND month = ANY($6::text[])',
      [admNo, form, actualStream, normalizedStream, parseInt(year), months]
    );
    
    // Get all students in the same class for ranking (check both streams)
    const allStudentsResult = await query(
      'SELECT adm_no FROM students WHERE level = $1 AND stream IN ($2, $3) AND year = $4',
      [form, actualStream, normalizedStream, parseInt(year)]
    );
    
    // Get all individual scores for ranking calculation (check both streams)
    const allMonthlyResults = await query(
      'SELECT * FROM individual_scores WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = ANY($5::text[])',
      [form, actualStream, normalizedStream, parseInt(year), months]
    );
    
    // Calculate rankings per subject
    const subjectRankings = {};
    
    subjectsResult.rows.forEach((subject) => {
      const subjectTotals = {};
      // Scores may be stored with either subject_code or subject_abbreviation
      const subjectCodesToMatch = [
        subject.subject_code,
        subject.subject_abbreviation
      ].filter(Boolean); // Remove null/undefined values
      
      // Calculate total for each student in this subject with weights
      allStudentsResult.rows.forEach((s) => {
        let total = 0;
        months.forEach((month) => {
          const result = allMonthlyResults.rows.find(
            (r) => r.adm_no === s.adm_no && subjectCodesToMatch.includes(r.subject_code) && r.month === month
          );
          if (result) {
            const weight = marksConfig.month_weights[month] || 0;
            total += parseFloat(result.score || 0) * (weight / 100);
          }
        });
        subjectTotals[s.adm_no] = total;
      });
      
      // Sort and rank
      const sorted = Object.entries(subjectTotals)
        .sort((a, b) => b[1] - a[1])
        .map((entry, index) => ({ adm_no: entry[0], rank: index + 1 }));
      
      subjectRankings[subject.subject_code] = {};
      sorted.forEach((item) => {
        subjectRankings[subject.subject_code][item.adm_no] = item.rank;
      });
    });
    
    // Calculate overall ranking with weights
    const overallTotals = {};
    allStudentsResult.rows.forEach((s) => {
      let grandTotal = 0;
      subjectsResult.rows.forEach((subject) => {
        let subjectTotal = 0;
        // Scores may be stored with either subject_code or subject_abbreviation
        const subjectCodesToMatch = [
          subject.subject_code,
          subject.subject_abbreviation
        ].filter(Boolean); // Remove null/undefined values
        
        months.forEach((month) => {
          const result = allMonthlyResults.rows.find(
            (r) => r.adm_no === s.adm_no && subjectCodesToMatch.includes(r.subject_code) && r.month === month
          );
          if (result) {
            const weight = marksConfig.month_weights[month] || 0;
            subjectTotal += parseFloat(result.score || 0) * (weight / 100);
          }
        });
        grandTotal += subjectTotal;
      });
      overallTotals[s.adm_no] = grandTotal;
    });
    
    const sortedOverall = Object.entries(overallTotals)
      .sort((a, b) => b[1] - a[1])
      .map((entry, index) => ({ adm_no: entry[0], rank: index + 1 }));
    
    const overallRank = sortedOverall.find((item) => item.adm_no === admNo)?.rank || '-';
    
    // Get student index for comments and photos (find position in sorted list by name)
    // IMPORTANT: Must match photo management sorting: first_name, middle_name, surname (A-Z)
    const sortedStudentsByName = await query(
      `SELECT adm_no FROM students 
       WHERE level = $1 AND stream = $2 AND year = $3 
       ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC`,
      [form, normalizedStream, parseInt(year)]
    );
    const studentIndex = sortedStudentsByName.rows.findIndex(s => s.adm_no === admNo).toString();
    
    // Get comments using student_index
    const commentsResult = await query(
      'SELECT * FROM comments WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = $5',
      [studentIndex, form, normalizedStream, parseInt(year), term]
    );
    
    // Get tabia mwenendo using student_index
    const tabiaResult = await query(
      'SELECT * FROM tabia_mwenendo WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = $5',
      [studentIndex, form, normalizedStream, parseInt(year), term]
    );
    
    // Get subject teacher signatures
    const subjectTeachersResult = await query(
      'SELECT subject_code, teacher_signature FROM subject_teachers WHERE level = $1 AND stream = $2 AND year = $3',
      [form, normalizedStream, parseInt(year)]
    );
    
    const subjectTeacherSignatures = {};
    subjectTeachersResult.rows.forEach((row) => {
      subjectTeacherSignatures[row.subject_code] = row.teacher_signature || '';
    });
    
    // Get school logo and stamp
    const logoResult = await query('SELECT * FROM school_logo WHERE id = 1');
    const stampResult = await query('SELECT * FROM school_stamp WHERE id = 1');
    const authorityResult = await query('SELECT * FROM authority_data WHERE id = 1');
    
    // Get student parish from parishes table if exists
    let studentParish = 'Not specified';
    try {
      const parishResult = await query(
        'SELECT parish_name FROM student_parishes WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4',
        [studentIndex, form, normalizedStream, parseInt(year)]
      );
      if (parishResult.rows.length > 0) {
        studentParish = parishResult.rows[0].parish_name || student.parish || student.parish_name || 'Not specified';
      } else {
        studentParish = student.parish || student.parish_name || 'Not specified';
      }
    } catch (e) {
      studentParish = student.parish || student.parish_name || 'Not specified';
    }
    
    // Get student fees debt from individual_debt table
    let studentFeesDebt = '0.00';
    try {
      const debtResult = await query(
        'SELECT amount, description FROM individual_debt WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4',
        [studentIndex, form, normalizedStream, parseInt(year)]
      );
      if (debtResult.rows.length > 0) {
        const debt = debtResult.rows[0];
        if (debt.amount && debt.description) {
          studentFeesDebt = `${parseFloat(debt.amount).toFixed(0)} - ${debt.description}`;
        } else if (debt.amount) {
          studentFeesDebt = parseFloat(debt.amount).toFixed(0);
        }
      }
    } catch (e) {
      studentFeesDebt = student.fees_debt || student.debt || '0.00';
    }
    
    // Get student photo
    // IMPORTANT: student_index must match photo management sorting (by name, not adm_no)
    let studentPhoto = null;
    try {
      // studentIndex is calculated above using name-based sorting to match photo management
      const photoResult = await query(
        'SELECT photo_filename FROM student_photos WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4',
        [studentIndex, form, normalizedStream, parseInt(year)]
      );
      if (photoResult.rows.length > 0 && photoResult.rows[0].photo_filename) {
        studentPhoto = photoResult.rows[0].photo_filename;
        console.log(`[REPORT] Found photo for student ${admNo}: ${studentPhoto} (student_index: ${studentIndex})`);
      } else {
        console.log(`[REPORT] No photo found for student ${admNo} (student_index: ${studentIndex}, level: ${form}, stream: ${normalizedStream}, year: ${year})`);
      }
    } catch (e) {
      console.error(`[REPORT] Error fetching photo for student ${admNo}:`, e.message);
      // Photo not found, use student.photo_filename if available
      studentPhoto = student.photo_filename || null;
    }
    
    // Get class fees announcements (if available) - filter by term
    let classFeesAnnouncements = {};
    try {
      // Try with term first (new format)
      let feesAnnouncementsResult;
      try {
        feesAnnouncementsResult = await query(
          'SELECT announcement_index, announcement_text FROM fees_announcements WHERE level = $1 AND stream = $2 AND year = $3 AND term = $4 ORDER BY announcement_index',
          [form, normalizedStream, parseInt(year), term]
        );
      } catch (e) {
        // If term column doesn't exist, fall back to old query (backward compatibility)
        if (e.message.includes('column') && e.message.includes('term')) {
          feesAnnouncementsResult = await query(
            'SELECT announcement_index, announcement_text FROM fees_announcements WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY announcement_index',
            [form, normalizedStream, parseInt(year)]
          );
        } else {
          throw e;
        }
      }
      
      feesAnnouncementsResult.rows.forEach((row) => {
        const index = row.announcement_index || (feesAnnouncementsResult.rows.indexOf(row) + 1).toString();
        classFeesAnnouncements[index.toString()] = row.announcement_text || '';
      });
    } catch (e) {
      // Fees announcements table doesn't exist or error occurred, use empty object
      console.log('Fees announcements not available:', e.message);
      classFeesAnnouncements = {};
    }
    
    
    // Calculate weighted totals per subject and build subjects data
    const subjectsData = {};
    let totalMarks = 0;
    
    subjectsResult.rows.forEach((subject) => {
      const monthScores = {};
      // Scores may be stored with either subject_code or subject_abbreviation
      // Try both to find matching scores
      const subjectCodesToMatch = [
        subject.subject_code,
        subject.subject_abbreviation
      ].filter(Boolean); // Remove null/undefined values
      
      months.forEach((month) => {
        const result = monthlyResult.rows.find(
          (r) => subjectCodesToMatch.includes(r.subject_code) && r.month === month
        );
        monthScores[month] = result ? parseFloat(result.score || 0) : 0;
      });
      
      const weightedTotal = calculateWeightedTotal(monthScores, months, marksConfig.month_weights || {});
      const grade = calculateGrade(weightedTotal, form);
      
      subjectsData[subject.subject_code] = {
        grade: grade,
        weighted_total: weightedTotal,
        name: subject.subject_name || subject.subject_code
      };
      
      totalMarks += weightedTotal;
    });
    
    // Calculate overall average
    const average = calculateOverallAverage(subjectsData);
    const grade = calculateGrade(average, form);
    
    // Calculate division point and division
    const isForm5Or6 = ['V', 'VI', '5', '6'].includes(formCode);
    let divisionPoint = null;
    let division = null;
    
    if (isForm5Or6) {
      // A-Level: Use 3 combination subjects
      divisionPoint = calculateALevelDivisionPoint(subjectsData, stream);
      division = getALevelDivision(divisionPoint);
    } else {
      // O-Level: Use 7 best subjects
      divisionPoint = calculateOLevelDivisionPoint(subjectsData);
      division = getOLevelDivision(divisionPoint);
    }
    
    res.json({
      student: {
        ...student,
        photo_path: studentPhoto
      },
      subjects: subjectsResult.rows,
      monthly_results: monthlyResult.rows,
      comments: commentsResult.rows,
      tabia_mwenendo: tabiaResult.rows,
      subject_rankings: subjectRankings,
      subject_teacher_signatures: subjectTeacherSignatures,
      overall_rank: overallRank,
      total_students: allStudentsResult.rows.length,
      marks_config: marksConfig,
      months: months,
      summary_data: {
        total_marks: totalMarks.toFixed(1),
        average: average.toFixed(1),
        grade: grade,
        division: division || '0',
        division_point: divisionPoint !== null ? divisionPoint.toString() : '0',
        position: overallRank.toString(),
        total_students: allStudentsResult.rows.length.toString()
      },
      school_logo: logoResult.rows[0] || null,
      school_stamp: stampResult.rows[0] || null,
      authority_data: authorityResult.rows[0] || null,
      student_parish: studentParish,
      student_fees_debt: studentFeesDebt,
      class_fees_announcements: classFeesAnnouncements
    });
  } catch (error) {
    console.error('Error fetching report data:', error);
    return sendError(res, error, 500);
  }
});

// Generate individual report PDF using Puppeteer
router.get('/individual/:form/:stream/:year/:term/:admNo/pdf', async (req, res) => {
  const { form, stream, year, term, admNo } = req.params;
  
  // Decode URL-encoded parameters (declare outside try for error handler access)
  let decodedForm, decodedStream, decodedTerm;
  try {
    decodedForm = decodeURIComponent(form).trim();
    decodedStream = decodeURIComponent(stream || '').trim();
    decodedTerm = decodeURIComponent(term).trim();
  } catch (decodeError) {
    return res.status(400).json({ 
      message: 'Invalid URL parameters',
      error: decodeError.message 
    });
  }
  
  try {
    console.log('PDF Generation Request (Puppeteer):', { 
      form: decodedForm, 
      stream: decodedStream, 
      year, 
      term: decodedTerm, 
      admNo 
    });
    
    // Import Puppeteer PDF generator
    const { generateIndividualReportPDFWithPuppeteer } = require('../utils/puppeteerPdfGenerator');
    
    // Get auth token from request (already authenticated via requireAuth middleware)
    const authHeader = req.headers.authorization;
    const authToken = authHeader ? (authHeader.split(' ')[1] || authHeader) : null;
    
    // Get API URL (use request protocol and host, or env variable)
    const apiUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
    
    const pdfBuffer = await generateIndividualReportPDFWithPuppeteer(
      decodedForm, 
      decodedStream, // Pass original stream - API endpoint will normalize it
      parseInt(year), 
      decodedTerm, 
      admNo,
      apiUrl,
      authToken
    );
    
    // Validate PDF buffer
    if (!pdfBuffer) {
      throw new Error('PDF buffer is null or undefined');
    }
    
    // Ensure it's a Buffer
    let buffer;
    if (Buffer.isBuffer(pdfBuffer)) {
      buffer = pdfBuffer;
    } else if (pdfBuffer instanceof Uint8Array) {
      buffer = Buffer.from(pdfBuffer);
    } else {
      buffer = Buffer.from(pdfBuffer);
    }
    
    if (buffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }
    
    // Verify it's a valid PDF (starts with %PDF)
    const firstBytes = buffer.slice(0, 4);
    if (firstBytes[0] !== 0x25 || firstBytes[1] !== 0x50 || firstBytes[2] !== 0x44 || firstBytes[3] !== 0x46) {
      console.error('Invalid PDF buffer received. First bytes:', buffer.slice(0, 20).toString('hex'));
      throw new Error('Generated file is not a valid PDF');
    }
    
    console.log(`Sending PDF: ${buffer.length} bytes`);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    const filename = `report_${admNo}_${year}_${decodedTerm.replace(/\s+/g, '_')}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send the buffer using end() with binary encoding for better compatibility
    res.end(buffer, 'binary');
  } catch (error) {
    console.error('PDF Generation Route Error:', error);
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        form: decodedForm,
        stream: decodedStream,
        year,
        term: decodedTerm,
        admNo
      });
    }
    return sendError(res, error, 500);
  }
});

// Get bulk report data - OPTIMIZED for large classes
router.get('/bulk/:form/:year/:term', async (req, res) => {
  try {
    const startTime = Date.now();
    const { form, year, term } = req.params;
    let { stream } = req.query;
    
    console.log(`[BULK REPORT] Starting generation for ${form} ${year} ${term}`);
    
    // Normalize stream: NA -> A
    if (stream) {
      stream = normalizeStream(stream);
    } else {
      // For Form I-IV, default to 'A' (normalized from 'NA')
      const formCode = form.replace('FORM ', '').trim();
      const isForm5Or6 = ['V', 'VI', '5', '6'].includes(formCode);
      if (!isForm5Or6) {
        stream = 'A'; // Normalized from 'NA'
      }
    }
    
    // Get months based on term
    const formCode = form.replace('FORM ', '').trim();
    const isForm5Or6 = ['V', 'VI', '5', '6'].includes(formCode);
    const getMonthsForTerm = (termParam) => {
      if (termParam === 'Term I' || termParam === 'Term 1') {
        return isForm5Or6 ? ['August', 'September', 'October', 'November'] : ['February', 'March', 'April', 'May'];
      } else {
        return isForm5Or6 ? ['January', 'February', 'March', 'April'] : ['August', 'September', 'October', 'November'];
      }
    };
    const months = getMonthsForTerm(term);
    
    // Get all students
    let queryText = 'SELECT * FROM students WHERE level = $1 AND year = $2';
    const params = [form, parseInt(year)];
    
    if (stream) {
      queryText += ' AND stream = $3';
      params.push(stream);
    }
    
    queryText += ' ORDER BY first_name, middle_name, adm_no';
    
    const studentsResult = await query(queryText, params);
    const students = studentsResult.rows;
    
    console.log(`[BULK REPORT] Loaded ${students.length} students`);
    
    if (students.length === 0) {
      return res.json({
        students: [],
        reports: [],
        subjects: [],
        total_students: 0
      });
    }
    
    // Get subjects
    const subjectsQuery = stream
      ? 'SELECT * FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY subject_code'
      : 'SELECT * FROM subjects WHERE level = $1 AND year = $2 ORDER BY subject_code';
    const subjectsParams = stream
      ? [form, stream, parseInt(year)]
      : [form, parseInt(year)];
    
    const subjectsResult = await query(subjectsQuery, subjectsParams);
    const subjects = subjectsResult.rows;
    console.log(`[BULK REPORT] Loaded ${subjects.length} subjects`);
    
    // OPTIMIZATION: Load ALL scores for ALL students in ONE batch query
    const allScoresLookup = {}; // {adm_no: {subject_code: {month: score}}}
    const batchStart = Date.now();
    
    const scoresQuery = stream
      ? `SELECT adm_no, subject_code, month, score FROM individual_scores 
         WHERE level = $1 AND stream = $2 AND year = $3 AND month = ANY($4::text[])
         ORDER BY adm_no, subject_code, month`
      : `SELECT adm_no, subject_code, month, score FROM individual_scores 
         WHERE level = $1 AND year = $2 AND month = ANY($3::text[])
         ORDER BY adm_no, subject_code, month`;
    const scoresParams = stream
      ? [form, stream, parseInt(year), months]
      : [form, parseInt(year), months];
    
    const scoresResult = await query(scoresQuery, scoresParams);
    console.log(`[BULK REPORT] Loaded ${scoresResult.rows.length} score records in ${Date.now() - batchStart}ms`);
    
    // Build lookup dictionary
    scoresResult.rows.forEach((row) => {
      const admNo = row.adm_no;
      const subjectCode = row.subject_code;
      const month = row.month;
      const score = parseFloat(row.score || 0);
      
      if (!allScoresLookup[admNo]) {
        allScoresLookup[admNo] = {};
      }
      if (!allScoresLookup[admNo][subjectCode]) {
        allScoresLookup[admNo][subjectCode] = {};
      }
      allScoresLookup[admNo][subjectCode][month] = score;
    });
    
    // OPTIMIZATION: Load ALL comments in ONE batch query
    const allCommentsLookup = {}; // {student_index: {comment_type: value}}
    const commentTypes = ['sala', 'huduma', 'tabia', 'michezo', 'mwalimu_taaluma', 'mkuu_shule', 'taaluma'];
    
    // Get student indices (sorted adm_no list)
    const sortedAdmNos = students.map(s => s.adm_no).sort();
    const admNoToIndex = {};
    sortedAdmNos.forEach((admNo, idx) => {
      admNoToIndex[admNo] = (idx + 1).toString();
    });
    
    const commentsQuery = stream
      ? `SELECT student_index, comment_type, comment_text FROM comments 
         WHERE level = $1 AND stream = $2 AND year = $3 AND term = $4 
         AND comment_type = ANY($5::text[])
         ORDER BY student_index, comment_type`
      : `SELECT student_index, comment_type, comment_text FROM comments 
         WHERE level = $1 AND year = $2 AND term = $3 
         AND comment_type = ANY($4::text[])
         ORDER BY student_index, comment_type`;
    const commentsParams = stream
      ? [form, stream, parseInt(year), term, commentTypes]
      : [form, parseInt(year), term, commentTypes];
    
    try {
      const commentsResult = await query(commentsQuery, commentsParams);
      console.log(`[BULK REPORT] Loaded ${commentsResult.rows.length} comments in batch`);
      
      commentsResult.rows.forEach((row) => {
        const studentIndex = row.student_index;
        const commentType = row.comment_type;
        const commentText = row.comment_text || '';
        
        if (!allCommentsLookup[studentIndex]) {
          allCommentsLookup[studentIndex] = {};
        }
        allCommentsLookup[studentIndex][commentType] = commentText;
      });
    } catch (e) {
      console.log('[BULK REPORT] Comments table not available:', e.message);
    }
    
    // Get marks configuration
    let marksConfig = {
      month_weights: {
        February: 40.0, March: 0.0, April: 40.0, May: 20.0,
        August: 40.0, September: 0.0, October: 40.0, November: 20.0,
        January: 40.0
      }
    };
    
    try {
      const marksConfigResult = await query('SELECT * FROM marks_config WHERE id = 1');
      if (marksConfigResult.rows.length > 0) {
        const config = marksConfigResult.rows[0];
        marksConfig = {
          month_weights: {
            February: parseFloat(config.february_weight || 40.0),
            March: parseFloat(config.march_weight || 0.0),
            April: parseFloat(config.april_weight || 40.0),
            May: parseFloat(config.may_weight || 20.0),
            August: parseFloat(config.august_weight || 40.0),
            September: parseFloat(config.september_weight || 0.0),
            October: parseFloat(config.october_weight || 40.0),
            November: parseFloat(config.november_weight || 20.0),
            January: parseFloat(config.january_weight || 40.0)
          }
        };
      }
    } catch (e) {
      console.log('[BULK REPORT] Marks config not available, using defaults');
    }
    
    // Process each student's report data
    const studentReports = [];
    const processStart = Date.now();
    
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const studentIndex = admNoToIndex[student.adm_no] || (i + 1).toString();
      
      // Get student's scores
      const studentScores = allScoresLookup[student.adm_no] || {};
      
      // Calculate subject data
      const subjectsData = {};
      let totalMarks = 0;
      
      subjects.forEach((subject) => {
        const subjectCodesToMatch = [
          subject.subject_code,
          subject.subject_abbreviation
        ].filter(Boolean);
        
        const monthScores = {};
        months.forEach((month) => {
          let score = 0;
          for (const code of subjectCodesToMatch) {
            if (studentScores[code] && studentScores[code][month] !== undefined) {
              score = studentScores[code][month];
              break;
            }
          }
          monthScores[month] = score;
        });
        
        const weightedTotal = calculateWeightedTotal(monthScores, months, marksConfig.month_weights || {});
        const grade = calculateGrade(weightedTotal, form);
        
        subjectsData[subject.subject_code] = {
          grade: grade,
          weighted_total: weightedTotal,
          name: subject.subject_name || subject.subject_code
        };
        
        totalMarks += weightedTotal;
      });
      
      // Calculate overall average
      const average = calculateOverallAverage(subjectsData);
      const overallGrade = calculateGrade(average, form);
      
      // Get comments for this student
      const studentComments = allCommentsLookup[studentIndex] || {};
      
      // Build report data
      studentReports.push({
        student: {
          ...student,
          student_index: studentIndex
        },
        subjects_data: subjectsData,
        monthly_results: Object.keys(studentScores).flatMap(subjectCode => 
          Object.keys(studentScores[subjectCode] || {}).map(month => ({
            adm_no: student.adm_no,
            subject_code: subjectCode,
            month: month,
            score: studentScores[subjectCode][month]
          }))
        ),
        comments: studentComments,
        summary_data: {
          total_marks: totalMarks.toFixed(1),
          average: average.toFixed(1),
          grade: overallGrade
        }
      });
      
      // Log progress every 10 students
      if ((i + 1) % 10 === 0) {
        console.log(`[BULK REPORT] Processed ${i + 1}/${students.length} students in ${Date.now() - processStart}ms`);
      }
    }
    
    console.log(`[BULK REPORT] Data preparation complete: ${studentReports.length} reports in ${Date.now() - processStart}ms`);
    console.log(`[BULK REPORT] TOTAL TIME: ${Date.now() - startTime}ms`);
    
    res.json({
      students: students,
      reports: studentReports,
      subjects: subjects,
      total_students: students.length,
      months: months,
      marks_config: marksConfig
    });
  } catch (error) {
    console.error('[BULK REPORT] Error:', error);
    return sendError(res, error, 500);
  }
});

// Generate bulk report PDF - Uses batch generation with Puppeteer
router.get('/bulk/:form/:year/:term/pdf', async (req, res) => {
  try {
    const { form, year, term } = req.params;
    let { stream, batchSize } = req.query;
    
    console.log(`[BULK PDF] Starting bulk PDF generation for ${form} ${year} ${term}`);
    
    // Normalize stream: NA -> A
    if (stream) {
      stream = normalizeStream(stream);
    } else {
      // For Form I-IV, default to 'A' (normalized from 'NA')
      const formCode = form.replace('FORM ', '').trim();
      const isForm5Or6 = ['V', 'VI', '5', '6'].includes(formCode);
      if (!isForm5Or6) {
        stream = 'A'; // Normalized from 'NA'
      }
    }
    
    // Get all students
    let queryText = 'SELECT * FROM students WHERE level = $1 AND year = $2';
    const params = [form, parseInt(year)];
    
    if (stream) {
      queryText += ' AND stream = $3';
      params.push(stream);
    }
    
    queryText += ' ORDER BY first_name, middle_name, adm_no';
    
    const studentsResult = await query(queryText, params);
    const students = studentsResult.rows;
    
    if (students.length === 0) {
      return res.status(404).json({ message: 'No students found for this class' });
    }
    
    console.log(`[BULK PDF] Found ${students.length} students`);
    
    // Get auth token from request headers
    const authHeader = req.headers.authorization;
    const authToken = authHeader ? (authHeader.split(' ')[1] || authHeader) : null;
    
    // Get API URL
    const apiUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
    
    // Import batch generator (now uses Python-style approach: one HTML, one PDF)
    const { generateBulkReportPDFWithBatches } = require('../utils/bulkPdfGenerator');
    
    // Generate PDF using Python-style approach: Generate ONE HTML with all reports, then convert to PDF
    const pdfBuffer = await generateBulkReportPDFWithBatches(
      form,
      stream,
      parseInt(year),
      term,
      students,
      apiUrl,
      authToken
    );
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bulk_report_${form}_${year}_${term}${stream ? '_' + stream : ''}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[BULK PDF] Error:', error);
    return sendError(res, error, 500);
  }
});

// Export report as CSV
router.get('/individual/:form/:stream/:year/:term/:admNo/csv', async (req, res) => {
  try {
    const { form, stream, year, term, admNo } = req.params;
    
    // Get report data (same as PDF endpoint)
    const reportData = await getReportData(form, stream, parseInt(year), term, admNo);
    
    // Generate CSV
    let csv = 'Student Report\n';
    csv += `Admission Number,${reportData.student.adm_no}\n`;
    csv += `Name,${reportData.student.first_name} ${reportData.student.middle_name || ''} ${reportData.student.surname}\n`;
    csv += `Class,${form} ${stream}\n`;
    csv += `Year,${year}\n`;
    csv += `Term,${term}\n\n`;
    csv += 'Subject,Score\n';
    
    reportData.scores.forEach(score => {
      const subject = reportData.subjects.find(s => s.subject_code === score.subject_code);
      csv += `${subject ? subject.subject_name : score.subject_code},${score.score}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report_${admNo}_${year}_${term}.csv"`);
    res.send(csv);
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Helper function to get report data
async function getReportData(form, stream, year, term, admNo) {
  // Normalize stream: NA -> A
  const normalizedStream = normalizeStream(stream);
  
  const studentResult = await query(
    'SELECT * FROM students WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4',
    [admNo, form, normalizedStream, year]
  );
  
  const scoresResult = await query(
    'SELECT * FROM individual_scores WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4',
    [admNo, form, normalizedStream, year]
  );
  
  const subjectsResult = await query(
    'SELECT * FROM subjects WHERE level = $1 AND stream = $2 AND year = $3',
    [form, normalizedStream, year]
  );
  
  return {
    student: studentResult.rows[0],
    scores: scoresResult.rows,
    subjects: subjectsResult.rows
  };
}

module.exports = router;
