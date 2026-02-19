/**
 * Admin Routes - Full Functionality
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query, withTransaction } = require('../config/database');
const { saveUserActivity } = require('../utils/activityLogger');
const bcrypt = require('bcryptjs');
const { extractText } = require('../utils/documentParser');
const { getClient, callClaude } = require('../utils/anthropic');
const { getNectaSummaryForAI } = require('../utils/nectaAnalyticsForAI');
const { sendError } = require('../utils/safeError');

// All admin routes require authentication
router.use(requireAuth);

// Configure multer for file uploads
// Use sync fs operations for multer destination to avoid async issues
const fsSync = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadPath = path.join(__dirname, '../static/uploads');
      // Create directory synchronously - multer expects sync callback
      fsSync.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (err) {
      console.error('Error creating upload directory:', err);
      cb(err, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB
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

// AI Matters: document uploads (PDF, CSV, DOCX)
const aiMattersPath = path.join(__dirname, '../static/ai-matters');
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      fsSync.mkdirSync(aiMattersPath, { recursive: true });
      cb(null, aiMattersPath);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '-' + safe);
  }
});
const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const ext = (path.extname(file.originalname || '') || '').toLowerCase();
    if (['.pdf', '.csv', '.docx', '.doc'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, CSV, and Word (.docx/.doc) files are allowed'));
    }
  }
});

// ========== DASHBOARD STATISTICS ==========

// Get dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const userRole = req.user?.role || 'teacher';
    const isAdmin = ['admin', 'superadmin', 'rector', 'vice_rector', 'academic_master'].includes(userRole);
    
    const stats = {
      total_students: 0,
      form_i_students: 0,
      form_ii_students: 0,
      form_iii_students: 0,
      form_iv_students: 0,
      form_v_students: 0,
      form_vi_students: 0,
      students_by_year: [], // [{ year: 2025, count: 56 }, { year: 2026, count: 55 }, ...]
      total_subjects: 0,
      total_photos: 0,
      monthly_results_count: 0,
      individual_scores_count: 0,
      comments_count: 0,
      debt_records: 0,
      parishes_assigned: 0
    };
    
    // Only calculate stats for admin users
    if (isAdmin) {
      // Per-year student counts (for year cards: 2025=56, 2026=55, ...)
      const studentsByYearResult = await query(`
        SELECT year, COUNT(*) as count
        FROM students
        GROUP BY year
        ORDER BY year DESC
      `);
      if (studentsByYearResult.rows.length > 0) {
        stats.students_by_year = studentsByYearResult.rows.map(row => ({
          year: parseInt(row.year) || 0,
          count: parseInt(row.count) || 0
        }));
      }

      // Single query for all student counts by form level
      const studentCountsResult = await query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM I' THEN 1 ELSE 0 END) as form_i,
          SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM II' THEN 1 ELSE 0 END) as form_ii,
          SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM III' THEN 1 ELSE 0 END) as form_iii,
          SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM IV' THEN 1 ELSE 0 END) as form_iv,
          SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM V' THEN 1 ELSE 0 END) as form_v,
          SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM VI' THEN 1 ELSE 0 END) as form_vi
        FROM students
      `);
      
      if (studentCountsResult.rows.length > 0) {
        const counts = studentCountsResult.rows[0];
        stats.total_students = parseInt(counts.total) || 0;
        stats.form_i_students = parseInt(counts.form_i) || 0;
        stats.form_ii_students = parseInt(counts.form_ii) || 0;
        stats.form_iii_students = parseInt(counts.form_iii) || 0;
        stats.form_iv_students = parseInt(counts.form_iv) || 0;
        stats.form_v_students = parseInt(counts.form_v) || 0;
        stats.form_vi_students = parseInt(counts.form_vi) || 0;
      }
      
      // Batch count queries for better performance
      const batchCountsResult = await query(`
        SELECT 
          (SELECT COUNT(*) FROM subjects) as subjects,
          (SELECT COUNT(*) FROM student_photos) as photos,
          (SELECT COUNT(*) FROM monthly_results) as monthly_results,
          (SELECT COUNT(*) FROM individual_scores) as scores,
          (SELECT COUNT(*) FROM comments) as comments,
          (SELECT COUNT(*) FROM tabia_mwenendo) as tabia_mwenendo,
          (SELECT COUNT(*) FROM individual_debt) as debts,
          (SELECT COUNT(*) FROM student_parishes) as parishes
      `);
      
      if (batchCountsResult.rows.length > 0) {
        const counts = batchCountsResult.rows[0];
        stats.total_subjects = parseInt(counts.subjects) || 0;
        stats.total_photos = parseInt(counts.photos) || 0;
        stats.monthly_results_count = parseInt(counts.monthly_results) || 0;
        stats.individual_scores_count = parseInt(counts.scores) || 0;
        stats.comments_count = (parseInt(counts.comments) || 0) + (parseInt(counts.tabia_mwenendo) || 0);
        stats.debt_records = parseInt(counts.debts) || 0;
        stats.parishes_assigned = parseInt(counts.parishes) || 0;
      }
    }
    
    // Log activity
    try {
      const username = req.user?.user_id || req.user?.username || 'unknown';
      if (username && username !== 'unknown') {
        await saveUserActivity({
          user_id: req.user.id,
          username: username,
          activity_type: 'page_view',
          description: 'Viewed dashboard',
          details: { page: 'dashboard', role: userRole }
        });
      }
    } catch (error) {
      console.error('Failed to log dashboard view:', error);
    }
    
    res.json({ 
      success: true, 
      stats,
      isAdmin 
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return sendError(res, error, 500);
  }
});

// ========== USER MANAGEMENT ==========

// Get all users (updated to include permissions)
router.get('/users', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, full_name, role, status, permissions, email, phone, 
       profile_picture, bio, department, position, created_at, updated_at 
       FROM users 
       WHERE role != 'SUPERADMIN' 
       ORDER BY created_at DESC`
    );
    
    // Parse permissions JSON
    const users = result.rows.map(user => ({
      ...user,
      permissions: user.permissions ? JSON.parse(user.permissions) : null,
    }));
    
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return sendError(res, error, 500);
  }
});

// TODO: Add other admin routes here (public website, announcements, events, gallery, etc.)

// Get public announcements (admin view - all announcements)
router.get('/announcements', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM public_announcements ORDER BY date DESC, created_at DESC'
    );
    res.json({ announcements: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save public announcement
router.post('/announcements', async (req, res) => {
  try {
    const { id, title, content, date, priority = 'normal', type = 'General Announcement', active = true } = req.body;
    
    if (!id || !title || !content || !date) {
      return res.status(400).json({ message: 'id, title, content, and date are required' });
    }
    
    await query(
      `INSERT INTO public_announcements (id, title, content, date, priority, type, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id)
       DO UPDATE SET 
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         date = EXCLUDED.date,
         priority = EXCLUDED.priority,
         type = EXCLUDED.type,
         active = EXCLUDED.active`,
      [id, title, content, date, priority, type, active]
    );
    
    res.json({ message: 'Announcement saved successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete public announcement
router.delete('/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM public_announcements WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Generate announcement ID
router.get('/announcements/generate-id', async (req, res) => {
  try {
    const now = new Date();
    const id = `ann_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    res.json({ id });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== SCHOOL BRANDING ==========

// Get school logo
router.get('/school-logo', async (req, res) => {
  try {
    // Check if table exists first
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'school_logo'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('[SCHOOL LOGO] Table does not exist, returning null');
      return res.json({ logo: null });
    }
    
    const result = await query('SELECT * FROM school_logo WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({ logo: null });
    }
    res.json({ logo: result.rows[0] });
  } catch (error) {
    console.error('[SCHOOL LOGO] Error:', error);
    // Return null instead of 500 error to prevent breaking the UI
    res.json({ logo: null });
  }
});

// Upload school logo
router.post('/school-logo', upload.single('logo_file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if table exists first
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'school_logo'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('[SCHOOL LOGO] Table does not exist, creating it...');
      // Create the table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS school_logo (
          id INTEGER PRIMARY KEY DEFAULT 1,
          logo_image_path VARCHAR(255),
          school_name VARCHAR(255),
          motto VARCHAR(255),
          address TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT chk_logo_id CHECK (id = 1)
        )
      `);
      console.log('[SCHOOL LOGO] Table created');
    }

    // Get old logo path (handle gracefully if query fails)
    let oldLogoPath = null;
    try {
      const oldLogoResult = await query('SELECT logo_image_path FROM school_logo WHERE id = 1');
      oldLogoPath = oldLogoResult.rows[0]?.logo_image_path;
    } catch (err) {
      console.log('[SCHOOL LOGO] Could not fetch old logo:', err.message);
    }

    // Delete old logo if exists
    if (oldLogoPath) {
      try {
        const oldFilePath = path.join(__dirname, '../static', oldLogoPath);
        await fs.unlink(oldFilePath);
        console.log('[SCHOOL LOGO] Old logo deleted:', oldLogoPath);
      } catch (err) {
        console.log('[SCHOOL LOGO] Old logo file not found or already deleted');
      }
    }

    // Generate unique filename
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    const relativePath = `uploads/photos/${filename}`;
    const photosDir = path.join(__dirname, '../static/uploads/photos');
    const newFilePath = path.join(photosDir, filename);

    // Ensure directory exists
    await fs.mkdir(photosDir, { recursive: true });

    // Move uploaded file from multer's temp location to final location
    // Multer saves to static/uploads with a generated name, we need to move it
    try {
      if (req.file.path && req.file.path !== newFilePath) {
        // Check if source file exists
        await fs.access(req.file.path);
        await fs.rename(req.file.path, newFilePath);
        console.log('[SCHOOL LOGO] File moved from', req.file.path, 'to', newFilePath);
      } else {
        // If file is already in the right place, just log it
        console.log('[SCHOOL LOGO] File already in correct location:', newFilePath);
      }
    } catch (moveError) {
      console.error('[SCHOOL LOGO] Error moving file:', moveError);
      // If move fails, try to copy instead
      try {
        await fs.copyFile(req.file.path, newFilePath);
        await fs.unlink(req.file.path); // Delete original
        console.log('[SCHOOL LOGO] File copied to:', newFilePath);
      } catch (copyError) {
        console.error('[SCHOOL LOGO] Error copying file:', copyError);
        throw new Error(`Failed to save file: ${copyError.message}`);
      }
    }
    
    console.log('[SCHOOL LOGO] File saved to:', newFilePath);

    // Save to database
    await query(
      `INSERT INTO school_logo (id, logo_image_path)
       VALUES (1, $1)
       ON CONFLICT (id)
       DO UPDATE SET logo_image_path = EXCLUDED.logo_image_path, updated_at = NOW()`,
      [relativePath]
    );

    console.log('[SCHOOL LOGO] Logo saved to database:', relativePath);
    res.json({ message: 'Logo uploaded successfully', logo_path: relativePath });
  } catch (error) {
    console.error('[SCHOOL LOGO] Upload error:', error);
    return sendError(res, error, 500);
  }
});

// Get school stamp
router.get('/school-stamp', async (req, res) => {
  try {
    const result = await query('SELECT * FROM school_stamp WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({ stamp: null });
    }
    res.json({ stamp: result.rows[0] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Upload school stamp
router.post('/school-stamp', upload.single('stamp_file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }


    // Get old stamp path
    const oldStampResult = await query('SELECT stamp_image_path FROM school_stamp WHERE id = 1');
    const oldStampPath = oldStampResult.rows[0]?.stamp_image_path;

    // Delete old stamp if exists
    if (oldStampPath) {
      try {
        const oldFilePath = path.join(__dirname, '../static', oldStampPath);
        await fs.unlink(oldFilePath);
      } catch (err) {
        console.log('Old stamp file not found or already deleted');
      }
    }

    // Generate unique filename
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    const relativePath = `uploads/photos/${filename}`;
    const newFilePath = path.join(__dirname, '../static', relativePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(newFilePath), { recursive: true });

    // Move uploaded file
    await fs.rename(req.file.path, newFilePath);

    // Save to database
    await query(
      `INSERT INTO school_stamp (id, stamp_image_path)
       VALUES (1, $1)
       ON CONFLICT (id)
       DO UPDATE SET stamp_image_path = EXCLUDED.stamp_image_path, updated_at = NOW()`,
      [relativePath]
    );

    res.json({ message: 'Stamp uploaded successfully', stamp_path: relativePath });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get authority data
router.get('/authority-data', async (req, res) => {
  try {
    const result = await query('SELECT * FROM authority_data WHERE id = 1');
    if (result.rows.length === 0) {
      // Return default values
      return res.json({
        authority: {
          name: 'Fr.Moses Assey',
          title: 'Rector',
          signature: '',
          signature_image_path: '',
          date: '',
        },
      });
    }
    res.json({ authority: result.rows[0] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save authority data
router.post('/authority-data', async (req, res) => {
  try {
    const { name, title, signature = '', date = '' } = req.body;

    if (!name || !title) {
      return res.status(400).json({ message: 'name and title are required' });
    }

    // Get existing signature_image_path to preserve it
    const existingResult = await query('SELECT signature_image_path FROM authority_data WHERE id = 1');
    const signatureImagePath = existingResult.rows[0]?.signature_image_path || '';

    await query(
      `INSERT INTO authority_data (id, name, title, signature, signature_image_path, date)
       VALUES (1, $1, $2, $3, $4, $5)
       ON CONFLICT (id)
       DO UPDATE SET 
         name = EXCLUDED.name,
         title = EXCLUDED.title,
         signature = EXCLUDED.signature,
         date = EXCLUDED.date,
         updated_at = NOW()`,
      [name, title, signature, signatureImagePath, date]
    );

    res.json({ message: 'Authority information saved successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Upload authority signature image
router.post('/authority-data/upload-signature', upload.single('signature_file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }


    // Get old signature path
    const oldSignatureResult = await query('SELECT signature_image_path FROM authority_data WHERE id = 1');
    const oldSignaturePath = oldSignatureResult.rows[0]?.signature_image_path;

    // Delete old signature if exists
    if (oldSignaturePath) {
      try {
        const oldFilePath = path.join(__dirname, '../static', oldSignaturePath);
        await fs.unlink(oldFilePath);
      } catch (err) {
        console.log('Old signature file not found or already deleted');
      }
    }

    // Generate unique filename
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    const relativePath = `uploads/photos/${filename}`;
    const newFilePath = path.join(__dirname, '../static', relativePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(newFilePath), { recursive: true });

    // Move uploaded file
    await fs.rename(req.file.path, newFilePath);

    // Check if authority data exists
    const existingDataResult = await query('SELECT name, title FROM authority_data WHERE id = 1');
    
    if (existingDataResult.rows.length === 0) {
      // No existing data, insert with default values
      await query(
        `INSERT INTO authority_data (id, name, title, signature_image_path)
         VALUES (1, $1, $2, $3)`,
        ['Fr.Moses Assey', 'Rector', relativePath]
      );
    } else {
      // Existing data, update only signature_image_path
      await query(
        `UPDATE authority_data 
         SET signature_image_path = $1, updated_at = NOW() 
         WHERE id = 1`,
        [relativePath]
      );
    }

    res.json({ message: 'Signature image uploaded successfully', signature_path: relativePath });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete authority signature image
router.post('/authority-data/delete-signature', async (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs').promises;

    // Get existing signature path
    const result = await query('SELECT signature_image_path FROM authority_data WHERE id = 1');
    const signaturePath = result.rows[0]?.signature_image_path;

    if (signaturePath) {
      // Delete file
      try {
        const filePath = path.join(__dirname, '../static', signaturePath);
        await fs.unlink(filePath);
      } catch (err) {
        console.log('Signature file not found or already deleted');
      }

      // Update database
      await query(
        'UPDATE authority_data SET signature_image_path = $1 WHERE id = 1',
        ['']
      );
    }

    res.json({ message: 'Signature image deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get patron saint image
router.get('/patron-saint-image', async (req, res) => {
  try {
    const result = await query('SELECT patron_saint_image FROM website_settings WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({ patron_saint_image: null });
    }
    res.json({ patron_saint_image: result.rows[0].patron_saint_image || null });
  } catch (error) {
    console.error('[PATRON SAINT] Error fetching image:', error);
    return sendError(res, error, 500);
  }
});

// Upload patron saint image
router.post('/patron-saint-image', upload.single('patron_saint_file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Get old patron saint image path
    const oldImageResult = await query('SELECT patron_saint_image FROM website_settings WHERE id = 1');
    const oldImagePath = oldImageResult.rows[0]?.patron_saint_image;

    // Delete old image if exists
    if (oldImagePath) {
      try {
        const oldFilePath = path.join(__dirname, '../static', oldImagePath);
        await fs.unlink(oldFilePath);
      } catch (err) {
        console.log('Old patron saint image file not found or already deleted');
      }
    }

    // Generate unique filename
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    const relativePath = `uploads/photos/${filename}`;
    const photosDir = path.join(__dirname, '../static/uploads/photos');
    const newFilePath = path.join(photosDir, filename);

    // Ensure directory exists
    await fs.mkdir(photosDir, { recursive: true });

    // Move uploaded file from multer's temp location to final location
    try {
      if (req.file.path && req.file.path !== newFilePath) {
        await fs.access(req.file.path);
        await fs.rename(req.file.path, newFilePath);
        console.log('[PATRON SAINT] File moved from', req.file.path, 'to', newFilePath);
      } else {
        console.log('[PATRON SAINT] File already in correct location:', newFilePath);
      }
    } catch (moveError) {
      console.error('[PATRON SAINT] Error moving file:', moveError);
      try {
        await fs.copyFile(req.file.path, newFilePath);
        await fs.unlink(req.file.path);
        console.log('[PATRON SAINT] File copied to:', newFilePath);
      } catch (copyError) {
        console.error('[PATRON SAINT] Error copying file:', copyError);
        throw new Error(`Failed to save file: ${copyError.message}`);
      }
    }

    // Check if website_settings exists
    const existingResult = await query('SELECT id FROM website_settings WHERE id = 1');
    
    if (existingResult.rows.length === 0) {
      // Insert new record
      await query(
        `INSERT INTO website_settings (id, patron_saint_image)
         VALUES (1, $1)`,
        [relativePath]
      );
    } else {
      // Update existing record
      await query(
        `UPDATE website_settings 
         SET patron_saint_image = $1 
         WHERE id = 1`,
        [relativePath]
      );
    }

    console.log('[PATRON SAINT] Image saved to database:', relativePath);
    res.json({ message: 'Patron saint image uploaded successfully', patron_saint_image_path: relativePath });
  } catch (error) {
    console.error('[PATRON SAINT] Upload error:', error);
    return sendError(res, error, 500);
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, username, full_name, role, status, permissions, email, phone, profile_picture, bio, department, position FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = result.rows[0];
    user.permissions = user.permissions ? JSON.parse(user.permissions) : null;
    
    res.json({ user });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save user (create or update)
router.post('/users', async (req, res) => {
  try {
    const { id, username, full_name, password, role, status, permissions, email, phone, bio, department, position } = req.body;
    
    if (!username || !full_name || !role) {
      return res.status(400).json({ message: 'username, full_name, and role are required' });
    }
    
    // Check if username exists (for new users or if username changed)
    if (!id) {
      const existingUser = await query('SELECT id FROM users WHERE username = $1', [username]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: 'Username already exists' });
      }
    }
    
    // Hash password if provided
    let passwordHash = null;
    if (password) {
      const bcrypt = require('bcryptjs');
      passwordHash = await bcrypt.hash(password, 10);
    } else if (!id) {
      return res.status(400).json({ message: 'Password is required for new users' });
    }
    
    // Get existing password hash if updating without password
    if (id && !passwordHash) {
      const existingUser = await query('SELECT password_hash FROM users WHERE id = $1', [id]);
      if (existingUser.rows.length > 0) {
        passwordHash = existingUser.rows[0].password_hash;
      }
    }
    
    // Serialize permissions
    const permissionsJson = permissions ? JSON.stringify(permissions) : null;
    
    if (id) {
      // Update existing user
      await query(
        `UPDATE users 
         SET username = $1, full_name = $2, password_hash = $3, role = $4, status = $5, 
         permissions = $6, email = $7, phone = $8, bio = $9, department = $10, position = $11, updated_at = NOW()
         WHERE id = $12`,
        [username, full_name, passwordHash, role, status || 'active', permissionsJson, email || null, phone || null, bio || null, department || null, position || null, id]
      );
    } else {
      // Create new user
      await query(
        `INSERT INTO users (username, password_hash, full_name, role, status, permissions, email, phone, bio, department, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [username, passwordHash, full_name, role, status || 'active', permissionsJson, email || null, phone || null, bio || null, department || null, position || null]
      );
    }
    
    res.json({ message: `User ${id ? 'updated' : 'created'} successfully` });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is protected
    const userResult = await query('SELECT role FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const role = userResult.rows[0].role;
    if (role === 'admin' || role === 'superadmin' || role === 'SUPERADMIN') {
      return res.status(400).json({ message: 'Cannot delete admin or superadmin users' });
    }
    
    await query('DELETE FROM users WHERE id = $1', [id]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get subjects for permission management
router.get('/subjects-list', async (req, res) => {
  try {
    const result = await query(
      'SELECT DISTINCT subject_name, subject_code, level, stream FROM subjects ORDER BY level, stream, subject_name'
    );
    res.json({ subjects: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== STUDENT PROMOTION ==========

// Get promotion dashboard data
router.get('/promotion/dashboard', async (req, res) => {
  try {
    // Get recent promotion sessions
    const sessionsResult = await query(
      `SELECT * FROM promotion_sessions 
       ORDER BY created_at DESC 
       LIMIT 20`
    );
    
    res.json({ sessions: sessionsResult.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get promotion preview data
router.get('/promotion/preview', async (req, res) => {
  try {
    const { level, stream, year } = req.query;
    
    if (!level || !stream || !year) {
      return res.status(400).json({ message: 'level, stream, and year are required' });
    }
    
    // Get students from source class
    const studentsResult = await query(
      'SELECT * FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY adm_no',
      [level, stream, parseInt(year)]
    );
    
    // Determine next level and stream
    const getNextLevel = (currentLevel) => {
      const progression = {
        'FORM I': { next: 'FORM II', stream: 'NA', requiresSelection: false },
        'FORM II': { next: 'FORM III', stream: 'NA', requiresSelection: false },
        'FORM III': { next: 'FORM IV', stream: 'NA', requiresSelection: false },
        'FORM IV': { next: 'FORM V', stream: null, requiresSelection: true },
        'FORM V': { next: 'FORM VI', stream: stream, requiresSelection: false },
        'FORM VI': { next: 'GRADUATED', stream: 'NA', requiresSelection: false },
      };
      return progression[currentLevel] || { next: null, stream: 'NA', requiresSelection: false };
    };
    
    const nextLevelInfo = getNextLevel(level);
    const nextYear = parseInt(year) + 1;
    
    // Get excluded students
    const exclusionsResult = await query(
      'SELECT adm_no FROM promotion_exclusions WHERE level = $1 AND stream = $2 AND year = $3',
      [level, stream, parseInt(year)]
    );
    const excludedAdmNos = exclusionsResult.rows.map(row => row.adm_no);
    
    // Check if promotion already executed
    const existingPromotion = await query(
      'SELECT * FROM promotion_sessions WHERE from_level = $1 AND from_stream = $2 AND from_year = $3 LIMIT 1',
      [level, stream, parseInt(year)]
    );
    
    res.json({
      students: studentsResult.rows,
      next_level: nextLevelInfo.next,
      next_stream: nextLevelInfo.stream,
      next_year: nextYear,
      requires_stream_selection: nextLevelInfo.requiresSelection,
      excluded_adm_nos: excludedAdmNos,
      already_promoted: existingPromotion.rows.length > 0,
    });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Execute promotion
router.post('/promotion/execute', async (req, res) => {
  try {
    const { from_level, from_stream, from_year, to_level, to_stream, to_year, excluded_adm_nos = [] } = req.body;
    
    if (!from_level || !from_stream || !from_year || !to_level || !to_stream || !to_year) {
      return res.status(400).json({ message: 'All promotion parameters are required' });
    }
    
    // Check if promotion already executed
    const existingPromotion = await query(
      'SELECT * FROM promotion_sessions WHERE from_level = $1 AND from_stream = $2 AND from_year = $3 LIMIT 1',
      [from_level, from_stream, parseInt(from_year)]
    );
    
    if (existingPromotion.rows.length > 0) {
      return res.status(400).json({ message: 'Promotion already executed for this class' });
    }
    
    // Get all students from source class
    const studentsResult = await query(
      'SELECT * FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY adm_no',
      [from_level, from_stream, parseInt(from_year)]
    );
    
    const allStudents = studentsResult.rows;
    const studentsToPromote = allStudents.filter(s => !excluded_adm_nos.includes(s.adm_no));
    
    let promotedCount = 0;
    let failedCount = 0;
    
    // Promote each student (one transaction per student)
    for (const student of studentsToPromote) {
      try {
        await withTransaction(async (client) => {
          // Save student to new class
          await client.query(
            `INSERT INTO students (adm_no, first_name, middle_name, surname, sex, level, stream, year, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (adm_no, level, stream, year)
             DO UPDATE SET 
               first_name = EXCLUDED.first_name,
               middle_name = EXCLUDED.middle_name,
               surname = EXCLUDED.surname,
               sex = EXCLUDED.sex,
               status = EXCLUDED.status`,
            [student.adm_no, student.first_name, student.middle_name || null, student.surname, student.sex, to_level, to_stream, parseInt(to_year), 'PENDING']
          );

          const newClassStudents = await client.query(
            'SELECT adm_no FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY adm_no',
            [to_level, to_stream, parseInt(to_year)]
          );
          const newStudentIndex = newClassStudents.rows.findIndex(s => s.adm_no === student.adm_no);

          if (newStudentIndex >= 0) {
            const oldClassStudents = await client.query(
              'SELECT adm_no FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY adm_no',
              [from_level, from_stream, parseInt(from_year)]
            );
            const oldStudentIndex = oldClassStudents.rows.findIndex(s => s.adm_no === student.adm_no);

            if (oldStudentIndex >= 0) {
              const oldPhoto = await client.query(
                'SELECT photo_filename FROM student_photos WHERE level = $1 AND stream = $2 AND year = $3 AND student_index = $4',
                [from_level, from_stream, parseInt(from_year), oldStudentIndex]
              );
              if (oldPhoto.rows.length > 0) {
                await client.query(
                  `INSERT INTO student_photos (level, stream, year, student_index, photo_filename)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT (level, stream, year, student_index)
                   DO UPDATE SET photo_filename = EXCLUDED.photo_filename`,
                  [to_level, to_stream, parseInt(to_year), newStudentIndex, oldPhoto.rows[0].photo_filename]
                );
              }

              const oldParish = await client.query(
                'SELECT parish_name FROM student_parishes WHERE level = $1 AND stream = $2 AND year = $3 AND student_index = $4',
                [from_level, from_stream, parseInt(from_year), oldStudentIndex]
              );
              if (oldParish.rows.length > 0) {
                await client.query(
                  `INSERT INTO student_parishes (level, stream, year, student_index, parish_name)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT (level, stream, year, student_index)
                   DO UPDATE SET parish_name = EXCLUDED.parish_name`,
                  [to_level, to_stream, parseInt(to_year), newStudentIndex, oldParish.rows[0].parish_name]
                );
              }

              const existingSubjects = await client.query(
                'SELECT subject_code FROM subjects WHERE level = $1 AND stream = $2 AND year = $3',
                [to_level, to_stream, parseInt(to_year)]
              );
              const existingSubjectCodes = existingSubjects.rows.map(s => s.subject_code);
              const oldSubjects = await client.query(
                'SELECT subject_code, subject_name, subject_abbreviation FROM subjects WHERE level = $1 AND stream = $2 AND year = $3',
                [from_level, from_stream, parseInt(from_year)]
              );
              for (const oldSubject of oldSubjects.rows) {
                if (!existingSubjectCodes.includes(oldSubject.subject_code)) {
                  await client.query(
                    `INSERT INTO subjects (level, stream, year, subject_code, subject_name, subject_abbreviation)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (level, stream, year, subject_code)
                     DO UPDATE SET subject_name = EXCLUDED.subject_name, subject_abbreviation = EXCLUDED.subject_abbreviation`,
                    [to_level, to_stream, parseInt(to_year), oldSubject.subject_code, oldSubject.subject_name, oldSubject.subject_abbreviation]
                  );
                }
              }

              const existingTeachers = await client.query(
                'SELECT subject_code FROM subject_teachers WHERE level = $1 AND stream = $2 AND year = $3',
                [to_level, to_stream, parseInt(to_year)]
              );
              const existingTeacherSubjectCodes = existingTeachers.rows.map(t => t.subject_code);
              const oldTeachers = await client.query(
                'SELECT subject_code, teacher_name, teacher_signature FROM subject_teachers WHERE level = $1 AND stream = $2 AND year = $3',
                [from_level, from_stream, parseInt(from_year)]
              );
              for (const oldTeacher of oldTeachers.rows) {
                if (!existingTeacherSubjectCodes.includes(oldTeacher.subject_code)) {
                  await client.query(
                    `INSERT INTO subject_teachers (level, stream, year, subject_code, teacher_name, teacher_signature)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (level, stream, year, subject_code)
                     DO UPDATE SET teacher_name = EXCLUDED.teacher_name, teacher_signature = EXCLUDED.teacher_signature`,
                    [to_level, to_stream, parseInt(to_year), oldTeacher.subject_code, oldTeacher.teacher_name, oldTeacher.teacher_signature || null]
                  );
                }
              }

              const hudumaComments = await client.query(
                'SELECT term, comment_text FROM comments WHERE comment_type = $1 AND level = $2 AND stream = $3 AND year = $4 AND student_index = $5',
                ['Huduma', from_level, from_stream, parseInt(from_year), oldStudentIndex.toString()]
              );
              for (const comment of hudumaComments.rows) {
                await client.query(
                  `INSERT INTO comments (comment_type, level, stream, year, term, student_index, comment_text)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)
                   ON CONFLICT (comment_type, level, stream, year, term, student_index)
                   DO UPDATE SET comment_text = EXCLUDED.comment_text`,
                  ['Huduma', to_level, to_stream, parseInt(to_year), comment.term, newStudentIndex.toString(), comment.comment_text]
                );
              }

              const michezoComments = await client.query(
                'SELECT term, comment_text FROM comments WHERE comment_type = $1 AND level = $2 AND stream = $3 AND year = $4 AND student_index = $5',
                ['Michezo', from_level, from_stream, parseInt(from_year), oldStudentIndex.toString()]
              );
              for (const comment of michezoComments.rows) {
                await client.query(
                  `INSERT INTO comments (comment_type, level, stream, year, term, student_index, comment_text)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)
                   ON CONFLICT (comment_type, level, stream, year, term, student_index)
                   DO UPDATE SET comment_text = EXCLUDED.comment_text`,
                  ['Michezo', to_level, to_stream, parseInt(to_year), comment.term, newStudentIndex.toString(), comment.comment_text]
                );
              }
            }
          }

          await client.query(
            `INSERT INTO student_history (adm_no, full_name, current_level, current_stream, current_year, previous_level, previous_stream, previous_year, promoted_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (adm_no, current_level, current_stream, current_year)
             DO UPDATE SET 
               previous_level = EXCLUDED.previous_level,
               previous_stream = EXCLUDED.previous_stream,
               previous_year = EXCLUDED.previous_year,
               promotion_date = NOW(),
               promoted_by = EXCLUDED.promoted_by`,
            [
              student.adm_no,
              `${student.first_name} ${student.middle_name || ''} ${student.surname}`.trim(),
              to_level,
              to_stream,
              parseInt(to_year),
              from_level,
              from_stream,
              parseInt(from_year),
              req.user?.username || 'system'
            ]
          );
        });
        promotedCount++;
      } catch (error) {
        console.error(`Failed to promote student ${student.adm_no}:`, error);
        failedCount++;
      }
    }
    
    // Save promotion session
    const sessionId = uuidv4();
    
    await query(
      `INSERT INTO promotion_sessions (session_id, from_level, from_stream, from_year, to_level, to_stream, to_year, total_students, promoted_count, excluded_count, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        sessionId,
        from_level,
        from_stream,
        parseInt(from_year),
        to_level,
        to_stream,
        parseInt(to_year),
        allStudents.length,
        promotedCount,
        excluded_adm_nos.length,
        req.user?.username || 'system'
      ]
    );
    
    res.json({
      message: `Promotion completed: ${promotedCount} students promoted, ${excluded_adm_nos.length} excluded, ${failedCount} failed`,
      promoted_count: promotedCount,
      excluded_count: excluded_adm_nos.length,
      failed_count: failedCount,
    });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get student promotion history
router.get('/promotion/history/:admNo', async (req, res) => {
  try {
    const { admNo } = req.params;
    
    const result = await query(
      `SELECT * FROM student_history 
       WHERE adm_no = $1 
       ORDER BY promotion_date DESC`,
      [admNo]
    );
    
    res.json({ history: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save promotion exclusion
router.post('/promotion/exclusions', async (req, res) => {
  try {
    const { adm_no, level, stream, year, reason } = req.body;
    
    if (!adm_no || !level || !stream || !year || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    await query(
      `INSERT INTO promotion_exclusions (adm_no, level, stream, year, reason, excluded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (adm_no, level, stream, year)
       DO UPDATE SET reason = EXCLUDED.reason, excluded_by = EXCLUDED.excluded_by, excluded_at = NOW()`,
      [adm_no, level, stream, parseInt(year), reason, req.user?.username || 'system']
    );
    
    res.json({ message: 'Exclusion saved successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete promotion exclusion
router.delete('/promotion/exclusions', async (req, res) => {
  try {
    const { adm_no, level, stream, year } = req.query;
    
    if (!adm_no || !level || !stream || !year) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    await query(
      'DELETE FROM promotion_exclusions WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4',
      [adm_no, level, stream, parseInt(year)]
    );
    
    res.json({ message: 'Exclusion removed successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== PUBLIC WEBSITE MANAGEMENT ==========

// ========== EVENTS ==========

// ========== EVENTS ==========
// Events routes removed

// ========== GALLERY ==========

// Get all gallery photos
router.get('/gallery', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM gallery_photos ORDER BY created_at DESC'
    );
    res.json({ photos: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Upload gallery photos with multer error handling
router.post('/gallery/upload', (req, res, next) => {
  upload.array('photos', 20)(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File size too large. Maximum size is 16MB per file.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ message: 'Too many files. Maximum is 20 files.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ message: 'Unexpected file field. Use "photos" as the field name.' });
        }
        return res.status(400).json({ message: 'Upload error: ' + err.message });
      }
      return res.status(400).json({ message: 'File upload error: ' + err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    console.log(`Processing ${req.files.length} file(s) for gallery upload`);
    
    const { category = 'general', caption = '', date } = req.body;
    
    const uploadedPhotos = [];
    const errors = [];
    
    // Ensure photos directory exists
    const photosDir = path.join(__dirname, '../static/uploads/photos');
    try {
      await fs.mkdir(photosDir, { recursive: true });
    } catch (dirError) {
      console.error('Error creating photos directory:', dirError);
      return sendError(res, dirError, 500);
    }
    
    for (let i = 0; i < req.files.length; i++) {
      try {
        const file = req.files[i];
        
        if (!file || !file.path) {
          errors.push({ file: file?.originalname || `File ${i}`, error: 'File path is missing' });
          continue;
        }
        
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `${uuidv4()}${ext}`;
        const relativePath = `uploads/photos/${filename}`;
        const newFilePath = path.join(__dirname, '../static', relativePath);
        
        // Check if source file exists
        try {
          await fs.access(file.path);
        } catch (accessError) {
          errors.push({ file: file.originalname, error: `Source file not found: ${file.path}` });
          continue;
        }
        
        // Move file from temp location to final location
        try {
          await fs.rename(file.path, newFilePath);
        } catch (renameError) {
          // If rename fails (e.g., cross-device), try copy then unlink
          console.log(`Rename failed, trying copy: ${renameError.message}`);
          await fs.copyFile(file.path, newFilePath);
          await fs.unlink(file.path).catch(() => {}); // Ignore errors deleting temp file
        }
        
        const photoId = `photo_${Date.now()}_${i}`;
        
        await query(
          `INSERT INTO gallery_photos (id, path, category, caption, date, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [photoId, relativePath, category, caption || null, date || new Date().toISOString().split('T')[0], req.user?.username || 'admin']
        );
        
        uploadedPhotos.push({ id: photoId, path: relativePath });
      } catch (fileError) {
        console.error(`Error processing file ${i} (${req.files[i]?.originalname}):`, fileError);
        errors.push({ file: req.files[i]?.originalname || `File ${i}`, error: fileError.message });
        // Try to clean up temp file
        try {
          if (req.files[i]?.path) {
            await fs.unlink(req.files[i].path).catch(() => {});
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
    }
    
    if (uploadedPhotos.length === 0) {
      return res.status(400).json({ 
        message: 'Failed to upload any photos', 
        errors: errors 
      });
    }
    
    res.json({ 
      message: `${uploadedPhotos.length} photo(s) uploaded successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`, 
      photos: uploadedPhotos,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Gallery upload error:', error);
    // Ensure response hasn't been sent
    if (!res.headersSent) {
      return sendError(res, error, 500);
    } else {
      console.error('Response already sent, cannot send error response');
    }
  }
});

// Delete all gallery photos (admin only)
router.delete('/gallery/delete-all', requireRole('admin'), async (req, res) => {
  try {
    console.log('🗑️  Deleting all gallery photos...');
    
    // Step 1: Get all gallery photos from database
    const result = await query('SELECT id, path FROM gallery_photos');
    const photos = result.rows;
    console.log(`   Found ${photos.length} photo(s) in database`);
    
    // Step 2: Delete physical files
    const photosDir = path.join(__dirname, '../static/uploads/photos');
    let deletedFiles = 0;
    let failedFiles = [];
    
    try {
      const files = await fs.readdir(photosDir);
      console.log(`   Found ${files.length} file(s) in photos directory`);
      
      for (const file of files) {
        try {
          const filePath = path.join(photosDir, file);
          await fs.unlink(filePath);
          deletedFiles++;
          console.log(`   ✓ Deleted: ${file}`);
        } catch (err) {
          failedFiles.push({ file, error: err.message });
          console.error(`   ✗ Failed to delete ${file}: ${err.message}`);
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`   ✗ Error reading photos directory: ${err.message}`);
      }
    }
    
    // Step 3: Delete all records from database
    const deleteResult = await query('DELETE FROM gallery_photos');
    console.log(`   ✓ Deleted ${deleteResult.rowCount} record(s) from database`);
    
    // Log activity
    await saveUserActivity(req.user.id, 'delete_all_gallery_photos', {
      deletedCount: deleteResult.rowCount,
      deletedFiles: deletedFiles
    });
    
    res.json({
      message: `Successfully deleted ${deleteResult.rowCount} photo(s) from database and ${deletedFiles} file(s) from disk`,
      deletedRecords: deleteResult.rowCount,
      deletedFiles: deletedFiles,
      failedFiles: failedFiles.length > 0 ? failedFiles : undefined
    });
  } catch (error) {
    console.error('Error deleting all gallery photos:', error);
    return sendError(res, error, 500);
  }
});

// Delete gallery photo
router.delete('/gallery/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const photoResult = await query('SELECT path FROM gallery_photos WHERE id = $1', [id]);
    if (photoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Photo not found' });
    }
    
    const photoPath = photoResult.rows[0].path;
    const path = require('path');
    const fs = require('fs').promises;
    
    try {
      const filePath = path.join(__dirname, '../static', photoPath);
      await fs.unlink(filePath);
    } catch (err) {
      console.log('Photo file not found or already deleted');
    }
    
    await query('DELETE FROM gallery_photos WHERE id = $1', [id]);
    
    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== ALUMNI ==========

// Get all alumni
router.get('/alumni', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM alumni ORDER BY official_names ASC'
    );
    res.json({ alumni: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save alumni (public submission)
router.post('/alumni', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Photo is required' });
    }
    
    const { official_names, year_start, year_end, class_level, current_position, phone, email, social_media, philosophy } = req.body;
    
    if (!official_names || !year_start || !year_end) {
      return res.status(400).json({ message: 'official_names, year_start, and year_end are required' });
    }
    
    
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    const relativePath = `uploads/photos/${filename}`;
    const newFilePath = path.join(__dirname, '../static', relativePath);
    
    await fs.mkdir(path.dirname(newFilePath), { recursive: true });
    await fs.rename(req.file.path, newFilePath);
    
    const alumniId = `alumni_${Date.now()}`;
    
    await query(
      `INSERT INTO alumni (id, official_names, year_start, year_end, class_level, current_position, phone, email, social_media, philosophy, photo, submitted_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [alumniId, official_names, year_start, year_end, class_level || null, current_position || null, phone || null, email || null, social_media || null, philosophy || null, relativePath, new Date().toISOString().split('T')[0], 'pending']
    );
    
    res.json({ message: 'Alumni registration submitted successfully. Awaiting approval.', id: alumniId });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Update alumni status (approve/reject)
router.post('/alumni/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    await query('UPDATE alumni SET status = $1 WHERE id = $2', [status, id]);
    res.json({ message: `Alumni ${status} successfully` });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete alumni
router.delete('/alumni/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const alumniResult = await query('SELECT photo FROM alumni WHERE id = $1', [id]);
    if (alumniResult.rows.length > 0 && alumniResult.rows[0].photo) {
      const path = require('path');
      const fs = require('fs').promises;
      try {
        const filePath = path.join(__dirname, '../static', alumniResult.rows[0].photo);
        await fs.unlink(filePath);
      } catch (err) {
        console.log('Photo file not found or already deleted');
      }
    }
    
    await query('DELETE FROM alumni WHERE id = $1', [id]);
    res.json({ message: 'Alumni deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== TESTIMONIES ==========
// Testimonies routes removed


// ========== FAQs ==========

// Get all FAQs
router.get('/faqs', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM faqs ORDER BY display_order ASC, created_at DESC'
    );
    res.json({ faqs: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get active FAQs (for public)
router.get('/faqs/active', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM faqs WHERE active = 1 ORDER BY display_order ASC, created_at DESC LIMIT 5'
    );
    res.json({ faqs: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save FAQ
router.post('/faqs', async (req, res) => {
  try {
    const { id, question, answer, category, display_order, active = true } = req.body;
    
    if (!question || !answer) {
      return res.status(400).json({ message: 'question and answer are required' });
    }
    
    const faqId = id || uuidv4();
    
    // Check if FAQ exists
    const existing = await query('SELECT id FROM faqs WHERE id = $1', [faqId]);
    
    if (existing.rows.length > 0) {
      // Update existing
      await query(
        `UPDATE faqs SET 
         question = $1,
         answer = $2,
         category = $3,
         display_order = $4,
         active = $5,
         updated_at = NOW()
         WHERE id = $6`,
        [question, answer, category || 'General', display_order || 0, active, faqId]
      );
    } else {
      // Insert new
      await query(
        `INSERT INTO faqs (id, question, answer, category, display_order, active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [faqId, question, answer, category || 'General', display_order || 0, active]
      );
    }
    
    res.json({ message: 'FAQ saved successfully', id: faqId });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Toggle FAQ active status
router.post('/faqs/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    
    await query('UPDATE faqs SET active = $1 WHERE id = $2', [active, id]);
    res.json({ message: `FAQ ${active ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete FAQ
router.delete('/faqs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM faqs WHERE id = $1', [id]);
    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Bulk insert FAQs
router.post('/faqs/bulk', async (req, res) => {
  try {
    const { faqs } = req.body;
    
    if (!Array.isArray(faqs) || faqs.length === 0) {
      return res.status(400).json({ message: 'faqs array is required' });
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const faq of faqs) {
      try {
        if (!faq.question || !faq.answer) {
          errorCount++;
          errors.push({ faq, error: 'question and answer are required' });
          continue;
        }
        
        const faqId = faq.id || uuidv4();
        await query(
          `INSERT INTO faqs (id, question, answer, category, display_order, active)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [
            faqId,
            faq.question,
            faq.answer,
            faq.category || 'General',
            faq.display_order || 0,
            faq.active !== false
          ]
        );
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({ faq, error: error.message });
      }
    }
    
    res.json({
      message: `Bulk insert completed: ${successCount} FAQs added, ${errorCount} errors`,
      success_count: successCount,
      error_count: errorCount,
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== DEPARTMENT CONTACTS ==========

// Get department contacts (from website settings)
router.get('/department-contacts', async (req, res) => {
  try {
    const result = await query('SELECT admissions_email, academics_email, bursar_email, alumni_email, parents_email FROM website_settings WHERE id = 1');
    
    if (result.rows.length === 0) {
      return res.json({
        contacts: {
          admissions_email: '',
          academics_email: '',
          bursar_email: '',
          alumni_email: '',
          parents_email: '',
        },
      });
    }
    
    res.json({ contacts: result.rows[0] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Update department contacts
router.post('/department-contacts', async (req, res) => {
  try {
    const { admissions_email, academics_email, bursar_email, alumni_email, parents_email } = req.body;
    
    // Check if settings exist
    const existing = await query('SELECT id FROM website_settings WHERE id = 1');
    
    if (existing.rows.length > 0) {
      // Update existing
      await query(
        `UPDATE website_settings SET 
         admissions_email = $1,
         academics_email = $2,
         bursar_email = $3,
         alumni_email = $4,
         parents_email = $5,
         updated_at = NOW()
         WHERE id = 1`,
        [admissions_email || '', academics_email || '', bursar_email || '', alumni_email || '', parents_email || '']
      );
    } else {
      // Insert new
      await query(
        `INSERT INTO website_settings (id, admissions_email, academics_email, bursar_email, alumni_email, parents_email)
         VALUES (1, $1, $2, $3, $4, $5)`,
        [admissions_email || '', academics_email || '', bursar_email || '', alumni_email || '', parents_email || '']
      );
    }
    
    res.json({ message: 'Department contacts updated successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== PUBLIC PAGES ==========

// Get all public pages
router.get('/public-pages', async (req, res) => {
  try {
    const result = await query('SELECT * FROM public_pages ORDER BY page_name');
    res.json({ pages: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get public page by name
router.get('/public-pages/:pageName', async (req, res) => {
  try {
    const { pageName } = req.params;
    const result = await query('SELECT * FROM public_pages WHERE page_name = $1', [pageName]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Page not found' });
    }
    
    res.json({ page: result.rows[0] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save public page
router.post('/public-pages', async (req, res) => {
  try {
    const { page_name, title, html_content } = req.body;
    
    if (!page_name || !title || !html_content) {
      return res.status(400).json({ message: 'page_name, title, and html_content are required' });
    }
    
    // Check if page exists
    const existing = await query('SELECT page_name FROM public_pages WHERE page_name = $1', [page_name]);
    
    if (existing.rows.length > 0) {
      // Update existing
      await query(
        `UPDATE public_pages SET 
         title = $1,
         html_content = $2,
         updated_at = NOW()
         WHERE page_name = $3`,
        [title, html_content, page_name]
      );
    } else {
      // Insert new
      await query(
        `INSERT INTO public_pages (page_name, title, html_content)
         VALUES ($1, $2, $3)`,
        [page_name, title, html_content]
      );
    }
    
    res.json({ message: 'Page saved successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== NECTA RESULTS URLS MANAGEMENT ==========

// Get all NECTA result URLs
router.get('/necta-urls', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM necta_result_urls ORDER BY exam_type, year DESC'
    );
    res.json({ urls: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get NECTA URL by exam type and year
router.get('/necta-urls/:examType/:year', async (req, res) => {
  try {
    const { examType, year } = req.params;
    const result = await query(
      'SELECT * FROM necta_result_urls WHERE exam_type = $1 AND year = $2',
      [examType, parseInt(year)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'URL not found' });
    }
    res.json({ url: result.rows[0] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save NECTA result URL
router.post('/necta-urls', async (req, res) => {
  try {
    const { id, exam_type, year, url, description, active = true } = req.body;
    
    if (!exam_type || !year || !url) {
      return res.status(400).json({ message: 'exam_type, year, and url are required' });
    }
    
    // Validate exam_type
    if (!['ftna', 'csee', 'acsee'].includes(exam_type.toLowerCase())) {
      return res.status(400).json({ message: 'exam_type must be ftna, csee, or acsee' });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid URL format' });
    }
    
    const urlId = id || uuidv4();
    
    // Check if URL exists
    const existing = await query(
      'SELECT id FROM necta_result_urls WHERE exam_type = $1 AND year = $2',
      [exam_type.toLowerCase(), parseInt(year)]
    );
    
    if (existing.rows.length > 0 && existing.rows[0].id !== urlId) {
      return res.status(400).json({ message: 'URL already exists for this exam type and year' });
    }
    
    if (existing.rows.length > 0 && existing.rows[0].id === urlId) {
      // Update existing
      await query(
        `UPDATE necta_result_urls SET 
         exam_type = $1,
         year = $2,
         url = $3,
         description = $4,
         active = $5,
         updated_at = NOW()
         WHERE id = $6`,
        [exam_type.toLowerCase(), parseInt(year), url, description || null, active, urlId]
      );
    } else {
      // Insert new
      await query(
        `INSERT INTO necta_result_urls (id, exam_type, year, url, description, active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [urlId, exam_type.toLowerCase(), parseInt(year), url, description || null, active]
      );
    }
    
    res.json({ message: 'NECTA URL saved successfully', id: urlId });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete NECTA result URL
router.delete('/necta-urls/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM necta_result_urls WHERE id = $1', [id]);
    res.json({ message: 'NECTA URL deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Toggle NECTA URL active status
router.post('/necta-urls/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    
    await query('UPDATE necta_result_urls SET active = $1 WHERE id = $2', [active, id]);
    res.json({ message: `NECTA URL ${active ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== NECTA IMPORT & ANALYTICS (for AI and reports) ==========
const axios = require('axios');
const cheerio = require('cheerio');
const { parseNectaResultsTable } = require('../utils/nectaParser');

async function ensureNectaTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS necta_candidates (
      id SERIAL PRIMARY KEY,
      exam_type VARCHAR(20) NOT NULL,
      year INTEGER NOT NULL,
      candidate_no VARCHAR(100),
      candidate_name VARCHAR(500),
      sex VARCHAR(100),
      division VARCHAR(100),
      points INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(exam_type, year, candidate_no)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS necta_subject_grades (
      id SERIAL PRIMARY KEY,
      exam_type VARCHAR(20) NOT NULL,
      year INTEGER NOT NULL,
      candidate_no VARCHAR(100) NOT NULL,
      subject_code VARCHAR(100),
      subject_name VARCHAR(300),
      grade VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try {
    await query('ALTER TABLE necta_candidates ALTER COLUMN candidate_no TYPE VARCHAR(100), ALTER COLUMN sex TYPE VARCHAR(100), ALTER COLUMN division TYPE VARCHAR(100)');
  } catch (_) {}
  try {
    await query('ALTER TABLE necta_subject_grades ALTER COLUMN candidate_no TYPE VARCHAR(100), ALTER COLUMN subject_name TYPE VARCHAR(300), ALTER COLUMN grade TYPE VARCHAR(50)');
  } catch (_) {}
}

function gradeToPoint(grade) {
  const g = (grade || '').toString().trim().toUpperCase();
  if (['I', 'A', '1'].includes(g)) return 5;
  if (['II', 'B', '2'].includes(g)) return 4;
  if (['III', 'C', '3'].includes(g)) return 3;
  if (['IV', 'D', '4'].includes(g)) return 2;
  if (['0', 'E', '5'].includes(g)) return 1;
  return 0; // F, 6, 7, etc.
}

// Import NECTA results from URL (from necta_result_urls or generated)
router.post('/necta/import', async (req, res) => {
  try {
    const { exam_type, year } = req.body;
    if (!exam_type || !year) {
      return res.status(400).json({ message: 'exam_type and year required' });
    }
    const exam = (exam_type + '').toLowerCase();
    const yearInt = parseInt(year, 10);
    if (!['ftna', 'csee', 'acsee'].includes(exam) || isNaN(yearInt)) {
      return res.status(400).json({ message: 'Invalid exam_type or year' });
    }
    await ensureNectaTables();

    let url;
    const custom = await query(
      'SELECT url FROM necta_result_urls WHERE exam_type = $1 AND year = $2 AND active = TRUE',
      [exam, yearInt]
    );
    if (custom.rows.length > 0) {
      url = custom.rows[0].url;
    } else {
      if (yearInt >= 2020 && yearInt <= 2021) {
        const code = exam === 'csee' ? 's0171' : 'S0171';
        url = `https://maktaba.tetea.org/exam-results/${exam.toUpperCase()}${yearInt}/${code}.htm`;
      } else {
        const code = exam === 'ftna' ? 'S0171' : 's0171';
        url = `https://onlinesys.necta.go.tz/results/${yearInt}/${exam}/results/${code}.htm`;
      }
    }

    let response;
    try {
      response = await axios.get(url, { timeout: 20000 });
    } catch (fetchErr) {
      if (fetchErr.response?.status === 404) {
        return res.status(404).json({ message: 'NECTA result page not found (404). Check the URL in NECTA URLs or try a different year.' });
      }
      throw fetchErr;
    }
    const html = response.data;
    const { candidates } = parseNectaResultsTable(html);

    if (!candidates || candidates.length === 0) {
      return res.json({ message: 'No candidate rows parsed. Table format may differ.', imported: 0 });
    }

    const str = (v, maxLen) => (v == null ? '' : String(v).trim().slice(0, maxLen));

    await query('DELETE FROM necta_subject_grades WHERE exam_type = $1 AND year = $2', [exam, yearInt]);
    await query('DELETE FROM necta_candidates WHERE exam_type = $1 AND year = $2', [exam, yearInt]);

    for (const c of candidates) {
      const candNo = str(c.candidate_no, 100);
      const candName = str(c.candidate_name, 500);
      const sexVal = str(c.sex, 100);
      const divVal = str(c.division, 100);
      await query(
        `INSERT INTO necta_candidates (exam_type, year, candidate_no, candidate_name, sex, division, points)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (exam_type, year, candidate_no) DO UPDATE SET
         candidate_name = EXCLUDED.candidate_name, sex = EXCLUDED.sex, division = EXCLUDED.division, points = EXCLUDED.points`,
        [exam, yearInt, candNo || 'unknown', candName, sexVal, divVal, c.points]
      );
      for (const g of (c.grades || [])) {
        const subjName = str((g.subject_name || '').trim() || 'Subject', 300);
        const gradeVal = str(g.grade, 50);
        if (!gradeVal) continue;
        await query(
          `INSERT INTO necta_subject_grades (exam_type, year, candidate_no, subject_name, grade)
           VALUES ($1, $2, $3, $4, $5)`,
          [exam, yearInt, candNo || 'unknown', subjName, gradeVal]
        );
      }
    }

    res.json({ message: `Imported ${candidates.length} candidates`, imported: candidates.length, url });
  } catch (err) {
    console.error('NECTA import error:', err.message);
    return sendError(res, err, 500);
  }
});

// List exam_type+year we have data for
router.get('/necta/analytics/overview', async (req, res) => {
  try {
    await ensureNectaTables();
    const r = await query(
      'SELECT exam_type, year, COUNT(*) as total FROM necta_candidates GROUP BY exam_type, year ORDER BY year DESC, exam_type'
    );
    res.json({ overview: r.rows });
  } catch (e) {
    return sendError(res, e, 500);
  }
});

// Search students (candidates)
router.get('/necta/analytics/students', async (req, res) => {
  try {
    const { exam_type, year, search } = req.query;
    if (!exam_type || !year) {
      return res.status(400).json({ message: 'exam_type and year required' });
    }
    await ensureNectaTables();
    let q = 'SELECT * FROM necta_candidates WHERE exam_type = $1 AND year = $2';
    const params = [exam_type.toLowerCase(), parseInt(year, 10)];
    if (search && search.trim()) {
      params.push('%' + search.trim() + '%');
      q += ' AND (candidate_no ILIKE $3 OR candidate_name ILIKE $3)';
    }
    q += ' ORDER BY candidate_no LIMIT 500';
    const r = await query(q, params);
    res.json({ students: r.rows });
  } catch (e) {
    return sendError(res, e, 500);
  }
});

// Subject stats: GPA, count per grade (A/B/C/D/F or I/II/III/IV/0/F) per subject
router.get('/necta/analytics/subject-stats', async (req, res) => {
  try {
    const { exam_type, year } = req.query;
    if (!exam_type || !year) {
      return res.status(400).json({ message: 'exam_type and year required' });
    }
    await ensureNectaTables();
    const exam = exam_type.toLowerCase();
    const yearInt = parseInt(year, 10);
    const grades = await query(
      'SELECT subject_name, grade FROM necta_subject_grades WHERE exam_type = $1 AND year = $2',
      [exam, yearInt]
    );
    const bySubject = {};
    for (const row of (grades.rows || [])) {
      const name = (row.subject_name || 'Unknown').trim();
      if (!bySubject[name]) {
        bySubject[name] = { subject_name: name, count: 0, sumPoints: 0, grade_counts: {} };
      }
      bySubject[name].count++;
      const pt = gradeToPoint(row.grade);
      bySubject[name].sumPoints += pt;
      const g = (row.grade || '').toString().trim().toUpperCase();
      bySubject[name].grade_counts[g] = (bySubject[name].grade_counts[g] || 0) + 1;
    }
    const stats = Object.values(bySubject).map(s => ({
      ...s,
      gpa: s.count > 0 ? Math.round((s.sumPoints / s.count) * 100) / 100 : 0
    }));
    res.json({ subject_stats: stats });
  } catch (e) {
    return sendError(res, e, 500);
  }
});

// Subject ranking (by GPA) and overall candidate ranking (by points)
router.get('/necta/analytics/rankings', async (req, res) => {
  try {
    const { exam_type, year } = req.query;
    if (!exam_type || !year) {
      return res.status(400).json({ message: 'exam_type and year required' });
    }
    await ensureNectaTables();
    const exam = exam_type.toLowerCase();
    const yearInt = parseInt(year, 10);
    const candidates = await query(
      'SELECT candidate_no, candidate_name, division, points FROM necta_candidates WHERE exam_type = $1 AND year = $2 ORDER BY points DESC NULLS LAST, candidate_no',
      [exam, yearInt]
    );
    const grades = await query(
      'SELECT subject_name, grade FROM necta_subject_grades WHERE exam_type = $1 AND year = $2',
      [exam, yearInt]
    );
    const subjectPoints = {};
    for (const row of (grades.rows || [])) {
      const name = (row.subject_name || 'Unknown').trim();
      if (!subjectPoints[name]) subjectPoints[name] = [];
      subjectPoints[name].push({ grade: row.grade, point: gradeToPoint(row.grade) });
    }
    const subjectRanking = Object.entries(subjectPoints).map(([name, arr]) => {
      const gpa = arr.length ? arr.reduce((s, x) => s + x.point, 0) / arr.length : 0;
      return { subject_name: name, gpa: Math.round(gpa * 100) / 100, candidates_count: arr.length };
    }).sort((a, b) => b.gpa - a.gpa);
    res.json({
      overall_ranking: (candidates.rows || []).map((c, i) => ({ rank: i + 1, ...c })),
      subject_ranking: subjectRanking
    });
  } catch (e) {
    return sendError(res, e, 500);
  }
});

// ========== ADMINISTRATORS MANAGEMENT ==========

// Get all administrators (for admin panel - includes inactive)
router.get('/administrators', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM administrators ORDER BY display_order, created_at'
    );
    res.json({ administrators: result.rows });
  } catch (error) {
    console.error('Get administrators error:', error);
    return sendError(res, error, 500);
  }
});

// Save administrator (create or update)
router.post('/administrators', upload.single('photo'), async (req, res) => {
  try {
    const { id, name, title, year_started, display_order, active } = req.body;
    
    if (!name || !title) {
      return res.status(400).json({ message: 'name and title are required' });
    }
    
    let photoPath = null;
    
    // Handle photo upload
    if (req.file) {
      // Get old photo path if updating
      if (id) {
        const oldAdminResult = await query('SELECT photo FROM administrators WHERE id = $1', [id]);
        const oldPhotoPath = oldAdminResult.rows[0]?.photo;
        
        // Delete old photo if exists
        if (oldPhotoPath) {
          try {
            const oldFilePath = path.join(__dirname, '../static', oldPhotoPath);
            await fs.unlink(oldFilePath);
          } catch (err) {
            console.log('Old photo file not found or already deleted');
          }
        }
      }
      
      // Generate unique filename
      const ext = path.extname(req.file.originalname).toLowerCase();
      const filename = `${uuidv4()}${ext}`;
      const relativePath = `uploads/administrators/${filename}`;
      const newFilePath = path.join(__dirname, '../static', relativePath);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(newFilePath), { recursive: true });
      
      // Move uploaded file
      await fs.rename(req.file.path, newFilePath);
      photoPath = relativePath;
    } else if (id) {
      // Keep existing photo if updating without new photo
      const existingResult = await query('SELECT photo FROM administrators WHERE id = $1', [id]);
      photoPath = existingResult.rows[0]?.photo || null;
    }
    
    const displayOrder = display_order ? parseInt(display_order) : 0;
    const isActive = active === 'true' || active === true;
    
    if (id) {
      // Update existing administrator
      await query(
        `UPDATE administrators 
         SET name = $1, title = $2, year_started = $3, photo = $4, display_order = $5, active = $6, updated_at = NOW()
         WHERE id = $7`,
        [name, title, year_started || null, photoPath, displayOrder, isActive, id]
      );
    } else {
      // Create new administrator
      const newId = uuidv4();
      await query(
        `INSERT INTO administrators (id, name, title, year_started, photo, display_order, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newId, name, title, year_started || null, photoPath, displayOrder, isActive]
      );
    }
    
    res.json({ message: `Administrator ${id ? 'updated' : 'created'} successfully` });
  } catch (error) {
    console.error('Save administrator error:', error);
    return sendError(res, error, 500);
  }
});

// Delete administrator
router.delete('/administrators/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get photo path before deleting
    const adminResult = await query('SELECT photo FROM administrators WHERE id = $1', [id]);
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: 'Administrator not found' });
    }
    
    const photoPath = adminResult.rows[0].photo;
    
    // Delete photo file if exists
    if (photoPath) {
      try {
        const filePath = path.join(__dirname, '../static', photoPath);
        await fs.unlink(filePath);
      } catch (err) {
        console.log('Photo file not found or already deleted');
      }
    }
    
    // Delete administrator
    await query('DELETE FROM administrators WHERE id = $1', [id]);
    
    res.json({ message: 'Administrator deleted successfully' });
  } catch (error) {
    console.error('Delete administrator error:', error);
    return sendError(res, error, 500);
  }
});

// ========== STUDENT PASS ID MANAGEMENT ==========

// Generate Pass ID (6 characters: 3 numbers + 3 letters)
const generatePassId = () => {
  const numbers = '0123456789';
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding I, O to avoid confusion
  let passId = '';
  
  // 3 random numbers
  for (let i = 0; i < 3; i++) {
    passId += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  // 3 random letters
  for (let i = 0; i < 3; i++) {
    passId += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  return passId;
};

// Get Pass IDs for a specific form
router.get('/pass-ids/:form', async (req, res) => {
  try {
    const { form } = req.params;
    const { month, year } = req.query;
    
    // Normalize form to uppercase
    const normalizedForm = form.trim().toUpperCase();
    
    let sql = `
      SELECT 
        sp.id,
        sp.adm_no,
        sp.level,
        sp.stream,
        sp.year,
        sp.month,
        sp.pass_id,
        sp.created_at,
        s.first_name,
        s.middle_name,
        s.surname
      FROM student_pass_ids sp
      LEFT JOIN students s ON sp.adm_no = s.adm_no 
        AND sp.level = s.level 
        AND sp.stream = s.stream 
        AND sp.year = s.year
      WHERE UPPER(TRIM(sp.level)) = UPPER(TRIM($1))
    `;
    const params = [normalizedForm];
    
    if (month) {
      sql += ' AND sp.month = $2';
      params.push(month);
    }
    
    if (year) {
      const paramIndex = month ? 3 : 2;
      sql += ` AND sp.year = $${paramIndex}`;
      params.push(parseInt(year));
    }
    
    sql += ' ORDER BY sp.year DESC, sp.month DESC, sp.adm_no';
    
    const result = await query(sql, params);
    
    res.json({ passIds: result.rows });
  } catch (error) {
    console.error('Get Pass IDs error:', error);
    return sendError(res, error, 500);
  }
});

// Generate Pass IDs for all students in a form for a specific month
router.post('/pass-ids/generate', async (req, res) => {
  try {
    const { form, month, year } = req.body;
    
    if (!form || !month || !year) {
      return res.status(400).json({ message: 'form, month, and year are required' });
    }
    
    // Normalize form to uppercase
    const normalizedForm = form.trim().toUpperCase();
    
    // Get all active students for the form
    const studentsResult = await query(
      `SELECT DISTINCT adm_no, level, stream, year, first_name, middle_name, surname
       FROM students
       WHERE UPPER(TRIM(level)) = UPPER(TRIM($1)) AND year = $2 AND status != 'ARCHIVED'
       ORDER BY adm_no`,
      [normalizedForm, parseInt(year)]
    );
    
    if (studentsResult.rows.length === 0) {
      return res.json({ message: 'No students found', generated: 0 });
    }
    
    let generated = 0;
    let updated = 0;
    
    for (const student of studentsResult.rows) {
      // Check if Pass ID already exists for this student/month/year
      const existingResult = await query(
        `SELECT id FROM student_pass_ids 
         WHERE adm_no = $1 AND level = $2 AND year = $3 AND month = $4`,
        [student.adm_no, student.level, student.year, month]
      );
      
      if (existingResult.rows.length > 0) {
        // Update existing Pass ID (generate new one)
        const newPassId = generatePassId();
        await query(
          `UPDATE student_pass_ids 
           SET pass_id = $1, created_at = NOW() 
           WHERE adm_no = $2 AND level = $3 AND year = $4 AND month = $5`,
          [newPassId, student.adm_no, student.level, student.year, month]
        );
        updated++;
      } else {
        // Create new Pass ID
        const newPassId = generatePassId();
        await query(
          `INSERT INTO student_pass_ids (adm_no, level, stream, year, month, pass_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [student.adm_no, student.level, student.stream || null, student.year, month, newPassId]
        );
        generated++;
      }
    }
    
    res.json({ 
      message: `Generated ${generated} new Pass IDs and updated ${updated} existing ones`,
      generated,
      updated,
      total: generated + updated
    });
  } catch (error) {
    console.error('Generate Pass IDs error:', error);
    return sendError(res, error, 500);
  }
});

// Regenerate Pass ID for a specific student
router.post('/pass-ids/regenerate', async (req, res) => {
  try {
    const { adm_no, form, month, year } = req.body;
    
    if (!adm_no || !form || !month || !year) {
      return res.status(400).json({ message: 'adm_no, form, month, and year are required' });
    }
    
    // Normalize form to uppercase
    const normalizedForm = form.trim().toUpperCase();
    
    const newPassId = generatePassId();
    
    await query(
      `INSERT INTO student_pass_ids (adm_no, level, year, month, pass_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (adm_no, level, year, month)
       DO UPDATE SET pass_id = EXCLUDED.pass_id, created_at = NOW()`,
      [adm_no, normalizedForm, parseInt(year), month, newPassId]
    );
    
    res.json({ message: 'Pass ID regenerated successfully', pass_id: newPassId });
  } catch (error) {
    console.error('Regenerate Pass ID error:', error);
    return sendError(res, error, 500);
  }
});

// ========== AI MATTERS (admin-only: upload PDF/CSV/DOCX, chat over content) ==========

async function ensureAiMattersTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS ai_matters_documents (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      extracted_text TEXT,
      mime_type VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER
    )
  `);
}

router.get('/ai-matters/documents', async (req, res) => {
  try {
    await ensureAiMattersTable();
    const result = await query(
      'SELECT id, name, file_path, mime_type, created_at FROM ai_matters_documents ORDER BY created_at DESC'
    );
    res.json({ documents: result.rows });
  } catch (error) {
    console.error('AI Matters list error:', error);
    return sendError(res, error, 500);
  }
});

router.post('/ai-matters/upload', documentUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    await ensureAiMattersTable();
    const buffer = await fs.readFile(req.file.path);
    const extracted = await extractText(buffer, req.file.originalname || req.file.filename);
    const userId = req.user?.id || null;
    await query(
      `INSERT INTO ai_matters_documents (name, file_path, extracted_text, mime_type, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.file.originalname || req.file.filename, req.file.filename, extracted || null, req.file.mimetype || null, userId]
    );
    const inserted = await query(
      'SELECT id, name, file_path, mime_type, created_at FROM ai_matters_documents ORDER BY id DESC LIMIT 1'
    );
    res.status(201).json({ document: inserted.rows[0] });
  } catch (error) {
    console.error('AI Matters upload error:', error);
    if (req.file && req.file.path) {
      try { await fs.unlink(req.file.path); } catch (_) {}
    }
    return sendError(res, error, 500);
  }
});

router.delete('/ai-matters/documents/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
    const row = await query('SELECT file_path FROM ai_matters_documents WHERE id = $1', [id]);
    if (row.rows.length === 0) return res.status(404).json({ message: 'Document not found' });
    const filePath = path.join(aiMattersPath, row.rows[0].file_path);
    try { await fs.unlink(filePath); } catch (_) {}
    await query('DELETE FROM ai_matters_documents WHERE id = $1', [id]);
    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('AI Matters delete error:', error);
    return sendError(res, error, 500);
  }
});

router.post('/ai-matters/chat', async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Message is required' });
    }
    const userMessage = message.trim().slice(0, 4000);
    if (!userMessage) return res.status(400).json({ message: 'Message cannot be empty' });
    if (!getClient()) {
      return res.status(503).json({
        reply: 'AI is not configured. Please set ANTHROPIC_API_KEY in the server environment.'
      });
    }
    await ensureAiMattersTable();
    const docs = await query(
      'SELECT name, extracted_text FROM ai_matters_documents WHERE extracted_text IS NOT NULL AND extracted_text != \'\' ORDER BY created_at DESC'
    );
    const context = (docs.rows || []).map(d => `--- Document: ${d.name} ---\n${(d.extracted_text || '').slice(0, 150000)}`).join('\n\n');
    let faqList = '';
    try {
      const faqsResult = await query(
        'SELECT question, answer, category FROM faqs WHERE active = TRUE ORDER BY display_order, created_at'
      );
      faqList = (faqsResult.rows || []).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
    } catch (e) {
      faqList = '';
    }
    let nectaSummary = '';
    try {
      await ensureNectaTables();
      nectaSummary = await getNectaSummaryForAI(query, { includeTopCandidates: true });
    } catch (e) {
      nectaSummary = 'No NECTA data imported yet. Use Admin → NECTA URLs and Import to fetch results.';
    }
    const faqSection = faqList ? `\n\nFAQs (Admin → FAQs; use when relevant):\n${faqList}` : '';
    const systemPrompt = `You are the assistant for the school admin of Arusha Catholic Seminary. Use ONLY the content provided below. Do not invent data.

Rules:
1. Base every answer on the FAQs, attached documents, and NECTA summary below. If the answer is not there, say "I don't have that information in the provided content."
2. When you use a specific source, cite it briefly (e.g. "According to the FAQs...", "From [document name]...", "From NECTA summary...").
3. Format clearly: use bullet points, numbered lists, or short paragraphs where they help.
4. For NECTA: the summary includes exam type, year, subject GPAs, grade counts, and (for admin) top 15 candidates by points. Use it for exam-related questions.
5. Answer in the same language the user used (English or Swahili). If unclear, use English.

FAQs:
${faqSection}

Document content (AI Matters uploads):
${context || '(No documents uploaded yet. Upload PDF, CSV, or Word files in AI Matters.)'}

NECTA data:
${nectaSummary}`;
    const reply = await callClaude(systemPrompt, userMessage, 4096);
    res.json({ reply: (reply || '').trim() || 'I could not generate an answer. Please try again.' });
  } catch (error) {
    console.error('AI Matters chat error:', error);
    return sendError(res, { message: 'Something went wrong. Please try again or contact support.' }, 500);
  }
});

module.exports = router;
