/**
 * Student Management Routes - Full Functionality
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { requireAuth } = require('../middleware/auth');
const { query, withTransaction } = require('../config/database');
const { saveUserActivity } = require('../utils/activityLogger');
const { generatePhotoEntryFormPDF, generateMonthlyResultsPDF } = require('../utils/pdfGenerator');
const { normalizeStream } = require('../utils/streamNormalizer');
const { sendError } = require('../utils/safeError');

// Term variants so DELETE matches both "Term I" and "Term 1" (and II/2, etc.) in DB
function getTermMatchValues(term) {
  const t = term != null ? String(term).trim() : '';
  const variants = [t];
  if (/^Term\s+I$/i.test(t) || /^Term\s+1$/i.test(t)) { variants.push('Term I', 'Term 1'); }
  else if (/^Term\s+II$/i.test(t) || /^Term\s+2$/i.test(t)) { variants.push('Term II', 'Term 2'); }
  else if (/^Term\s+III$/i.test(t) || /^Term\s+3$/i.test(t)) { variants.push('Term III', 'Term 3'); }
  else if (/^Term\s+IV$/i.test(t) || /^Term\s+4$/i.test(t)) { variants.push('Term IV', 'Term 4'); }
  return [...new Set(variants)];
}

// Level variants so DELETE matches "FORM III" and "FORM 3" (and Form III, etc.) in DB
function getLevelMatchValues(level) {
  const L = level != null ? String(level).trim().toUpperCase() : '';
  const variants = [L];
  if (/^FORM\s+I$/.test(L)) variants.push('FORM I', 'FORM 1');
  else if (/^FORM\s+II$/.test(L)) variants.push('FORM II', 'FORM 2');
  else if (/^FORM\s+III$/.test(L)) variants.push('FORM III', 'FORM 3');
  else if (/^FORM\s+IV$/.test(L)) variants.push('FORM IV', 'FORM 4');
  else if (/^FORM\s+V$/.test(L)) variants.push('FORM V', 'FORM 5');
  else if (/^FORM\s+VI$/.test(L)) variants.push('FORM VI', 'FORM 6');
  return [...new Set(variants)];
}

// All student routes require authentication
router.use(requireAuth);

// Configure multer for student photos (use absolute path so it matches server's static serve location)
const photosUploadDir = path.join(__dirname, '..', 'static', 'uploads', 'photos');
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(photosUploadDir, { recursive: true });
    cb(null, photosUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Separate multer config for CSV uploads (no file filter, accepts CSV files)
const csvUploadDir = path.join(__dirname, '..', 'static', 'uploads', 'csv');
const csvStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(csvUploadDir, { recursive: true });
    cb(null, csvUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'csv-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const csvUpload = multer({ 
  storage: csvStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    // Accept CSV files
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Get available years
router.get('/years', async (req, res) => {
  try {
    const { level, stream } = req.query;
    let queryText = 'SELECT DISTINCT year FROM students WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (level) {
      queryText += ` AND level = $${paramCount++}`;
      params.push(level);
    }
    if (stream && stream !== 'NA') {
      queryText += ` AND stream = $${paramCount++}`;
      params.push(stream);
    }
    
    queryText += ' ORDER BY year DESC';
    
    const result = await query(queryText, params);
    const years = result.rows.map(row => row.year);
    
    res.json({ years });
  } catch (error) {
    console.error('Error fetching years:', error);
    return sendError(res, error, 500);
  }
});

// Get students with filters.
// Used by score entry and others: returns ALL registered students for the requested class (level, stream, year).
// Do not filter by user allocation here; access to which class a user can request is enforced by the frontend.
// For FORM I-IV, match both stream 'A' and 'NA' so all registered students in that class are returned.
router.get('/', async (req, res) => {
  try {
    const { level, stream, year, search } = req.query;
    let queryText = 'SELECT * FROM students WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (level && level.trim()) {
      // Normalize level to uppercase for case-insensitive comparison
      const normalizedLevel = level.trim().toUpperCase();
      queryText += ` AND level = $${paramCount}`;
      params.push(normalizedLevel);
      paramCount++;
    }
    if (stream && stream.trim()) {
      const normalizedStream = normalizeStream(stream.trim());
      // FORM I-IV: return students with stream A or NA so all registered in that class are visible (e.g. score entry)
      const isFormIV = level && /^FORM\s+(I|II|III|IV)$/i.test(level.trim());
      if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
        queryText += ` AND (stream = $${paramCount} OR stream = $${paramCount + 1})`;
        params.push('A', 'NA');
        paramCount += 2;
      } else {
        queryText += ` AND stream = $${paramCount++}`;
        params.push(normalizedStream);
      }
    }
    if (year) {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum) && yearNum > 0) {
        // Frontend already converts display year to API year for FORM V/VI
        // So we just use the year parameter directly
        queryText += ` AND year = $${paramCount++}`;
        params.push(yearNum);
      }
    }
    if (search && search.trim()) {
      queryText += ` AND (adm_no ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR surname ILIKE $${paramCount})`;
      params.push(`%${search.trim()}%`);
      paramCount++;
    }
    
    // Sort students by name: first_name, then middle_name, then surname (A-Z)
    // This applies to all student pages except result templates
    queryText += ' ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC';
    // Limit per request for fast loading (default 500; allow up to 2000 for large classes / 2000+ students across years)
    const requestedLimit = parseInt(req.query.limit, 10);
    const maxStudents = Math.min(isNaN(requestedLimit) ? 500 : requestedLimit, 2000);
    queryText += ` LIMIT ${maxStudents}`;
    
    // Debug logging for Form V/VI queries
    if (level && (level.toUpperCase().includes('FORM V') || level.toUpperCase().includes('FORM VI'))) {
      console.log('Form V/VI Student Query:', {
        level: level.trim().toUpperCase(),
        stream: stream ? normalizeStream(stream.trim()) : 'none',
        year: year ? parseInt(year) : 'none',
        query: queryText,
        params: params
      });
    }
    
    const result = await query(queryText, params);
    
    // Debug logging for Form V/VI results
    if (level && (level.toUpperCase().includes('FORM V') || level.toUpperCase().includes('FORM VI'))) {
      console.log(`Found ${result.rows.length} students for ${level.trim().toUpperCase()} ${stream ? normalizeStream(stream.trim()) : ''} ${year || ''}`);
    }
    
    res.json({ students: result.rows || [] });
  } catch (error) {
    console.error('Error fetching students:', error);
    return sendError(res, error, 500);
  }
});

// ========== CSV OPERATIONS ==========

// Download CSV template
router.get('/template', async (req, res) => {
  try {
    const { level, stream, year } = req.query;
    
    if (!level || !stream || !year) {
      return res.status(400).json({ message: 'level, stream, and year are required' });
    }
    
    // CSV template with headers and 2 example rows
    const csvHeaders = ['Adm No', 'First Name', 'Middle Name', 'Surname', 'Sex'];
    const exampleRows = [
      ['ADM001', 'John', 'Michael', 'Doe', 'Male'],
      ['ADM002', 'Jane', 'Elizabeth', 'Smith', 'Female']
    ];
    
    // Create CSV content
    let csvContent = csvHeaders.join(',') + '\r\n';
    exampleRows.forEach(row => {
      csvContent += row.join(',') + '\r\n';
    });
    
    // Add UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    csvContent = BOM + csvContent;
    
    const filename = `student_template_${level}_${stream}_${year}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error downloading template:', error);
    return sendError(res, error, 500);
  }
});

// Download registered students CSV
router.get('/export', async (req, res) => {
  try {
    const { level, stream, year } = req.query;
    
    if (!level || !stream || !year) {
      return res.status(400).json({ message: 'level, stream, and year are required' });
    }
    
    // Normalize stream: NA -> A
    const normalizedStream = normalizeStream(stream);
    
    // Fetch students
    const result = await query(
      'SELECT * FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY adm_no',
      [level, normalizedStream, parseInt(year)]
    );
    
    // CSV headers
    const csvHeaders = ['S/N', 'Adm No', 'First Name', 'Middle Name', 'Surname', 'Sex', 'Year'];
    
    // Create CSV content
    let csvContent = csvHeaders.join(',') + '\r\n';
    result.rows.forEach((student, index) => {
      const row = [
        index + 1,
        student.adm_no,
        student.first_name,
        student.middle_name || '',
        student.surname,
        student.sex,
        student.year
      ];
      // Escape commas and quotes in values
      csvContent += row.map(val => {
        const str = String(val || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',') + '\r\n';
    });
    
    // Add UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    csvContent = BOM + csvContent;
    
    const filename = `registered_students_${level}_${stream}_${year}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== SCORE ENTRY CSV (template download + bulk upload) ==========
// Must be before /:admNo so /scores/template is not matched as admNo

router.get('/scores/template', async (req, res) => {
  try {
    let { level, stream, year, month, subject_code } = req.query;
    if (!level || !stream || !year || !month || !subject_code) {
      return res.status(400).json({ message: 'level, stream, year, month, and subject_code are required' });
    }
    level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim();
    month = decodeURIComponent(String(month).replace(/\+/g, ' ')).trim();
    subject_code = String(subject_code).trim();
    const normalizedLevel = level.toUpperCase();
    const normalizedStream = normalizeStream(stream.trim());
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) return res.status(400).json({ message: 'Invalid year' });

    const isFormIV = /^FORM\s+(I|II|III|IV)$/i.test(normalizedLevel);
    let studentsResult;
    if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
      studentsResult = await query(
        'SELECT * FROM students WHERE level = $1 AND (stream = $2 OR stream = $3) AND year = $4 ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC',
        [normalizedLevel, 'A', 'NA', yearNum]
      );
    } else {
      studentsResult = await query(
        'SELECT * FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC',
        [normalizedLevel, normalizedStream, yearNum]
      );
    }
    const students = studentsResult.rows || [];

    let subjectCodesToSearch = [subject_code];
    try {
      const isFormVOrVI = normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI';
      const lookupStream = isFormVOrVI ? normalizedStream : 'A';
      const subjRes = await query(
        'SELECT subject_code, subject_abbreviation FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND (subject_code = $5 OR subject_abbreviation = $5) LIMIT 1',
        [normalizedLevel, normalizedStream, 'NA', yearNum, subject_code]
      );
      if (subjRes.rows.length > 0 && (subjRes.rows[0].subject_code || subjRes.rows[0].subject_abbreviation)) {
        subjectCodesToSearch = [subjRes.rows[0].subject_code, subjRes.rows[0].subject_abbreviation].filter(Boolean);
      }
    } catch (_) {}
    const codesCondition = subjectCodesToSearch.length === 1
      ? 'subject_code = $6'
      : subjectCodesToSearch.map((_, i) => `subject_code = $${6 + i}`).join(' OR ');
    const scoreParams = [normalizedLevel, normalizedStream, 'NA', yearNum, month, ...subjectCodesToSearch];
    const scoresResult = await query(
      `SELECT adm_no, score FROM individual_scores WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = $5 AND (${codesCondition})`,
      scoreParams
    );
    const scoresByAdm = {};
    (scoresResult.rows || []).forEach((r) => { scoresByAdm[r.adm_no] = parseFloat(r.score); });

    const escapeCsv = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };
    const headers = ['Adm No', 'First Name', 'Middle Name', 'Surname', 'Score'];
    let csvContent = headers.join(',') + '\r\n';
    students.forEach((s) => {
      const score = scoresByAdm[s.adm_no] != null ? scoresByAdm[s.adm_no] : '';
      csvContent += [s.adm_no, s.first_name || '', s.middle_name || '', s.surname || '', score].map(escapeCsv).join(',') + '\r\n';
    });
    const BOM = '\uFEFF';
    csvContent = BOM + csvContent;
    const filename = `score_entry_${normalizedLevel}_${normalizedStream}_${year}_${String(month).replace(/\s/g, '_')}_${subject_code}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error downloading score template:', error);
    return sendError(res, error, 500);
  }
});

router.post('/scores/bulk-upload', csvUpload.single('file'), async (req, res) => {
  try {
    let { level, stream, year, month, subject_code } = req.body;
    if (!level || !stream || !year || !month || !subject_code) {
      return res.status(400).json({ message: 'level, stream, year, month, and subject_code are required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required' });
    }

    const userRole = (req.user && req.user.role) ? String(req.user.role).toLowerCase() : '';
    const isAdmin = ['admin', 'superadmin'].includes(userRole);
    if (!isAdmin && req.user && req.user.permissions) {
      const perms = typeof req.user.permissions === 'string' ? JSON.parse(req.user.permissions) : req.user.permissions;
      const allowedMonths = perms.score_entry_months;
      if (Array.isArray(allowedMonths) && allowedMonths.length > 0) {
        const monthNorm = String(month).trim();
        if (!allowedMonths.includes(monthNorm)) {
          return res.status(403).json({ message: 'You are not allowed to enter scores for this month.' });
        }
      }
    }

    level = String(level).replace(/\+/g, ' ').trim().toUpperCase();
    const normalizedStream = normalizeStream(String(stream).trim());
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) return res.status(400).json({ message: 'Invalid year' });

    const fs = require('fs').promises;
    let fileContent = await fs.readFile(req.file.path, 'utf-8');
    await fs.unlink(req.file.path).catch(() => {});
    fileContent = fileContent.replace(/^\uFEFF/, '');
    const lines = fileContent.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      return res.status(400).json({ message: 'CSV must contain a header row and at least one data row' });
    }
    const headerLine = lines[0];
    const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const admNoIdx = headers.findIndex((h) => h.toLowerCase().replace(/\s/g, '').includes('admno') || (h.toLowerCase().includes('adm') && h.toLowerCase().includes('no')));
    const scoreIdx = headers.findIndex((h) => h.toLowerCase().includes('score'));
    if (admNoIdx === -1 || scoreIdx === -1) {
      return res.status(400).json({ message: 'CSV must contain columns: Adm No and Score' });
    }
    const isFormVOrVI = level === 'FORM V' || level === 'FORM VI';
    const subjectLookupStream = isFormVOrVI ? normalizedStream : 'A';
    let scoreSubjectCode = subject_code;
    try {
      if (/^\d+$/.test(String(subject_code).trim())) {
        const subjRes = await query(
          'SELECT subject_abbreviation FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 AND subject_code = $4 LIMIT 1',
          [level, subjectLookupStream, yearNum, subject_code]
        );
        if (subjRes.rows.length > 0 && subjRes.rows[0].subject_abbreviation) {
          scoreSubjectCode = subjRes.rows[0].subject_abbreviation;
        }
      }
    } catch (_) {}

    const parseCsvLine = (line) => {
      const values = [];
      let current = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (c === '"') {
          if (inQuotes && line[j + 1] === '"') { current += '"'; j++; } else inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else current += c;
      }
      values.push(current.trim().replace(/^"|"$/g, ''));
      return values;
    };

    let studentsInClass;
    const isFormIVBulk = /^FORM\s+(I|II|III|IV)$/i.test(level);
    if (isFormIVBulk && (normalizedStream === 'A' || normalizedStream === 'NA')) {
      studentsInClass = await query(
        'SELECT adm_no FROM students WHERE level = $1 AND (stream = $2 OR stream = $3) AND year = $4',
        [level, 'A', 'NA', yearNum]
      );
    } else {
      studentsInClass = await query(
        'SELECT adm_no FROM students WHERE level = $1 AND stream = $2 AND year = $3',
        [level, normalizedStream, yearNum]
      );
    }
    const validAdmNos = new Set((studentsInClass.rows || []).map((r) => r.adm_no));

    let saved = 0;
    const errors = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const admNo = (values[admNoIdx] || '').trim();
      const scoreRaw = (values[scoreIdx] ?? '').trim();
      if (!admNo) continue;
      if (!validAdmNos.has(admNo)) {
        errors.push({ row: i + 1, adm_no: admNo, error: 'Student not in this class' });
        continue;
      }
      const scoreNum = parseFloat(scoreRaw);
      if (scoreRaw !== '' && (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100)) {
        errors.push({ row: i + 1, adm_no: admNo, error: 'Score must be 0–100' });
        continue;
      }
      if (scoreRaw === '' || isNaN(scoreNum)) continue;
      try {
        await query(
          `INSERT INTO individual_scores (level, stream, year, month, subject_code, adm_no, score)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (level, stream, year, month, subject_code, adm_no)
           DO UPDATE SET score = EXCLUDED.score, updated_at = NOW()`,
          [level, normalizedStream, yearNum, String(month).trim(), scoreSubjectCode, admNo, scoreNum]
        );
        saved++;
      } catch (err) {
        errors.push({ row: i + 1, adm_no: admNo, error: err.message || 'Save failed' });
      }
    }
    res.json({ message: `Saved ${saved} score(s)`, saved, errors: errors.slice(0, 50) });
  } catch (error) {
    console.error('Score bulk-upload error:', error);
    return sendError(res, error, 500);
  }
});

// ========== MARKS CONFIG OPERATIONS ==========
// NOTE: These routes MUST come BEFORE router.get('/:admNo') to avoid route conflicts

// Get marks config
router.get('/marks-config', async (req, res) => {
  try {
    const result = await query('SELECT * FROM marks_config ORDER BY month');
    
    // Convert to object mapping month to weight
    const monthWeights = {};
    result.rows.forEach(row => {
      monthWeights[row.month] = parseFloat(row.weight);
    });
    
    res.json({ month_weights: monthWeights });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save marks config
router.post('/marks-config', async (req, res) => {
  try {
    const { month_weights } = req.body;
    
    if (!month_weights || typeof month_weights !== 'object') {
      return res.status(400).json({ message: 'month_weights object is required' });
    }
    
    // Validate total is 100%
    const total = Object.values(month_weights).reduce((sum, weight) => sum + parseFloat(weight || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      return res.status(400).json({ message: `Total weights must equal 100%. Current total: ${total}%` });
    }
    
    // Save each month weight
    for (const [month, weight] of Object.entries(month_weights)) {
      await query(
        `INSERT INTO marks_config (month, weight)
         VALUES ($1, $2)
         ON CONFLICT (month)
         DO UPDATE SET weight = EXCLUDED.weight, updated_at = NOW()`,
        [month, parseFloat(weight)]
      );
    }
    
    res.json({ message: 'Marks configuration saved successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get class grades (grade of average of weighted totals per student) for Comments pages
// MUST be before /:admNo or "class-grades" is matched as admNo and returns 404
router.get('/class-grades', async (req, res) => {
  try {
    const { calculateWeightedTotal, calculateGrade, calculateOverallAverage } = require('../utils/calculations');
    let { level, stream, year, term } = req.query;
    if (level) level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    if (!level || !stream || !year || !term) {
      return res.status(400).json({ message: 'level, stream, year, and term are required' });
    }
    const normalizedStream = normalizeStream(stream);
    const getMonthsForTerm = (t) => (t === 'Term I' || t === 'Term 1' ? ['February', 'March', 'April', 'May'] : ['August', 'September', 'October', 'November']);
    const months = getMonthsForTerm(term);

    let marksConfig = { month_weights: { February: 40, March: 0, April: 40, May: 20, August: 40, September: 0, October: 40, November: 20 } };
    try {
      const mc = await query('SELECT * FROM marks_config WHERE id = 1');
      if (mc.rows.length > 0) {
        const c = mc.rows[0];
        marksConfig = { month_weights: { February: parseFloat(c.february_weight) || 40, March: parseFloat(c.march_weight) || 0, April: parseFloat(c.april_weight) || 40, May: parseFloat(c.may_weight) || 20, August: parseFloat(c.august_weight) || 40, September: parseFloat(c.september_weight) || 0, October: parseFloat(c.october_weight) || 40, November: parseFloat(c.november_weight) || 20 } };
      }
    } catch (e) { /* use defaults */ }

    const studentsResult = await query(
      `SELECT adm_no FROM students WHERE level = $1 AND stream IN ($2, $3) AND year = $4 ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC`,
      [level, normalizedStream, 'NA', parseInt(year)]
    );
    const subjectsResult = await query(
      'SELECT subject_code, subject_abbreviation, subject_name FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4',
      [level, normalizedStream, 'NA', parseInt(year)]
    );
    const scoresResult = await query(
      'SELECT adm_no, subject_code, month, score FROM individual_scores WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = ANY($5::text[])',
      [level, normalizedStream, 'NA', parseInt(year), months]
    );

    const scoresByAdm = {};
    scoresResult.rows.forEach((r) => {
      if (!scoresByAdm[r.adm_no]) scoresByAdm[r.adm_no] = {};
      const code = r.subject_code;
      if (!scoresByAdm[r.adm_no][code]) scoresByAdm[r.adm_no][code] = {};
      scoresByAdm[r.adm_no][code][r.month] = parseFloat(r.score) || 0;
    });

    const form = level;
    const grades = {};
    studentsResult.rows.forEach((row) => {
      const admNo = row.adm_no;
      const studentScores = scoresByAdm[admNo] || {};
      const subjectsData = {};
      subjectsResult.rows.forEach((subject) => {
        const codes = [subject.subject_code, subject.subject_abbreviation].filter(Boolean);
        const monthScores = {};
        months.forEach((m) => {
          let s = 0;
          for (const code of codes) {
            if (studentScores[code] && studentScores[code][m] !== undefined) {
              s = studentScores[code][m];
              break;
            }
          }
          monthScores[m] = s;
        });
        const weightedTotal = calculateWeightedTotal(monthScores, months, marksConfig.month_weights || {});
        const grade = calculateGrade(weightedTotal, form);
        subjectsData[subject.subject_code] = { grade, weighted_total: weightedTotal };
      });
      const average = calculateOverallAverage(subjectsData);
      const overallGrade = calculateGrade(average, form);
      grades[admNo] = overallGrade;
    });

    res.json({ grades });
  } catch (error) {
    console.error('Error fetching class grades:', error);
    return sendError(res, error, 500);
  }
});

// Get single student
router.get('/:admNo', async (req, res) => {
  try {
    const { admNo } = req.params;
    let { level, stream, year } = req.query;
    
    // Normalize level to uppercase
    if (level) {
      level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    // Normalize stream: NA -> A
    const normalizedStream = stream ? normalizeStream(stream.trim()) : null;
    
    let queryText = 'SELECT * FROM students WHERE adm_no = $1';
    const params = [admNo];
    let paramCount = 2;
    
    if (level) {
      queryText += ` AND level = $${paramCount++}`;
      params.push(level);
    }
    if (stream) {
      // Check both normalized stream and original stream for backward compatibility
      const streamsToCheck = normalizedStream === 'A' ? ['A', 'NA'] : [normalizedStream];
      const uniqueStreams = [...new Set(streamsToCheck)];
      
      if (uniqueStreams.length === 1) {
        queryText += ` AND stream = $${paramCount++}`;
        params.push(uniqueStreams[0]);
      } else {
        queryText += ` AND stream IN ($${paramCount++}, $${paramCount++})`;
        params.push(uniqueStreams[0], uniqueStreams[1]);
      }
    }
    if (year) {
      queryText += ` AND year = $${paramCount++}`;
      params.push(parseInt(year));
    }
    
    const result = await query(queryText, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.json({ student: result.rows[0] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Create student
router.post('/', async (req, res) => {
  try {
    const { adm_no, first_name, middle_name, surname, sex, level, stream, year, status } = req.body;
    
    if (!adm_no || !first_name || !surname || !sex || !level || !stream || !year) {
      return res.status(400).json({ message: 'Required fields: adm_no, first_name, surname, sex, level, stream, year' });
    }
    
    const result = await query(
      `INSERT INTO students (adm_no, first_name, middle_name, surname, sex, level, stream, year, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (adm_no, level, stream, year) 
       DO UPDATE SET first_name = EXCLUDED.first_name, middle_name = EXCLUDED.middle_name,
                     surname = EXCLUDED.surname, sex = EXCLUDED.sex, status = EXCLUDED.status
       RETURNING *`,
      [adm_no, first_name, middle_name || null, surname, sex, level, stream, parseInt(year), status || 'PENDING']
    );
    
    // Log activity
    if (req.user?.username) {
      await saveUserActivity({
        username: req.user.username,
        activity_type: 'student_created',
        description: `Created student: ${first_name} ${surname} (${adm_no})`,
        details: { adm_no, level, stream, year }
      });
    }
    
    res.status(201).json({ student: result.rows[0], message: 'Student created successfully' });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Student already exists for this class and year' });
    }
    return sendError(res, error, 500);
  }
});

// Update student
router.put('/:admNo', async (req, res) => {
  try {
    const { admNo } = req.params;
    const { level, stream, year } = req.query;
    const { first_name, middle_name, surname, sex, status } = req.body;
    
    let queryText = 'UPDATE students SET';
    const updates = [];
    const params = [];
    let paramCount = 1;
    
    if (first_name) {
      updates.push(`first_name = $${paramCount++}`);
      params.push(first_name);
    }
    if (middle_name !== undefined) {
      updates.push(`middle_name = $${paramCount++}`);
      params.push(middle_name);
    }
    if (surname) {
      updates.push(`surname = $${paramCount++}`);
      params.push(surname);
    }
    if (sex) {
      updates.push(`sex = $${paramCount++}`);
      params.push(sex);
    }
    if (status) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    queryText += ' ' + updates.join(', ') + ' WHERE adm_no = $' + paramCount++;
    params.push(admNo);
    
    if (level) {
      queryText += ` AND level = $${paramCount++}`;
      params.push(level);
    }
    if (stream) {
      queryText += ` AND stream = $${paramCount++}`;
      params.push(stream);
    }
    if (year) {
      queryText += ` AND year = $${paramCount++}`;
      params.push(parseInt(year));
    }
    
    queryText += ' RETURNING *';
    
    const result = await query(queryText, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.json({ student: result.rows[0], message: 'Student updated successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete student parish (clears the parish name instead of deleting the record)
// NOTE: This route MUST come BEFORE router.delete('/:admNo') to avoid route conflicts
// Express matches routes in order, so specific routes must come before parameterized routes
router.delete('/parishes', async (req, res) => {
  try {
    let { level, stream, year, student_index } = req.query;
    
    // Normalize level to uppercase and handle URL encoding (same as GET endpoint)
    if (level) {
      level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    if (!level || !level.trim() || !stream || !year || student_index === undefined || student_index === null) {
      return res.status(400).json({ message: 'level, stream, year, and student_index are required' });
    }
    
    const studentIndexNum = parseInt(student_index);
    if (isNaN(studentIndexNum)) {
      return res.status(400).json({ message: 'student_index must be a valid number' });
    }
    
    // Normalize stream: NA -> A
    const normalizedStream = normalizeStream(stream);
    
    // Check both normalized stream and original stream for backward compatibility
    const streamsToCheck = normalizedStream === 'A' ? ['A', 'NA'] : [normalizedStream];
    const uniqueStreams = [...new Set(streamsToCheck)];
    
    // Check if record exists first (check both streams)
    let existing;
    if (uniqueStreams.length === 1) {
      existing = await query(
        `SELECT id, parish_name FROM student_parishes 
         WHERE level = $1 AND stream = $2 AND year = $3 AND student_index = $4`,
        [level, uniqueStreams[0], parseInt(year), studentIndexNum]
      );
    } else {
      existing = await query(
        `SELECT id, parish_name FROM student_parishes 
         WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND student_index = $5`,
        [level, uniqueStreams[0], uniqueStreams[1], parseInt(year), studentIndexNum]
      );
    }
    
    if (existing.rows.length === 0) {
      // Record doesn't exist - this is fine, just return success
      // (maybe the parish was already cleared or never assigned)
      return res.json({ message: 'Parish assignment removed successfully' });
    }
    
    // Use the actual stream from the found record for the update
    const actualStream = existing.rows[0].stream || normalizedStream;
    
    // Update parish_name to empty string instead of deleting the record
    const result = await query(
      `UPDATE student_parishes 
       SET parish_name = ''
       WHERE level = $1 AND stream = $2 AND year = $3 AND student_index = $4
       RETURNING *`,
      [level, actualStream, parseInt(year), studentIndexNum]
    );
    
    if (result.rows.length === 0) {
      // This shouldn't happen, but handle it gracefully
      return res.json({ message: 'Parish assignment removed successfully' });
    }
    
    res.json({ message: 'Parish assignment removed successfully' });
  } catch (error) {
    console.error('Error deleting parish:', error);
    return sendError(res, error, 500);
  }
});

// Delete subject
// NOTE: This route MUST come BEFORE router.delete('/:admNo') to avoid route conflicts
router.delete('/subjects', async (req, res) => {
  try {
    let { level, stream, year, subject_code } = req.query;
    
    if (!level || !stream || !year || !subject_code) {
      return res.status(400).json({ message: 'level, stream, year, and subject_code are required' });
    }
    
    // Normalize level to uppercase and handle URL encoding (same as GET endpoint)
    if (level) {
      level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    // Normalize stream: NA -> A
    const normalizedStream = normalizeStream(stream);
    
    // For FORM I-IV, use stream='A' (previously 'NA')
    const isFormVOrVI = level === 'FORM V' || level === 'FORM VI';
    const queryStream = isFormVOrVI ? normalizedStream : 'A';
    
    // For Form I-IV, check both 'A' and 'NA' to handle legacy data
    let result;
    if (isFormVOrVI) {
      result = await query(
        'DELETE FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 AND subject_code = $4 RETURNING *',
        [level, queryStream, parseInt(year), subject_code]
      );
    } else {
      // Try deleting with stream='A' first (normalized)
      result = await query(
        'DELETE FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 AND subject_code = $4 RETURNING *',
        [level, 'A', parseInt(year), subject_code]
      );
      
      // If not found with 'A', try with 'NA' (legacy data)
      if (result.rows.length === 0) {
        result = await query(
          'DELETE FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 AND subject_code = $4 RETURNING *',
          [level, 'NA', parseInt(year), subject_code]
        );
      }
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete teacher assignment
// NOTE: This route MUST come BEFORE router.delete('/:admNo') to avoid route conflicts
router.delete('/teachers', async (req, res) => {
  try {
    let { level, stream, year, subject_code } = req.query;
    
    if (!level || !stream || !year || !subject_code) {
      return res.status(400).json({ message: 'level, stream, year, and subject_code are required' });
    }
    
    // Normalize level to uppercase and handle URL encoding
    level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    
    // Decode subject_code to handle URL-encoded values (e.g., "B%2FK" -> "B/K")
    subject_code = decodeURIComponent(String(subject_code));
    
    // Normalize stream: NA -> A
    const normalizedStream = normalizeStream(stream);
    
    // For FORM I-IV, use stream='A' (previously 'NA')
    const isFormVOrVI = level === 'FORM V' || level === 'FORM VI';
    const queryStream = isFormVOrVI ? normalizedStream : 'A';
    
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      return res.status(400).json({ message: 'Invalid year parameter' });
    }
    
    // Try to delete the teacher with the provided subject_code
    // For FORM I-IV, query both 'A' and 'NA' streams since data might be inconsistent
    let result;
    if (!isFormVOrVI) {
      // For FORM I-IV, try both A and NA streams
      result = await query(
        'DELETE FROM subject_teachers WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND subject_code = $5 RETURNING *',
        [level, 'A', 'NA', yearNum, subject_code]
      );
    } else {
      result = await query(
        'DELETE FROM subject_teachers WHERE level = $1 AND stream = $2 AND year = $3 AND subject_code = $4 RETURNING *',
        [level, queryStream, yearNum, subject_code]
      );
    }
    
    // If not found, try to resolve by checking subjects table
    // The frontend might send abbreviation but teacher is stored with code, or vice versa
    if (result.rows.length === 0) {
      try {
        // Get all subjects for this class to find matching codes/abbreviations
        const subjectsResult = await query(
          'SELECT subject_code, subject_abbreviation FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4',
          !isFormVOrVI ? [level, 'A', 'NA', yearNum] : [level, queryStream, yearNum]
        );
        
        // Find subjects that match the provided code (either by code or abbreviation)
        const matchingSubjects = subjectsResult.rows.filter(s => 
          s.subject_code === subject_code || s.subject_abbreviation === subject_code
        );
        
        if (matchingSubjects.length > 0) {
          // Try to delete with all possible codes/abbreviations from matching subjects
          const codesToTry = new Set();
          matchingSubjects.forEach(subject => {
            codesToTry.add(subject.subject_code);
            if (subject.subject_abbreviation) {
              codesToTry.add(subject.subject_abbreviation);
            }
          });
          
          for (const codeToTry of codesToTry) {
            if (!isFormVOrVI) {
              result = await query(
                'DELETE FROM subject_teachers WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND subject_code = $5 RETURNING *',
                [level, 'A', 'NA', yearNum, codeToTry]
              );
            } else {
              result = await query(
                'DELETE FROM subject_teachers WHERE level = $1 AND stream = $2 AND year = $3 AND subject_code = $4 RETURNING *',
                [level, queryStream, yearNum, codeToTry]
              );
            }
            
            if (result.rows.length > 0) {
              break;
            }
          }
        }
      } catch (subjectError) {
        console.error('DELETE /teachers: Could not resolve subject code:', subjectError.message);
      }
    }
    
    if (result.rows.length === 0) {
      // Get all teachers for this class to help debug
      const allTeachers = await query(
        'SELECT subject_code, teacher_name FROM subject_teachers WHERE level = $1 AND stream IN ($2, $3) AND year = $4',
        !isFormVOrVI ? [level, 'A', 'NA', yearNum] : [level, queryStream, yearNum]
      );
      
      return res.status(404).json({ 
        message: 'Teacher assignment not found',
        details: {
          level,
          stream: queryStream,
          year: yearNum,
          subject_code_searched: subject_code,
          searchedStreams: !isFormVOrVI ? ['A', 'NA'] : [queryStream],
          existingTeachers: allTeachers.rows.map(r => ({ subject_code: r.subject_code, teacher_name: r.teacher_name }))
        }
      });
    }
    
    res.json({ message: 'Teacher assignment deleted successfully' });
  } catch (error) {
    console.error('DELETE /teachers error:', error);
    return sendError(res, error, 500);
  }
});

// Delete student
router.delete('/:admNo', async (req, res) => {
  try {
    const { admNo } = req.params;
    let { level, stream, year } = req.query;
    
    // Normalize level to uppercase
    if (level) {
      level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    // Normalize stream: NA -> A
    const normalizedStream = stream ? normalizeStream(stream.trim()) : null;
    
    let queryText = 'DELETE FROM students WHERE adm_no = $1';
    const params = [admNo];
    let paramCount = 2;
    
    if (level) {
      queryText += ` AND level = $${paramCount++}`;
      params.push(level);
    }
    if (stream) {
      // Check both normalized stream and original stream for backward compatibility
      const streamsToCheck = normalizedStream === 'A' ? ['A', 'NA'] : [normalizedStream];
      const uniqueStreams = [...new Set(streamsToCheck)];
      
      if (uniqueStreams.length === 1) {
        queryText += ` AND stream = $${paramCount++}`;
        params.push(uniqueStreams[0]);
      } else {
        queryText += ` AND stream IN ($${paramCount++}, $${paramCount++})`;
        params.push(uniqueStreams[0], uniqueStreams[1]);
      }
    }
    if (year) {
      queryText += ` AND year = $${paramCount++}`;
      params.push(parseInt(year));
    }
    
    const result = await query(queryText + ' RETURNING *', params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get student photos for a class
router.get('/photos/list', async (req, res) => {
  try {
    let { level, stream, year } = req.query;
    
    // Normalize level to uppercase and handle URL encoding
    if (level) {
      level = decodeURIComponent(level.replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    // Normalize stream (NA -> A) and uppercase to match uploads and students table
    if (stream) {
      stream = normalizeStream(String(stream).trim()).toUpperCase();
    }
    
    if (!level || !level.trim() || !stream || !year) {
      return res.status(400).json({ message: 'level, stream, and year are required' });
    }
    
    const result = await query(
      `SELECT * FROM student_photos WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY student_index`,
      [level, stream, parseInt(year)]
    );
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.json({ photos: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get student photo
router.get('/:admNo/photo', async (req, res) => {
  try {
    const { admNo } = req.params;
    const { level, stream, year, student_index } = req.query;
    
    if (!level || !stream || !year || (student_index == null || student_index === '')) {
      return res.status(400).json({ message: 'level, stream, year, and student_index are required' });
    }
    
    const result = await query(
      `SELECT * FROM student_photos WHERE level = $1 AND stream = $2 AND year = $3 AND student_index = $4`,
      [level, stream, parseInt(year), parseInt(student_index)]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Photo not found' });
    }
    
    res.json({ photo: result.rows[0] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Upload student photo
router.post('/:admNo/photo', upload.single('photo'), async (req, res) => {
  try {
    const { admNo } = req.params;
    let { level, stream, year, student_index } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }
    
    if (!level || !stream || !year || (student_index == null || student_index === '')) {
      return res.status(400).json({ message: 'level, stream, year, and student_index are required' });
    }
    
    // Normalize level and stream to match students table and photos/list
    level = String(level).trim().toUpperCase();
    stream = normalizeStream(String(stream).trim()).toUpperCase();
    
    // Check if photo already exists for this student_index
    const existingPhoto = await query(
      `SELECT id FROM student_photos 
       WHERE level = $1 AND stream = $2 AND year = $3 AND student_index = $4`,
      [level, stream, parseInt(year), parseInt(student_index)]
    );
    
    if (existingPhoto.rows.length > 0) {
      // Update existing photo record
      await query(
        `UPDATE student_photos 
         SET photo_filename = $1, created_at = CURRENT_TIMESTAMP
         WHERE level = $2 AND stream = $3 AND year = $4 AND student_index = $5`,
        [req.file.filename, level, stream, parseInt(year), parseInt(student_index)]
      );
    } else {
      // Insert new photo record
      // Use a transaction-like approach: sync sequence, then insert
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          // Always sync sequence before insert to prevent conflicts
          const maxResult = await query('SELECT COALESCE(MAX(id), 0) as max_id FROM student_photos');
          const maxId = parseInt(maxResult.rows[0].max_id) || 0;
          
          // Set sequence to max_id + 1, marking it as used
          await query(`SELECT setval('student_photos_id_seq', $1, true)`, [maxId + 1]);
          
          // Insert new record
          await query(
            `INSERT INTO student_photos (level, stream, year, student_index, photo_filename)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (level, stream, year, student_index)
             DO UPDATE SET photo_filename = EXCLUDED.photo_filename`,
            [level, stream, parseInt(year), parseInt(student_index), req.file.filename]
          );
          
          // Success - break out of retry loop
          break;
        } catch (insertError) {
          // If duplicate key error on id, sync sequence and retry
          if (insertError.code === '23505' && insertError.constraint === 'student_photos_pkey') {
            retries++;
            if (retries >= maxRetries) {
              // Final attempt: force sequence to a safe value
              const maxResult = await query('SELECT COALESCE(MAX(id), 0) as max_id FROM student_photos');
              const maxId = parseInt(maxResult.rows[0].max_id) || 0;
              // Set sequence to a value higher than max to ensure no conflicts
              await query(`SELECT setval('student_photos_id_seq', $1, true)`, [maxId + 10]);
              
              // Final insert attempt
              await query(
                `INSERT INTO student_photos (level, stream, year, student_index, photo_filename)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (level, stream, year, student_index)
                 DO UPDATE SET photo_filename = EXCLUDED.photo_filename`,
                [level, stream, parseInt(year), parseInt(student_index), req.file.filename]
              );
            } else {
              // Wait a bit before retrying (in case of race condition)
              await new Promise(resolve => setTimeout(resolve, 50));
              continue;
            }
          } else {
            // Different error - throw it
            throw insertError;
          }
        }
      }
    }
    
    res.json({ message: 'Photo uploaded successfully', filename: req.file.filename });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return sendError(res, error, 500);
  }
});

// Delete student photo
router.delete('/:admNo/photo', async (req, res) => {
  try {
    const { admNo } = req.params;
    let { level, stream, year, student_index } = req.query;
    
    if (!level || !stream || !year || (student_index == null || student_index === '')) {
      return res.status(400).json({ message: 'level, stream, year, and student_index are required' });
    }
    
    level = String(level).trim().toUpperCase();
    stream = normalizeStream(String(stream).trim()).toUpperCase();
    
    // Get photo filename before deleting
    const photoResult = await query(
      `SELECT photo_filename FROM student_photos WHERE level = $1 AND stream = $2 AND year = $3 AND student_index = $4`,
      [level, stream, parseInt(year), parseInt(student_index)]
    );
    
    if (photoResult.rows.length === 0) {
      // Idempotent: no photo to delete — return success so client can refresh UI
      return res.json({ message: 'No photo to delete' });
    }
    
    const photoFilename = photoResult.rows[0].photo_filename;
    
    // Delete from database
    await query(
      `DELETE FROM student_photos WHERE level = $1 AND stream = $2 AND year = $3 AND student_index = $4`,
      [level, stream, parseInt(year), parseInt(student_index)]
    );
    
    // Delete file from filesystem
    try {
      const filePath = path.join(photosUploadDir, photoFilename);
      await fs.unlink(filePath);
    } catch (fileError) {
      // Log but don't fail if file doesn't exist
      console.warn('Could not delete photo file:', fileError.message);
    }
    
    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Download Photo Entry Form PDF
router.get('/photo-entry-form/pdf', async (req, res) => {
  try {
    const { level, stream, year, month } = req.query;
    
    if (!level || !stream || !year) {
      return res.status(400).json({ message: 'level, stream, and year are required' });
    }
    
    // Normalize level to uppercase
    const normalizedLevel = level.trim().toUpperCase();
    const yearNum = parseInt(year);
    
    if (isNaN(yearNum) || yearNum <= 0) {
      return res.status(400).json({ message: 'Invalid year' });
    }
    
    const pdfBuffer = await generatePhotoEntryFormPDF(normalizedLevel, stream, yearNum, month || null);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="photo_entry_form_${normalizedLevel.replace(/\s+/g, '_')}_${stream}_${yearNum}${month ? '_' + month : ''}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating Photo Entry Form PDF:', error);
    return sendError(res, error, 500);
  }
});

// Get student parishes for a class
router.get('/parishes/list', requireAuth, async (req, res) => {
  try {
    let { level, stream, year } = req.query;
    
    // Normalize level to uppercase and handle URL encoding
    if (level) {
      level = decodeURIComponent(level.replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    if (!level || !level.trim() || !stream || !year) {
      return res.status(400).json({ message: 'level, stream, and year are required' });
    }
    
    // Normalize stream: NA -> A
    const normalizedStream = normalizeStream(stream);
    
    // Check both normalized stream and original stream for backward compatibility
    // For FORM I-IV, both NA and A refer to the same class
    const streamsToCheck = normalizedStream === 'A' ? ['A', 'NA'] : [normalizedStream];
    const uniqueStreams = [...new Set(streamsToCheck)];
    
    console.log('[PARISHES] Request:', { level, stream, normalizedStream, year, uniqueStreams });
    
    // Query parishes for both streams
    let queryText, queryParams;
    if (uniqueStreams.length === 1) {
      queryText = `SELECT * FROM student_parishes 
                   WHERE level = $1 AND stream = $2 AND year = $3 
                   ORDER BY student_index`;
      queryParams = [level, uniqueStreams[0], parseInt(year)];
    } else {
      queryText = `SELECT * FROM student_parishes 
                   WHERE level = $1 AND stream IN ($2, $3) AND year = $4 
                   ORDER BY student_index`;
      queryParams = [level, uniqueStreams[0], uniqueStreams[1], parseInt(year)];
    }
    
    console.log('[PARISHES] Query:', queryText);
    console.log('[PARISHES] Params:', queryParams);
    
    const result = await query(queryText, queryParams);
    
    console.log('[PARISHES] Found:', result.rows.length, 'parishes');
    
    res.json({ parishes: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Helper function to fix sequence for student_parishes table
async function fixStudentParishesSequence() {
  try {
    // Get the actual sequence name
    const seqResult = await query(`
      SELECT pg_get_serial_sequence('student_parishes', 'id') as seq_name
    `);
    
    const seqName = seqResult.rows[0]?.seq_name;
    if (!seqName) {
      return false;
    }
    
    // Get the current max ID
    const maxIdResult = await query(`
      SELECT COALESCE(MAX(id), 0) as max_id FROM student_parishes
    `);
    const maxId = parseInt(maxIdResult.rows[0]?.max_id || 0);
    const nextVal = maxId + 1;
    
    // Reset the sequence to the max id + 1
    // Use format() to safely insert the sequence name
    await query(`
      SELECT setval($1::regclass, $2, false) as current_val
    `, [seqName, nextVal]);
    
    return true;
  } catch (error) {
    console.error('Error fixing sequence:', error);
    // Try alternative method if the first one fails
    try {
      await query(`
        SELECT setval('student_parishes_id_seq', 
          COALESCE((SELECT MAX(id) FROM student_parishes), 0) + 1, 
          false
        )
      `);
      return true;
    } catch (altError) {
      console.error('Alternative sequence fix also failed:', altError);
      return false;
    }
  }
}

// Save or update student parish
router.post('/parishes', async (req, res) => {
  try {
    let { level, stream, year, student_index, parish_name } = req.body;
    
    // Normalize level to uppercase and handle URL encoding (same as GET endpoint)
    if (level) {
      level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    if (!level || !level.trim() || !stream || !year || student_index === undefined || !parish_name) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Normalize stream: NA -> A (use normalized stream for consistency)
    const normalizedStream = normalizeStream(stream);
    
    // Check if record exists first - check both streams for backward compatibility
    const streamsToCheck = normalizedStream === 'A' ? ['A', 'NA'] : [normalizedStream];
    const uniqueStreams = [...new Set(streamsToCheck)];
    
    let existing;
    if (uniqueStreams.length === 1) {
      existing = await query(
        `SELECT id, stream FROM student_parishes WHERE level = $1 AND stream = $2 AND year = $3 AND student_index = $4`,
        [level, uniqueStreams[0], parseInt(year), parseInt(student_index)]
      );
    } else {
      existing = await query(
        `SELECT id, stream FROM student_parishes WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND student_index = $5`,
        [level, uniqueStreams[0], uniqueStreams[1], parseInt(year), parseInt(student_index)]
      );
    }
    
    let result;
    if (existing.rows.length > 0) {
      // Update existing record - use the actual stream from the found record
      const actualStream = existing.rows[0].stream || normalizedStream;
      result = await query(
        `UPDATE student_parishes 
         SET parish_name = $1
         WHERE level = $2 AND stream = $3 AND year = $4 AND student_index = $5
         RETURNING *`,
        [parish_name.trim(), level, actualStream, parseInt(year), parseInt(student_index)]
      );
    } else {
      // Fix sequence before inserting to avoid conflicts
      const sequenceFixed = await fixStudentParishesSequence();
      if (!sequenceFixed) {
        console.warn('Sequence fix failed, but attempting insert anyway...');
      }
      
      // Insert new record
      try {
        result = await query(
          `INSERT INTO student_parishes (level, stream, year, student_index, parish_name)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [level, normalizedStream, parseInt(year), parseInt(student_index), parish_name.trim()]
        );
      } catch (insertError) {
        // If insert fails due to sequence, fix and retry once
        if (insertError.code === '23505' && insertError.constraint === 'student_parishes_pkey') {
          await fixStudentParishesSequence();
          result = await query(
            `INSERT INTO student_parishes (level, stream, year, student_index, parish_name)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [level, normalizedStream, parseInt(year), parseInt(student_index), parish_name.trim()]
          );
        } else {
          throw insertError;
        }
      }
    }
    
    res.status(201).json({ parish: result.rows[0], message: 'Parish assigned successfully' });
  } catch (error) {
    console.error('Error saving parish:', error);
    
    // If it's a primary key conflict (sequence issue), fix sequence and retry
    if (error.code === '23505' && error.constraint === 'student_parishes_pkey') {
      try {
        await fixStudentParishesSequence();
        
        // Retry with update-first approach
        let { level, stream, year, student_index, parish_name } = req.body;
        if (level) {
          level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
        }
        
        const existing = await query(
          `SELECT id FROM student_parishes WHERE level = $1 AND stream = $2 AND year = $3 AND student_index = $4`,
          [level, stream, parseInt(year), parseInt(student_index)]
        );
        
        let result;
        if (existing.rows.length > 0) {
          result = await query(
            `UPDATE student_parishes 
             SET parish_name = $1
             WHERE level = $2 AND stream = $3 AND year = $4 AND student_index = $5
             RETURNING *`,
            [parish_name.trim(), level, stream, parseInt(year), parseInt(student_index)]
          );
        } else {
          result = await query(
            `INSERT INTO student_parishes (level, stream, year, student_index, parish_name)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [level, stream, parseInt(year), parseInt(student_index), parish_name.trim()]
          );
        }
        
        return res.status(201).json({ parish: result.rows[0], message: 'Parish assigned successfully' });
      } catch (retryError) {
        console.error('Error retrying after sequence fix:', retryError);
        return sendError(res, retryError, 500);
      }
    }
    
    return sendError(res, error, 500);
  }
});

// Get student scores
router.get('/:admNo/scores', async (req, res) => {
  try {
    const { admNo } = req.params;
    let { level, stream, year, month } = req.query;
    
    // Normalize level to uppercase and handle URL encoding
    if (level) {
      level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    // Normalize stream: NA -> A (all NA stream values have been normalized to A)
    if (stream) {
      stream = normalizeStream(stream);
    }
    
    let queryText = 'SELECT * FROM individual_scores WHERE adm_no = $1';
    const params = [admNo];
    let paramCount = 2;
    
    if (level) {
      queryText += ` AND level = $${paramCount++}`;
      params.push(level);
    }
    if (stream) {
      queryText += ` AND stream = $${paramCount++}`;
      params.push(stream);
    }
    if (year) {
      queryText += ` AND year = $${paramCount++}`;
      params.push(parseInt(year));
    }
    if (month) {
      queryText += ` AND month = $${paramCount++}`;
      params.push(month);
    }
    
    queryText += ' ORDER BY year DESC, month DESC';
    
    const result = await query(queryText, params);
    res.json({ scores: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save student score
router.post('/:admNo/scores', async (req, res) => {
  try {
    const { admNo } = req.params;
    let { level, stream, year, month, subject_code, score } = req.body;
    
    if (!level || !stream || !year || !month || !subject_code || score === undefined) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Restrict non-admin to allowed score-entry months (admin setting)
    const userRole = (req.user && req.user.role) ? String(req.user.role).toLowerCase() : '';
    const isAdmin = ['admin', 'superadmin'].includes(userRole);
    if (!isAdmin && req.user && req.user.permissions) {
      const perms = typeof req.user.permissions === 'string' ? JSON.parse(req.user.permissions) : req.user.permissions;
      const allowedMonths = perms.score_entry_months;
      if (Array.isArray(allowedMonths) && allowedMonths.length > 0) {
        const monthNorm = String(month).trim();
        if (!allowedMonths.includes(monthNorm)) {
          return res.status(403).json({
            message: 'You are not allowed to enter scores for this month. Contact an administrator to assign score entry months.',
          });
        }
      }
    }
    
    // Normalize level: uppercase and decode (e.g. "Form I" -> "FORM I")
    level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    
    // Normalize stream: NA -> A
    const normalizedStream = normalizeStream(String(stream).trim());
    
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      return res.status(400).json({ message: 'Invalid year' });
    }
    
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      return res.status(400).json({ message: 'Score must be a number between 0 and 100' });
    }
    
    // Resolve subject code: if a numeric code is provided, get the abbreviation used in scores
    // For FORM I-IV, subjects are stored with stream='A'; for FORM V-VI use actual stream
    const isFormVOrVI = level === 'FORM V' || level === 'FORM VI';
    const subjectLookupStream = isFormVOrVI ? normalizedStream : 'A';
    let scoreSubjectCode = subject_code;
    
    try {
      if (/^\d+$/.test(String(subject_code).trim())) {
        const subjectResult = await query(
          'SELECT subject_abbreviation FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 AND subject_code = $4 LIMIT 1',
          [level, subjectLookupStream, yearNum, subject_code]
        );
        
        if (subjectResult.rows.length > 0 && subjectResult.rows[0].subject_abbreviation) {
          scoreSubjectCode = subjectResult.rows[0].subject_abbreviation;
        }
      }
    } catch (subjectError) {
      console.log('Could not resolve subject code, using provided:', subject_code);
    }
    
    const insertScore = () => query(
      `INSERT INTO individual_scores (level, stream, year, month, subject_code, adm_no, score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (level, stream, year, month, subject_code, adm_no)
       DO UPDATE SET score = EXCLUDED.score, updated_at = NOW()`,
      [level, normalizedStream, yearNum, String(month).trim(), scoreSubjectCode, admNo, scoreNum]
    );
    
    try {
      await insertScore();
    } catch (insertError) {
      // Sequence out of sync: id sequence returned a value that already exists (e.g. after import/restore)
      if (insertError.code === '23505' && insertError.constraint === 'individual_scores_pkey') {
        await query(`
          SELECT setval(
            pg_get_serial_sequence('individual_scores', 'id'),
            COALESCE((SELECT MAX(id) FROM individual_scores), 0) + 1
          )
        `);
        await insertScore();
      } else {
        throw insertError;
      }
    }
    
    res.json({ message: 'Score saved successfully' });
  } catch (error) {
    console.error('POST /:admNo/scores error:', error);
    const message = error.code === '23505' ? 'Duplicate score entry' : (error.message || 'Failed to save score');
    return sendError(res, { message }, 500);
  }
});

// Get scores for a class, month, and subject
router.get('/scores/list', async (req, res) => {
  try {
    let { level, stream, year, month, subject_code } = req.query;
    
    if (!level || !stream || !year || !month || !subject_code) {
      return res.status(400).json({ message: 'level, stream, year, month, and subject_code are required' });
    }

    // Restrict non-admin to allowed score-entry months (admin setting)
    const userRole = (req.user && req.user.role) ? String(req.user.role).toLowerCase() : '';
    const isAdmin = ['admin', 'superadmin'].includes(userRole);
    if (!isAdmin && req.user && req.user.permissions) {
      const perms = typeof req.user.permissions === 'string' ? JSON.parse(req.user.permissions) : req.user.permissions;
      const allowedMonths = perms.score_entry_months;
      if (Array.isArray(allowedMonths) && allowedMonths.length > 0) {
        const monthNorm = String(month).trim();
        if (!allowedMonths.includes(monthNorm)) {
          return res.status(403).json({
            message: 'You are not allowed to view or enter scores for this month.',
            scores: {},
          });
        }
      }
    }
    
    // Normalize level to uppercase and handle URL encoding
    if (level) {
      level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    // Normalize stream: NA -> A (all NA stream values have been normalized to A)
    const normalizedStream = normalizeStream(stream);
    
    // Handle subject code: scores may be stored with either subject_code or subject_abbreviation
    // First, try to find the subject to get both code and abbreviation
    let subjectCodesToSearch = [subject_code];
    
    try {
      // Check both normalized stream and 'NA' for backward compatibility
      const subjectResult = await query(
        'SELECT subject_code, subject_abbreviation FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND (subject_code = $5 OR subject_abbreviation = $5) LIMIT 1',
        [level, normalizedStream, 'NA', parseInt(year), subject_code]
      );
      
      if (subjectResult.rows.length > 0) {
        const subject = subjectResult.rows[0];
        // Search for scores using both the code and abbreviation
        subjectCodesToSearch = [
          subject.subject_code,
          subject.subject_abbreviation
        ].filter(Boolean); // Remove null/undefined values
      }
    } catch (subjectError) {
      // If subject lookup fails, just use the provided subject_code
      console.log('Could not lookup subject, using provided code:', subject_code);
    }
    
    // Query scores - try both subject code and abbreviation
    // Check both normalized stream and 'NA' for backward compatibility
    // Build query with OR conditions for multiple subject codes
    let queryText;
    let queryParams;
    
    if (subjectCodesToSearch.length === 1) {
      // Single subject code - simpler query
      queryText = `SELECT adm_no, score FROM individual_scores 
                   WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = $5 AND subject_code = $6`;
      queryParams = [level, normalizedStream, 'NA', parseInt(year), month, subjectCodesToSearch[0]];
    } else {
      // Multiple subject codes - use OR conditions (more compatible than ANY array)
      const codeConditions = subjectCodesToSearch.map((_, idx) => `subject_code = $${6 + idx}`).join(' OR ');
      queryText = `SELECT adm_no, score FROM individual_scores 
                   WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = $5 AND (${codeConditions})`;
      queryParams = [level, normalizedStream, 'NA', parseInt(year), month, ...subjectCodesToSearch];
    }
    
    const result = await query(queryText, queryParams);
    
    // Convert to object mapping adm_no to score
    const scoreMap = {};
    result.rows.forEach(row => {
      scoreMap[row.adm_no] = row.score;
    });
    
    console.log(`Fetched ${result.rows.length} scores for ${level}, stream ${normalizedStream}, ${month}, subject ${subject_code} (searched: ${subjectCodesToSearch.join(', ')})`);
    
    res.json({ scores: scoreMap });
  } catch (error) {
    console.error('Error fetching scores:', error);
    return sendError(res, error, 500);
  }
});

// Get all scores for a class and month (batch endpoint to reduce API calls)
router.get('/scores/batch', async (req, res) => {
  try {
    let { level, stream, year, month } = req.query;
    
    // Normalize level to uppercase and handle URL encoding
    if (level) {
      level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    if (!level || !stream || !year || !month) {
      return res.status(400).json({ message: 'level, stream, year, and month are required' });
    }
    
    // Normalize stream: NA -> A
    const normalizedStream = normalizeStream(stream);
    
    // Get all subjects for the class to map codes to abbreviations
    const subjectsResult = await query(
      'SELECT subject_code, subject_abbreviation FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4',
      [level, normalizedStream, 'NA', parseInt(year)]
    );
    
    // Create mapping: subject_code -> subject_abbreviation (or code if no abbreviation)
    const subjectCodeToAbbr = {};
    subjectsResult.rows.forEach(subject => {
      const key = subject.subject_abbreviation || subject.subject_code;
      subjectCodeToAbbr[subject.subject_code] = key;
      // Also map abbreviation to itself if it exists
      if (subject.subject_abbreviation) {
        subjectCodeToAbbr[subject.subject_abbreviation] = key;
      }
    });
    
    // Get all scores for the class and month
    const scoresResult = await query(
      `SELECT adm_no, subject_code, score 
       FROM individual_scores 
       WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = $5`,
      [level, normalizedStream, 'NA', parseInt(year), month]
    );
    
    // Convert to nested object: {adm_no: {subject_key: score}}
    // Use abbreviation as key (matching Flask template behavior)
    const scoresMap = {};
    scoresResult.rows.forEach(row => {
      if (!scoresMap[row.adm_no]) {
        scoresMap[row.adm_no] = {};
      }
      // Map subject_code to abbreviation (or use code if no abbreviation)
      const subjectKey = subjectCodeToAbbr[row.subject_code] || row.subject_code;
      // Store score under both code and abbreviation for flexibility
      scoresMap[row.adm_no][subjectKey] = row.score;
      scoresMap[row.adm_no][row.subject_code] = row.score; // Also keep original code for backward compatibility
    });
    
    console.log(`Fetched ${scoresResult.rows.length} scores for ${level}, stream ${normalizedStream}, ${month} (${Object.keys(scoresMap).length} students)`);
    
    res.json({ scores: scoresMap });
  } catch (error) {
    console.error('Error fetching batch scores:', error);
    return sendError(res, error, 500);
  }
});

// Get subjects for class
router.get('/subjects/list', async (req, res) => {
  try {
    let { level, stream, year } = req.query;
    
    // Normalize level to uppercase and handle URL encoding
    if (level) {
      level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    if (!level || !year) {
      return res.status(400).json({ message: 'level and year are required' });
    }
    
    // For FORM I-IV, subjects may be stored with stream='A' or stream='NA' (legacy data)
    // For FORM V-VI, use the actual stream (normalized)
    const isFormVOrVI = level === 'FORM V' || level === 'FORM VI';
    
    let result;
    if (isFormVOrVI) {
      // For FORM V-VI, stream is required and use as-is (normalized, but only NA -> A conversion)
      if (!stream) {
        return res.status(400).json({ message: 'stream is required for FORM V and FORM VI' });
      }
      const normalizedStream = normalizeStream(stream); // Only converts NA -> A, leaves PCB/PCM/etc as-is
      result = await query(
        'SELECT * FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY subject_code',
        [level, normalizedStream, parseInt(year)]
      );
    } else {
      // For FORM I-IV, normalize stream: NA -> A (default to 'A' if not provided)
      const normalizedStream = normalizeStream(stream || 'A');
      // Check both 'A' and 'NA' to handle legacy data
      result = await query(
        'SELECT * FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4 ORDER BY subject_code',
        [level, 'A', 'NA', parseInt(year)]
      );
    }
    
    res.json({ subjects: result.rows });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return sendError(res, error, 500);
  }
});

// Create or update subject
router.post('/subjects', async (req, res) => {
  try {
    const { level, stream, year, subject_code, subject_name, subject_abbreviation } = req.body;
    
    if (!level || !stream || !year || !subject_code || !subject_name) {
      return res.status(400).json({ message: 'level, stream, year, subject_code, and subject_name are required' });
    }
    
    // Normalize stream: NA -> A
    const normalizedStream = normalizeStream(stream);
    
    // For FORM I-IV, store with stream='A' (previously 'NA')
    const isFormVOrVI = level === 'FORM V' || level === 'FORM VI';
    const queryStream = isFormVOrVI ? normalizedStream : 'A';
    
    const result = await query(
      `INSERT INTO subjects (level, stream, year, subject_code, subject_name, subject_abbreviation)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (level, stream, year, subject_code)
       DO UPDATE SET subject_name = EXCLUDED.subject_name, subject_abbreviation = EXCLUDED.subject_abbreviation
       RETURNING *`,
      [level, queryStream, parseInt(year), subject_code, subject_name, subject_abbreviation || null]
    );
    
    res.status(201).json({ subject: result.rows[0], message: 'Subject saved successfully' });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Subject already exists for this class and year' });
    }
    return sendError(res, error, 500);
  }
});

// Get subject teachers for a class
router.get('/teachers/list', async (req, res) => {
  try {
    let { level, stream, year } = req.query;
    
    if (!level || !stream || !year) {
      return res.status(400).json({ message: 'level, stream, and year are required' });
    }
    
    // Normalize level to uppercase and handle URL encoding
    level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    
    // Normalize stream: NA -> A (all NA stream values have been normalized to A)
    const normalizedStream = normalizeStream(stream);
    
    // For FORM I-IV, use stream='A' (previously 'NA')
    const isFormVOrVI = level === 'FORM V' || level === 'FORM VI';
    const queryStream = isFormVOrVI ? normalizedStream : 'A';
    
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      return res.status(400).json({ message: 'Invalid year parameter' });
    }
    
    // For FORM I-IV, query BOTH 'A' and 'NA' streams since data might be inconsistent
    let result;
    if (!isFormVOrVI) {
      // Try to get teachers from both A and NA streams
      result = await query(
        'SELECT * FROM subject_teachers WHERE level = $1 AND stream IN ($2, $3) AND year = $4 ORDER BY subject_code',
        [level, 'A', 'NA', yearNum]
      );
    } else {
      result = await query(
        'SELECT * FROM subject_teachers WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY subject_code',
        [level, queryStream, yearNum]
      );
    }
    
    // Convert to object mapping subject_code to teacher info
    // Also map by subject abbreviation for compatibility
    const teacherMap = {};
    result.rows.forEach(row => {
      teacherMap[row.subject_code] = {
        teacher_name: row.teacher_name,
        teacher_signature: row.teacher_signature,
      };
    });
    
    // Also create mappings by subject abbreviation if subjects exist
    try {
      const subjectsResult = await query(
        'SELECT subject_code, subject_abbreviation FROM subjects WHERE level = $1 AND stream = $2 AND year = $3',
        [level, queryStream, yearNum]
      );
      
      subjectsResult.rows.forEach(subject => {
        // If teacher exists for abbreviation, also map by code
        if (teacherMap[subject.subject_abbreviation]) {
          teacherMap[subject.subject_code] = teacherMap[subject.subject_abbreviation];
        }
        // If teacher exists for code, also map by abbreviation
        if (teacherMap[subject.subject_code] && subject.subject_abbreviation) {
          teacherMap[subject.subject_abbreviation] = teacherMap[subject.subject_code];
        }
      });
    } catch (subjectError) {
      // If subject lookup fails, just use the direct mapping
      console.error('Could not create subject code/abbreviation mapping:', subjectError.message);
    }
    res.json({ teachers: teacherMap });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save or update subject teacher
router.post('/teachers', async (req, res) => {
  try {
    const { level, stream, year, subject_code, teacher_name, teacher_signature } = req.body;
    
    if (!level || !stream || !year || !subject_code || !teacher_name) {
      return res.status(400).json({ message: 'level, stream, year, subject_code, and teacher_name are required' });
    }
    
    // Normalize stream: NA -> A
    const normalizedStream = normalizeStream(stream);
    
    // For FORM I-IV, use stream='A' (previously 'NA')
    const isFormVOrVI = level === 'FORM V' || level === 'FORM VI';
    const queryStream = isFormVOrVI ? normalizedStream : 'A';
    
    // Resolve subject code: if a numeric code is provided, get the abbreviation used in teachers table
    let teacherSubjectCode = subject_code;
    
    try {
      // Check if subject_code is a numeric code (like '0181')
      if (/^\d+$/.test(subject_code)) {
        const subjectResult = await query(
          'SELECT subject_abbreviation FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 AND subject_code = $4 LIMIT 1',
          [level, queryStream, parseInt(year), subject_code]
        );
        
        if (subjectResult.rows.length > 0 && subjectResult.rows[0].subject_abbreviation) {
          // Use the abbreviation that's actually stored in subject_teachers
          teacherSubjectCode = subjectResult.rows[0].subject_abbreviation;
        }
      }
    } catch (subjectError) {
      // If lookup fails, use the provided subject_code as-is
      console.log('Could not resolve subject code, using provided:', subject_code);
    }
    
    const result = await query(
      `INSERT INTO subject_teachers (level, stream, year, subject_code, teacher_name, teacher_signature)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (level, stream, year, subject_code)
       DO UPDATE SET teacher_name = EXCLUDED.teacher_name, teacher_signature = EXCLUDED.teacher_signature, updated_at = NOW()
       RETURNING *`,
      [level, queryStream, parseInt(year), teacherSubjectCode, teacher_name, teacher_signature || null]
    );
    
    res.status(201).json({ teacher: result.rows[0], message: 'Teacher assigned successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete subject teacher
// Get comments for a class
router.get('/comments/list', async (req, res) => {
  try {
    let { comment_type, level, stream, year, term } = req.query;
    
    // Normalize level to uppercase
    if (level) {
      level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    if (!comment_type || !level || !stream || !year || !term) {
      return res.status(400).json({ message: 'comment_type, level, stream, year, and term are required' });
    }
    
    // Normalize stream: NA -> A (all NA stream values have been normalized to A)
    const normalizedStream = normalizeStream(stream);
    
    // Query for both normalized stream and original NA (for backward compatibility)
    // This handles cases where comments might still be stored with stream='NA'
    const result = await query(
      `SELECT student_index, comment_text FROM comments 
       WHERE comment_type = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND term = $6`,
      [comment_type, level, normalizedStream, 'NA', parseInt(year), term]
    );
    
    // Convert to object mapping student_index to comment_text
    const commentMap = {};
    result.rows.forEach(row => {
      commentMap[row.student_index] = row.comment_text;
    });
    
    res.json({ comments: commentMap });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save or update comment
router.post('/comments', async (req, res) => {
  try {
    let { comment_type, level, stream, year, term, student_index, comment_text } = req.body;
    
    // Normalize level to uppercase
    if (level) {
      level = String(level).trim().toUpperCase();
    }
    
    if (!comment_type || !level || !stream || !year || !term || !student_index || comment_text === undefined) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Normalize stream: NA -> A (all NA stream values have been normalized to A)
    const normalizedStream = normalizeStream(stream);
    
    try {
      await query(
        `INSERT INTO comments (comment_type, level, stream, year, term, student_index, comment_text)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (comment_type, level, stream, year, term, student_index)
         DO UPDATE SET comment_text = EXCLUDED.comment_text, updated_at = NOW()`,
        [comment_type, level, normalizedStream, parseInt(year), term, student_index, comment_text]
      );
    } catch (insertError) {
      // Handle sequence out-of-sync error (duplicate key on id)
      if (insertError.code === '23505' && insertError.constraint === 'comments_pkey') {
        console.warn('Comments sequence out of sync, resetting...');
        // Reset the sequence to the maximum ID + 1
        await query(`
          SELECT setval('comments_id_seq', COALESCE((SELECT MAX(id) FROM comments), 0) + 1, false)
        `);
        // Retry the insert
        await query(
          `INSERT INTO comments (comment_type, level, stream, year, term, student_index, comment_text)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (comment_type, level, stream, year, term, student_index)
           DO UPDATE SET comment_text = EXCLUDED.comment_text, updated_at = NOW()`,
          [comment_type, level, normalizedStream, parseInt(year), term, student_index, comment_text]
        );
      } else {
        throw insertError;
      }
    }
    
    res.json({ message: 'Comment saved successfully' });
  } catch (error) {
    console.error('Error saving comment:', error);
    return sendError(res, error, 500);
  }
});

// Bulk save or update comments (for CSV upload; one request = one rate-limit count)
router.post('/comments/bulk', async (req, res) => {
  try {
    let { comment_type, level, stream, year, term, comments: commentsList } = req.body;

    if (level) level = String(level).trim().toUpperCase();
    if (!comment_type || !level || !stream || !year || !term || !Array.isArray(commentsList)) {
      return res.status(400).json({ message: 'comment_type, level, stream, year, term, and comments (array) are required' });
    }

    const normalizedStream = normalizeStream(stream);
    const yearNum = parseInt(year);
    let saved = 0;
    const errors = [];

    for (const item of commentsList) {
      const student_index = item.student_index;
      const comment_text = item.comment_text;
      if (student_index === undefined || student_index === null || comment_text === undefined) {
        errors.push({ student_index, message: 'student_index and comment_text required' });
        continue;
      }
      try {
        await query(
          `INSERT INTO comments (comment_type, level, stream, year, term, student_index, comment_text)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (comment_type, level, stream, year, term, student_index)
           DO UPDATE SET comment_text = EXCLUDED.comment_text, updated_at = NOW()`,
          [comment_type, level, normalizedStream, yearNum, term, String(student_index), comment_text]
        );
        saved++;
      } catch (insertError) {
        if (insertError.code === '23505' && insertError.constraint === 'comments_pkey') {
          await query(`SELECT setval('comments_id_seq', COALESCE((SELECT MAX(id) FROM comments), 0) + 1, false)`);
          await query(
            `INSERT INTO comments (comment_type, level, stream, year, term, student_index, comment_text)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (comment_type, level, stream, year, term, student_index)
             DO UPDATE SET comment_text = EXCLUDED.comment_text, updated_at = NOW()`,
            [comment_type, level, normalizedStream, yearNum, term, String(student_index), comment_text]
          );
          saved++;
        } else {
          errors.push({ student_index, message: insertError.message });
        }
      }
    }

    res.json({ message: 'Bulk comments saved', saved, failed: errors.length, errors: errors.length ? errors : undefined });
  } catch (error) {
    console.error('Error saving bulk comments:', error);
    return sendError(res, error, 500);
  }
});

// Delete comment
router.delete('/comments', async (req, res) => {
  try {
    let { comment_type, level, stream, year, term, student_index } = req.query;
    
    // Normalize level to uppercase
    if (level) {
      level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    if (!comment_type || !level || !stream || !year || !term || !student_index) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Normalize stream: NA -> A (all NA stream values have been normalized to A)
    const normalizedStream = normalizeStream(stream);
    
    const result = await query(
      `DELETE FROM comments 
       WHERE comment_type = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = $5 AND student_index = $6
       RETURNING *`,
      [comment_type, level, normalizedStream, parseInt(year), term, student_index]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get tabia mwenendo evaluations for a class
router.get('/tabia-mwenendo/list', async (req, res) => {
  try {
    let { level, stream, year, term } = req.query;
    
    // Normalize level to uppercase
    if (level) {
      level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    if (!level || !stream || !year || !term) {
      return res.status(400).json({ message: 'level, stream, year, and term are required' });
    }
    
    // Normalize stream: NA -> A (all NA stream values have been normalized to A)
    const normalizedStream = normalizeStream(stream);
    
    // Query for both normalized stream and original NA (for backward compatibility)
    const result = await query(
      `SELECT student_index, criterion, evaluation FROM tabia_mwenendo 
       WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND term = $5`,
      [level, normalizedStream, 'NA', parseInt(year), term]
    );
    
    // Convert to nested dictionary: {student_index: {criterion: evaluation}}
    const evaluationMap = {};
    result.rows.forEach(row => {
      if (!evaluationMap[row.student_index]) {
        evaluationMap[row.student_index] = {};
      }
      evaluationMap[row.student_index][row.criterion] = row.evaluation;
    });
    
    res.json({ evaluations: evaluationMap });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save tabia mwenendo evaluations (batch)
// replaceScope: true = bulk upload wins: delete all existing for this class/term, then insert payload (CSV upload).
router.post('/tabia-mwenendo', async (req, res) => {
  try {
    let { level, stream, year, term, evaluations, replaceScope } = req.body;
    
    // Normalize level to uppercase
    if (level) {
      level = String(level).trim().toUpperCase();
    }
    
    if (!level || !stream || !year || !term || !evaluations || !Array.isArray(evaluations)) {
      return res.status(400).json({ message: 'level, stream, year, term, and evaluations array are required' });
    }
    
    // Normalize stream: NA -> A (all NA stream values have been normalized to A)
    const normalizedStream = normalizeStream(stream);
    const normalizedTerm = term != null ? String(term).trim() : term;
    const termMatchValues = getTermMatchValues(normalizedTerm);
    const levelMatchValues = getLevelMatchValues(level);
    
    // Validate evaluations array
    const validGrades = ['A', 'B', 'C', 'D', 'F'];
    const validCriteria = ['901', '902', '903', '904', '905', '906', '907', '908', '909', '910', '911'];
    
    for (const eval of evaluations) {
      if (!eval.student_index || !eval.criterion || !eval.evaluation) {
        return res.status(400).json({ message: 'Each evaluation must have student_index, criterion, and evaluation' });
      }
      if (!validCriteria.includes(eval.criterion)) {
        return res.status(400).json({ message: `Invalid criterion: ${eval.criterion}. Must be 901-911` });
      }
      if (!validGrades.includes(eval.evaluation)) {
        return res.status(400).json({ message: `Invalid evaluation: ${eval.evaluation}. Must be A, B, C, D, or F` });
      }
    }
    
    // Deduplicate by (student_index, criterion) so we never violate unique key (last wins).
    // Normalize student_index so "8" and "08" count as the same.
    const normIdx = (v) => (v != null && String(Number(v)) === String(v).trim() ? String(Number(v)) : String(v).trim());
    const key = (e) => `${normIdx(e.student_index)}:${e.criterion}`;
    const seen = new Map();
    for (const e of evaluations) {
      seen.set(key(e), e);
    }
    const deduped = [...seen.values()];

    console.log('[tabia-mwenendo] scope', { level, stream: normalizedStream, year, term: normalizedTerm, replaceScope, evaluationsCount: evaluations.length, dedupedCount: deduped.length });
    const insertKeys = deduped.map((e) => `${normIdx(e.student_index)}:${e.criterion}`);
    const duplicateKeys = insertKeys.filter((k, i) => insertKeys.indexOf(k) !== i);
    if (duplicateKeys.length > 0) {
      console.warn('[tabia-mwenendo] duplicate keys in deduped (should be 0):', duplicateKeys.slice(0, 20));
    }

    await withTransaction(async (client) => {
      const yearInt = parseInt(year);

      if (replaceScope === true) {
        // Bulk upload wins: select ALL rows for this year+term (no level/stream in SQL), then filter in Node so we never miss due to DB formatting.
        const termPlaceholders = termMatchValues.map((_, i) => `TRIM(term) = TRIM($${i + 2})`).join(' OR ');
        const selectParams = [yearInt, ...termMatchValues];
        const selectResult = await client.query(
          `SELECT id, level, stream, year, term FROM tabia_mwenendo WHERE year = $1 AND (${termPlaceholders})`,
          selectParams
        );
        const levelSet = new Set(levelMatchValues.map((s) => s.toUpperCase()));
        const norm = (s) => (s != null ? String(s).trim().toUpperCase() : '');
        const normLevel = (s) => (s != null ? String(s).trim().replace(/\s+/g, ' ').toUpperCase() : '');
        const idsToDelete = (selectResult?.rows || [])
          .filter((r) => levelSet.has(normLevel(r.level)) && (norm(r.stream) === 'A' || norm(r.stream) === 'NA'))
          .map((r) => r.id)
          .filter((id) => id != null);
        console.log('[tabia-mwenendo] replaceScope: year+term rows', selectResult?.rows?.length ?? 0, 'after level/stream filter', idsToDelete.length, 'sample row', selectResult?.rows?.[0]);

        if (idsToDelete.length > 0) {
          await client.query(`DELETE FROM tabia_mwenendo WHERE id = ANY($1::int[])`, [idsToDelete]);
        }
        // Single multi-row INSERT (no ON CONFLICT needed; we just deleted everything for this scope).
        if (deduped.length > 0) {
          console.log('[tabia-mwenendo] INSERT count', deduped.length, 'sample keys', insertKeys.slice(0, 10));
          const cols = 'level, stream, year, term, student_index, criterion, evaluation';
          const placeholders = [];
          const params = [];
          deduped.forEach((eval, i) => {
            const base = i * 7;
            placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`);
            params.push(level, normalizedStream, yearInt, normalizedTerm, normIdx(eval.student_index), eval.criterion, eval.evaluation);
          });
          await client.query(
            `INSERT INTO tabia_mwenendo (${cols}) VALUES ${placeholders.join(', ')}`,
            params
          );
        }
      } else {
        for (const eval of deduped) {
          await client.query(
            `INSERT INTO tabia_mwenendo (level, stream, year, term, student_index, criterion, evaluation)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (level, stream, year, term, student_index, criterion)
             DO UPDATE SET evaluation = EXCLUDED.evaluation, updated_at = NOW()`,
            [level, normalizedStream, yearInt, normalizedTerm, String(eval.student_index), eval.criterion, eval.evaluation]
          );
        }
      }
    }).catch((error) => {
      console.error('[tabia-mwenendo] error in transaction', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        scope: { level, stream: normalizedStream, year, term: normalizedTerm },
        replaceScope,
        dedupedCount: deduped?.length,
        sampleKeys: deduped?.slice(0, 5).map((e) => `${e.student_index}:${e.criterion}`),
      });
      throw error;
    });

    res.json({ message: `${deduped.length} evaluations saved successfully` });
  } catch (error) {
    console.error('[tabia-mwenendo] outer error', error.message, error.code, error.constraint, error.detail);
    const payload = { message: error.message || 'Server error' };
    if (error.detail) payload.detail = error.detail;
    if (error.constraint) payload.constraint = error.constraint;
    if (error.code) payload.code = error.code;
    return sendError(res, payload, 500);
  }
});

// Import calculation utilities
const {
  calculateGrade,
  getSwahiliRemarks,
  calculateWeightedTotal,
  calculateOverallAverage
} = require('../utils/calculations');

// Get monthly results for a class
router.get('/monthly-results/list', async (req, res) => {
  try {
    let { level, stream, year, month } = req.query;
    
    if (!level || !stream || !year || !month) {
      return res.status(400).json({ message: 'level, stream, year, and month are required' });
    }
    
    // Normalize level to uppercase and handle URL encoding
    if (level) {
      level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    // Normalize stream
    const normalizedStream = normalizeStream(stream);
    
    const result = await query(
      `SELECT student_index, total_marks, average, grade, position, remarks 
       FROM monthly_results 
       WHERE level = $1 AND stream = $2 AND year = $3 AND month = $4`,
      [level, normalizedStream, parseInt(year), month]
    );
    
    // Convert to object mapping student_index to result data
    const resultsMap = {};
    result.rows.forEach(row => {
      resultsMap[row.student_index] = {
        total_marks: row.total_marks ? parseFloat(row.total_marks) : null,
        average: row.average ? parseFloat(row.average) : null,
        grade: row.grade,
        position: row.position,
        remarks: row.remarks,
      };
    });
    
    res.json({ results: resultsMap });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Calculate monthly results automatically from individual scores
router.post('/monthly-results/calculate', async (req, res) => {
  try {
    let { level, stream, year, month } = req.body;
    
    if (!level || !stream || !year || !month) {
      return res.status(400).json({ message: 'level, stream, year, and month are required' });
    }
    
    // Normalize level to uppercase and handle URL encoding
    if (level) {
      level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    }
    
    // Normalize stream for queries
    const normalizedStreamForQuery = normalizeStream(stream);
    
    // Check if this is FORM I-IV (which may have students with stream 'A' or 'NA')
    const isFormIV = /^FORM\s+(I|II|III|IV)$/i.test(level);
    
    // Get all students for the class
    // For FORM I-IV, check both 'A' and 'NA' streams since students may have either
    let studentsResult;
    if (isFormIV && (normalizedStreamForQuery === 'A' || normalizedStreamForQuery === 'NA')) {
      studentsResult = await query(
        'SELECT adm_no, first_name, middle_name, surname FROM students WHERE level = $1 AND (stream = $2 OR stream = $3) AND year = $4 ORDER BY adm_no',
        [level, 'A', 'NA', parseInt(year)]
      );
    } else {
      studentsResult = await query(
        'SELECT adm_no, first_name, middle_name, surname FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY adm_no',
        [level, normalizedStreamForQuery, parseInt(year)]
      );
    }
    
    if (studentsResult.rows.length === 0) {
      return res.json({ results: {}, message: 'No students found for this class' });
    }
    
    // Get all individual scores for the month (check both normalized stream and NA for backward compatibility)
    const scoresResult = await query(
      `SELECT adm_no, subject_code, score 
       FROM individual_scores 
       WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = $5`,
      [level, normalizedStreamForQuery, 'NA', parseInt(year), month]
    );
    
    // Get subjects for the class (check both normalized stream and NA for backward compatibility)
    const subjectsResult = await query(
      'SELECT subject_code, subject_abbreviation FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4',
      [level, normalizedStreamForQuery, 'NA', parseInt(year)]
    );
    
    // Create mapping: subject_code -> [subject_code, abbreviation] (for flexible lookup)
    const subjectCodeToKeys = {};
    subjectsResult.rows.forEach(subject => {
      const keys = [subject.subject_code];
      if (subject.subject_abbreviation) {
        keys.push(subject.subject_abbreviation);
      }
      subjectCodeToKeys[subject.subject_code] = keys;
    });
    
    const subjectCodes = subjectsResult.rows.map(row => row.subject_code);
    
    // Build score lookup: {adm_no: {subject_key: score}}
    // Scores might be stored with either code or abbreviation
    const scoreLookup = {};
    scoresResult.rows.forEach(row => {
      if (!scoreLookup[row.adm_no]) {
        scoreLookup[row.adm_no] = {};
      }
      // Store score under the key it was stored with (could be code or abbreviation)
      scoreLookup[row.adm_no][row.subject_code] = parseFloat(row.score);
    });
    
    // Calculate results for each student
    const calculatedResults = {};
    const studentsWithTotals = [];
    
    studentsResult.rows.forEach((student, index) => {
      const studentIndex = index.toString();
      const studentScores = scoreLookup[student.adm_no] || {};
      
      // Calculate total marks
      let totalMarks = 0;
      let subjectCount = 0;
      
      subjectCodes.forEach(subjectCode => {
        // Try to find score using either code or abbreviation
        const possibleKeys = subjectCodeToKeys[subjectCode] || [subjectCode];
        let score = undefined;
        
        for (const key of possibleKeys) {
          if (studentScores[key] !== undefined) {
            score = studentScores[key];
            break;
          }
        }
        
        if (score !== undefined) {
          totalMarks += score;
          subjectCount++;
        }
      });
      
      // Calculate average (rounded to whole number)
      const average = subjectCount > 0 ? Math.round(totalMarks / subjectCount) : 0;
      
      // Calculate grade
      const grade = calculateGrade(average, level);
      
      // Get Swahili remarks
      const remarks = getSwahiliRemarks(grade, level);
      
      calculatedResults[studentIndex] = {
        total_marks: totalMarks,
        average: average,
        grade: grade,
        remarks: remarks,
      };
      
      studentsWithTotals.push({
        student_index: studentIndex,
        total_marks: totalMarks,
        average: average,
        grade: grade,
        remarks: remarks,
      });
    });
    
    // Calculate positions (sort by total marks descending)
    studentsWithTotals.sort((a, b) => b.total_marks - a.total_marks);
    
    studentsWithTotals.forEach((student, index) => {
      calculatedResults[student.student_index].position = index + 1;
    });
    
    // Save all calculated results to database
    const normalizedStreamForSave = normalizeStream(stream);
    for (const [studentIndex, resultData] of Object.entries(calculatedResults)) {
      try {
        await query(
          `INSERT INTO monthly_results (level, stream, year, month, student_index, total_marks, average, grade, position, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (level, stream, year, month, student_index)
           DO UPDATE SET 
             total_marks = EXCLUDED.total_marks,
             average = EXCLUDED.average,
             grade = EXCLUDED.grade,
             position = EXCLUDED.position,
             remarks = EXCLUDED.remarks,
             updated_at = NOW()`,
          [
            level,
            normalizedStreamForSave,
            parseInt(year),
            month,
            studentIndex,
            resultData.total_marks ? parseFloat(resultData.total_marks) : null,
            resultData.average ? parseFloat(resultData.average) : null,
            resultData.grade || null,
            resultData.position ? parseInt(resultData.position) : null,
            resultData.remarks || null
          ]
        );
      } catch (saveError) {
        console.error(`Error saving result for student_index ${studentIndex}:`, saveError);
        // Continue with other students even if one fails
      }
    }
    
    res.json({ results: calculatedResults, message: 'Results calculated and saved successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save or update monthly result
router.post('/monthly-results', async (req, res) => {
  try {
    const { level, stream, year, month, student_index, total_marks, average, grade, position, remarks } = req.body;
    
    if (!level || !stream || !year || !month || !student_index) {
      return res.status(400).json({ message: 'level, stream, year, month, and student_index are required' });
    }
    
    await query(
      `INSERT INTO monthly_results (level, stream, year, month, student_index, total_marks, average, grade, position, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (level, stream, year, month, student_index)
       DO UPDATE SET 
         total_marks = EXCLUDED.total_marks,
         average = EXCLUDED.average,
         grade = EXCLUDED.grade,
         position = EXCLUDED.position,
         remarks = EXCLUDED.remarks,
         updated_at = NOW()`,
      [
        level, 
        stream, 
        parseInt(year), 
        month, 
        student_index,
        total_marks ? parseFloat(total_marks) : null,
        average ? parseFloat(average) : null,
        grade || null,
        position ? parseInt(position) : null,
        remarks || null
      ]
    );
    
    res.json({ message: 'Monthly result saved successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete monthly result
router.delete('/monthly-results', async (req, res) => {
  try {
    const { level, stream, year, month, student_index } = req.query;
    
    if (!level || !stream || !year || !month || !student_index) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    const result = await query(
      `DELETE FROM monthly_results 
       WHERE level = $1 AND stream = $2 AND year = $3 AND month = $4 AND student_index = $5
       RETURNING *`,
      [level, stream, parseInt(year), month, student_index]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Monthly result not found' });
    }
    
    res.json({ message: 'Monthly result deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Generate Monthly Results PDF
router.get('/monthly-results/pdf', async (req, res) => {
  try {
    let { level, stream, year, month } = req.query;
    
    if (!level || !stream || !year || !month) {
      return res.status(400).json({ message: 'level, stream, year, and month are required' });
    }
    
    console.log('Generating PDF for:', { level, stream, year, month });
    
    const pdfBuffer = await generateMonthlyResultsPDF(level, stream, year, month);
    
    // Validate PDF buffer
    if (!pdfBuffer) {
      throw new Error('PDF buffer is null or undefined');
    }
    
    // Ensure it's a Buffer
    let buffer;
    if (Buffer.isBuffer(pdfBuffer)) {
      buffer = pdfBuffer;
    } else {
      buffer = Buffer.from(pdfBuffer);
    }
    
    if (buffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }
    
    // Verify it's a valid PDF
    if (buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
      console.error('Invalid PDF buffer received. First bytes:', buffer.slice(0, 20).toString('hex'));
      throw new Error('Generated file is not a valid PDF');
    }
    
    console.log(`Sending PDF: ${buffer.length} bytes`);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    const filename = `Monthly_Results_${level}_${stream}_${year}_${month}.pdf`.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send the buffer
    res.end(buffer, 'binary');
  } catch (error) {
    console.error('Error generating monthly results PDF:', error);
    console.error('Error stack:', error.stack);
    
    // If it's already a response, don't send another
    if (!res.headersSent) {
      return sendError(res, error, 500);
    }
  }
});

// Get fees announcements for a class
router.get('/fees-announcements/list', async (req, res) => {
  try {
    let { level, stream, year, term } = req.query;
    
    console.log('[FEES ANNOUNCEMENTS] Request params:', { level, stream, year, term });
    
    if (!level || !stream || !year) {
      return res.status(400).json({ message: 'level, stream, and year are required' });
    }
    
    // Normalize level to uppercase
    level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    
    // Normalize stream: NA -> A (for FORM I-IV)
    const normalizedStream = normalizeStream(stream);
    
    const normalizedTerm = term ? decodeURIComponent(term) : 'Term I';
    console.log('[FEES ANNOUNCEMENTS] Normalized values:', { level, stream: normalizedStream, year, term: normalizedTerm });
    
    // Check if term column exists, if not use old query (backward compatibility)
    let result;
    try {
      result = await query(
        `SELECT announcement_index, announcement_text FROM fees_announcements 
         WHERE UPPER(TRIM(level)) = UPPER(TRIM($1)) AND stream IN ($2, $3) AND year = $4 AND term = $5 ORDER BY announcement_index`,
        [level, normalizedStream, 'NA', parseInt(year), normalizedTerm]
      );
      console.log('[FEES ANNOUNCEMENTS] Query with term returned', result.rows.length, 'rows');
    } catch (error) {
      console.log('[FEES ANNOUNCEMENTS] Error with term query:', error.message);
      // If term column doesn't exist, fall back to old query
      if (error.message.includes('column') && error.message.includes('term')) {
        console.log('[FEES ANNOUNCEMENTS] Falling back to query without term');
        result = await query(
          `SELECT announcement_index, announcement_text FROM fees_announcements 
           WHERE UPPER(TRIM(level)) = UPPER(TRIM($1)) AND stream IN ($2, $3) AND year = $4 ORDER BY announcement_index`,
          [level, normalizedStream, 'NA', parseInt(year)]
        );
        console.log('[FEES ANNOUNCEMENTS] Fallback query returned', result.rows.length, 'rows');
      } else {
        throw error;
      }
    }
    
    // Convert to object mapping announcement_index to announcement_text
    const announcementsMap = {};
    result.rows.forEach(row => {
      announcementsMap[row.announcement_index] = row.announcement_text;
    });
    
    console.log('[FEES ANNOUNCEMENTS] Returning announcements map:', Object.keys(announcementsMap).length, 'keys');
    res.json({ announcements: announcementsMap });
  } catch (error) {
    console.error('[FEES ANNOUNCEMENTS] Error:', error);
    return sendError(res, error, 500);
  }
});

// Save fees announcements (batch)
router.post('/fees-announcements', async (req, res) => {
  try {
    const { level, stream, year, term, announcements } = req.body;
    
    if (!level || !stream || !year || !announcements || typeof announcements !== 'object') {
      return res.status(400).json({ message: 'level, stream, year, and announcements object are required' });
    }
    
    const normalizedTerm = term || 'Term I';
    
    await withTransaction(async (client) => {
      // Check if term column exists
      let hasTermColumn = false;
      try {
        await client.query('SELECT term FROM fees_announcements LIMIT 1');
        hasTermColumn = true;
      } catch (error) {
        if (error.message.includes('column') && error.message.includes('term')) {
          hasTermColumn = false;
        } else {
          throw error;
        }
      }

      for (let i = 1; i <= 10; i++) {
        const announcementIndex = i.toString();
        const announcementText = announcements[announcementIndex] || '';

        if (announcementText.trim() === '') {
          if (hasTermColumn) {
            await client.query(
              'DELETE FROM fees_announcements WHERE level = $1 AND stream = $2 AND year = $3 AND term = $4 AND announcement_index = $5',
              [level, stream, parseInt(year), normalizedTerm, announcementIndex]
            );
          } else {
            await client.query(
              'DELETE FROM fees_announcements WHERE level = $1 AND stream = $2 AND year = $3 AND announcement_index = $4',
              [level, stream, parseInt(year), announcementIndex]
            );
          }
        } else {
          if (hasTermColumn) {
            await client.query(
              `INSERT INTO fees_announcements (level, stream, year, term, announcement_index, announcement_text)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (level, stream, year, term, announcement_index)
               DO UPDATE SET announcement_text = EXCLUDED.announcement_text, updated_at = NOW()`,
              [level, stream, parseInt(year), normalizedTerm, announcementIndex, announcementText.trim()]
            );
          } else {
            await client.query(
              `INSERT INTO fees_announcements (level, stream, year, announcement_index, announcement_text)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (level, stream, year, announcement_index)
               DO UPDATE SET announcement_text = EXCLUDED.announcement_text, updated_at = NOW()`,
              [level, stream, parseInt(year), announcementIndex, announcementText.trim()]
            );
          }
        }
      }
    });

    res.json({ message: 'Fees announcements saved successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get individual debt for a class
router.get('/debt/list', async (req, res) => {
  try {
    let { level, stream, year } = req.query;
    
    console.log('[DEBT LIST] Request params:', { level, stream, year });
    
    if (!level || !stream || !year) {
      return res.status(400).json({ message: 'level, stream, and year are required' });
    }
    
    // Normalize level to uppercase
    level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    
    // Normalize stream: NA -> A (for FORM I-IV)
    const normalizedStream = normalizeStream(stream);
    
    console.log('[DEBT LIST] Normalized values:', { level, stream: normalizedStream, year });
    
    const result = await query(
      `SELECT student_index, amount, description, due_date, status 
       FROM individual_debt 
       WHERE UPPER(TRIM(level)) = UPPER(TRIM($1)) AND stream IN ($2, $3) AND year = $4`,
      [level, normalizedStream, 'NA', parseInt(year)]
    );
    
    console.log('[DEBT LIST] Query returned', result.rows.length, 'rows');
    
    // Convert to object mapping student_index to debt data
    const debtMap = {};
    result.rows.forEach(row => {
      debtMap[row.student_index] = {
        amount: parseFloat(row.amount),
        description: row.description || '',
        due_date: row.due_date || '',
        status: row.status || 'Outstanding',
      };
    });
    
    console.log('[DEBT LIST] Returning debt map with', Object.keys(debtMap).length, 'keys');
    res.json({ debt: debtMap });
  } catch (error) {
    console.error('[DEBT LIST] Error:', error);
    return sendError(res, error, 500);
  }
});

// Save or update individual debt
router.post('/debt', async (req, res) => {
  try {
    let { level, stream, year, student_index, amount, description = '', due_date = '', status = 'Outstanding' } = req.body;
    
    if (!level || !stream || !year || !student_index || amount === undefined) {
      return res.status(400).json({ message: 'level, stream, year, student_index, and amount are required' });
    }
    
    // Normalize level to uppercase
    level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    
    // Normalize stream: NA -> A (for FORM I-IV)
    const normalizedStream = normalizeStream(stream);
    
    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat) || amountFloat < 0) {
      return res.status(400).json({ message: 'amount must be a non-negative number' });
    }
    
    await query(
      `INSERT INTO individual_debt (level, stream, year, student_index, amount, description, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (level, stream, year, student_index)
       DO UPDATE SET 
         amount = EXCLUDED.amount,
         description = EXCLUDED.description,
         due_date = EXCLUDED.due_date,
         status = EXCLUDED.status,
         updated_at = NOW()`,
      [level, normalizedStream, parseInt(year), student_index, amountFloat, description, due_date, status]
    );
    
    res.json({ message: 'Debt record saved successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete individual debt
router.delete('/debt', async (req, res) => {
  try {
    let { level, stream, year, student_index } = req.query;
    
    if (!level || !stream || !year || !student_index) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Normalize level to uppercase
    level = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    
    // Normalize stream: NA -> A (for FORM I-IV)
    const normalizedStream = normalizeStream(stream);
    
    const result = await query(
      `DELETE FROM individual_debt 
       WHERE UPPER(TRIM(level)) = UPPER(TRIM($1)) AND stream IN ($2, $3) AND year = $4 AND student_index = $5
       RETURNING *`,
      [level, normalizedStream, 'NA', parseInt(year), student_index]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Debt record not found' });
    }
    
    res.json({ message: 'Debt record deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Bulk upload students from CSV
router.post('/bulk-upload', csvUpload.single('file'), async (req, res) => {
  try {
    const { level, stream, year } = req.body;
    
    if (!level || !stream || !year) {
      return res.status(400).json({ message: 'level, stream, and year are required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required' });
    }
    
    const fs = require('fs').promises;
    const { Readable } = require('stream');
    
    // Read CSV file
    const fileContent = await fs.readFile(req.file.path, 'utf-8');
    
    // Remove BOM if present
    const contentWithoutBOM = fileContent.replace(/^\uFEFF/, '');
    
    // Parse CSV manually (simple CSV parser)
    const lines = contentWithoutBOM.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ message: 'CSV file must contain at least a header row and one data row' });
    }
    
    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Find column indices
    const admNoIndex = headers.findIndex(h => 
      h.toLowerCase().includes('adm') && h.toLowerCase().includes('no')
    );
    const firstNameIndex = headers.findIndex(h => 
      h.toLowerCase().includes('first') && h.toLowerCase().includes('name')
    );
    const middleNameIndex = headers.findIndex(h => 
      h.toLowerCase().includes('middle') && h.toLowerCase().includes('name')
    );
    const surnameIndex = headers.findIndex(h => 
      h.toLowerCase().includes('surname') || h.toLowerCase() === 'last name'
    );
    const sexIndex = headers.findIndex(h => 
      h.toLowerCase() === 'sex' || h.toLowerCase() === 'gender'
    );
    
    if (admNoIndex === -1 || firstNameIndex === -1 || surnameIndex === -1 || sexIndex === -1) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ 
        message: 'CSV must contain columns: Adm No, First Name, Surname, Sex' 
      });
    }
    
    // Parse data rows
    const students = [];
    const errors = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Simple CSV parsing (handles quoted values)
      const values = [];
      let currentValue = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          if (inQuotes && line[j + 1] === '"') {
            currentValue += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());
      
      // Extract values
      const admNo = (values[admNoIndex] || '').trim().replace(/^"|"$/g, '');
      const firstName = (values[firstNameIndex] || '').trim().replace(/^"|"$/g, '');
      const middleName = middleNameIndex >= 0 ? (values[middleNameIndex] || '').trim().replace(/^"|"$/g, '') : '';
      const surname = (values[surnameIndex] || '').trim().replace(/^"|"$/g, '');
      const sex = (values[sexIndex] || '').trim().replace(/^"|"$/g, '');
      
      // Validate required fields
      if (!admNo || !firstName || !surname || !sex) {
        errors.push({
          row: i + 1,
          error: 'Missing required fields (Adm No, First Name, Surname, or Sex)',
          data: { admNo, firstName, surname, sex }
        });
        continue;
      }
      
      // Validate sex value
      const validSexValues = ['Male', 'Female', 'M', 'F'];
      const normalizedSex = sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase();
      if (!validSexValues.includes(sex) && normalizedSex !== 'Male' && normalizedSex !== 'Female') {
        errors.push({
          row: i + 1,
          error: `Invalid sex value: ${sex}. Must be Male or Female`,
          data: { admNo, firstName, surname, sex }
        });
        continue;
      }
      
      // Normalize sex
      const finalSex = normalizedSex === 'Male' || sex.toUpperCase() === 'M' ? 'Male' : 'Female';
      
      students.push({
        adm_no: admNo,
        first_name: firstName,
        middle_name: middleName || null,
        surname: surname,
        sex: finalSex,
        level: level,
        stream: stream,
        year: parseInt(year),
        status: 'PENDING'
      });
    }
    
    try {
      // Delete uploaded file
      await fs.unlink(req.file.path);
      
      // Save valid students to database
      let successCount = 0;
      let duplicateCount = 0;
      
      for (const student of students) {
        try {
          await query(
            `INSERT INTO students (adm_no, first_name, middle_name, surname, sex, level, stream, year, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (adm_no, level, stream, year)
             DO UPDATE SET 
               first_name = EXCLUDED.first_name,
               middle_name = EXCLUDED.middle_name,
               surname = EXCLUDED.surname,
               sex = EXCLUDED.sex`,
            [
              student.adm_no,
              student.first_name,
              student.middle_name,
              student.surname,
              student.sex,
              student.level,
              student.stream,
              student.year,
              student.status
            ]
          );
          successCount++;
        } catch (dbError) {
          // Check if it's a duplicate key error
          if (dbError.code === '23505' || dbError.message.includes('unique')) {
            duplicateCount++;
          } else {
            errors.push({
              row: students.indexOf(student) + 1,
              error: `Database error: ${dbError.message}`,
              data: student
            });
          }
        }
      }
      
      res.json({
        message: `Bulk upload completed: ${successCount} students added, ${duplicateCount} duplicates skipped, ${errors.length} errors`,
        success_count: successCount,
        duplicate_count: duplicateCount,
        error_count: errors.length,
        errors: errors.slice(0, 10) // Return first 10 errors
      });
    } catch (error) {
      // Clean up uploaded file if it exists
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      }
      return sendError(res, error, 500);
    }
  } catch (error) {
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        const fs = require('fs').promises;
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    return sendError(res, error, 500);
  }
});

module.exports = router;
