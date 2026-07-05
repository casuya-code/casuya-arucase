const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { requireAuth } = require('../middleware/auth');

// Get all interview subjects
router.get('/', requireAuth, async (req, res) => {
  try {
    console.log('ðŸ” DEBUG: Get interview subjects request received');
    
    const result = await query(
      'SELECT * FROM preformone_interview_subjects ORDER BY subject_name'
    );
    
    console.log('ðŸ” DEBUG: Interview subjects retrieved:', result.rowCount);
    
    return sendSuccess(res, 200, 'Interview subjects retrieved successfully', result.rows);
  } catch (error) {
    console.error('Error fetching interview subjects:', error);
    return sendError(res, 500, 'Failed to fetch interview subjects', error);
  }
});

// Get interview subject by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    console.log('ðŸ” DEBUG: Get interview subject request received');
    console.log('ðŸ” DEBUG: Request params:', req.params);
    
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      console.log('ðŸ” DEBUG: Invalid subject ID:', id);
      return sendError(res, 400, 'Invalid subject ID');
    }
    
    const result = await query(
      'SELECT * FROM preformone_interview_subjects WHERE id = $1',
      [id]
    );
    
    if (result.rowCount === 0) {
      console.log('ðŸ” DEBUG: Interview subject not found:', id);
      return sendError(res, 404, 'Interview subject not found');
    }
    
    console.log('ðŸ” DEBUG: Interview subject found:', result.rows[0]);
    return sendSuccess(res, 200, 'Interview subject retrieved successfully', result.rows[0]);
  } catch (error) {
    console.error('Error fetching interview subject:', error);
    return sendError(res, 500, 'Failed to fetch interview subject', error);
  }
});

// Create new interview subject
router.post('/', requireAuth, async (req, res) => {
  try {
    console.log('ðŸ” DEBUG: Create interview subject request received');
    console.log('ðŸ” DEBUG: Request body:', JSON.stringify(req.body, null, 2));
    
    const { 
      subject_name, 
      subject_code, 
      is_active 
    } = req.body;
    
    // Validation
    if (!subject_name || !subject_code) {
      console.log('ðŸ” DEBUG: Create interview subject validation failed');
      console.log('ðŸ” DEBUG: Missing fields:', {
        subject_name: !subject_name,
        subject_code: !subject_code
      });
      return sendError(res, 400, 'Subject name and code are required');
    }
    
    const client = await withTransaction(async (client) => {
      try {
        console.log('ðŸ” DEBUG: Creating interview subject with data:', {
          subject_name,
          subject_code,
          is_active
        });
        
        const insertQuery = `
          INSERT INTO preformone_interview_subjects 
          (subject_name, subject_code, is_active, created_at, updated_at) 
          VALUES ($1, $2, $3, NOW(), NOW()) 
          RETURNING *
        `;
        
        const insertValues = [
          subject_name.trim(),
          subject_code.trim().toUpperCase(),
          is_active !== undefined ? is_active : true
        ];
        
        console.log('ðŸ” DEBUG: Insert query:', insertQuery);
        console.log('ðŸ” DEBUG: Insert values:', insertValues);
        
        const result = await client.query(insertQuery, insertValues);
        console.log('ðŸ” DEBUG: Interview subject created successfully:', result.rows[0]);
        
        return { success: true, data: result.rows[0] };
      } catch (error) {
        console.error('ðŸ” DEBUG: Error creating interview subject:', error);
        
        // Handle duplicate key constraints
        if (error.code === '23505') {
          console.log('ðŸ” DEBUG: Duplicate key constraint violation');
          if (error.constraint.includes('subject_name')) {
            return { success: false, message: 'Subject name already exists' };
          }
          if (error.constraint.includes('subject_code')) {
            return { success: false, message: 'Subject code already exists' };
          }
          return { success: false, message: 'Subject already exists' };
        }
        
        throw error;
      }
    });
    
    if (client.success) {
      console.log('ðŸ” DEBUG: Create interview subject transaction completed');
      return sendSuccess(res, 201, 'Interview subject created successfully', client.data);
    } else {
      console.log('ðŸ” DEBUG: Create interview subject failed:', client.message);
      return sendError(res, 400, client.message || 'Failed to create interview subject');
    }
  } catch (error) {
    console.error('Error creating interview subject:', error);
    return sendError(res, 500, 'Failed to create interview subject', error);
  }
});

// Update interview subject
router.put('/:id', requireAuth, async (req, res) => {
  try {
    console.log('ðŸ” DEBUG: Update interview subject request received');
    console.log('ðŸ” DEBUG: Request params:', req.params);
    console.log('ðŸ” DEBUG: Request body:', JSON.stringify(req.body, null, 2));
    
    const { id } = req.params;
    const { 
      subject_name, 
      subject_code, 
      is_active 
    } = req.body;
    
    // Validation
    if (!id || isNaN(parseInt(id))) {
      console.log('ðŸ” DEBUG: Invalid subject ID:', id);
      return sendError(res, 400, 'Invalid subject ID');
    }
    
    if (!subject_name || !subject_code) {
      console.log('ðŸ” DEBUG: Update interview subject validation failed');
      return sendError(res, 400, 'Subject name and code are required');
    }
    
    const client = await withTransaction(async (client) => {
      try {
        console.log('ðŸ” DEBUG: Updating interview subject with data:', {
          id,
          subject_name,
          subject_code,
          is_active
        });
        
        // First check if subject exists
        const checkQuery = 'SELECT * FROM preformone_interview_subjects WHERE id = $1';
        const checkResult = await client.query(checkQuery, [id]);
        
        if (checkResult.rowCount === 0) {
          console.log('ðŸ” DEBUG: Interview subject not found:', id);
          return { success: false, message: 'Interview subject not found' };
        }
        
        console.log('ðŸ” DEBUG: Interview subject exists:', checkResult.rows[0]);
        
        const updateQuery = `
          UPDATE preformone_interview_subjects 
          SET subject_name = $1, subject_code = $2, is_active = $3, updated_at = NOW() 
          WHERE id = $4 
          RETURNING *
        `;
        
        const updateValues = [
          subject_name.trim(),
          subject_code.trim().toUpperCase(),
          is_active !== undefined ? is_active : true,
          parseInt(id)
        ];
        
        console.log('ðŸ” DEBUG: Update query:', updateQuery);
        console.log('ðŸ” DEBUG: Update values:', updateValues);
        
        const result = await client.query(updateQuery, updateValues);
        console.log('ðŸ” DEBUG: Interview subject updated successfully:', result.rows[0]);
        
        return { success: true, data: result.rows[0] };
      } catch (error) {
        console.error('ðŸ” DEBUG: Error updating interview subject:', error);
        
        // Handle duplicate key constraints
        if (error.code === '23505') {
          console.log('ðŸ” DEBUG: Duplicate key constraint violation');
          if (error.constraint.includes('subject_name')) {
            return { success: false, message: 'Subject name already exists' };
          }
          if (error.constraint.includes('subject_code')) {
            return { success: false, message: 'Subject code already exists' };
          }
          return { success: false, message: 'Subject already exists' };
        }
        
        throw error;
      }
    });
    
    if (client.success) {
      console.log('ðŸ” DEBUG: Update interview subject transaction completed');
      return sendSuccess(res, 200, 'Interview subject updated successfully', client.data);
    } else {
      console.log('ðŸ” DEBUG: Update interview subject failed:', client.message);
      return sendError(res, 400, client.message || 'Failed to update interview subject');
    }
  } catch (error) {
    console.error('Error updating interview subject:', error);
    return sendError(res, 500, 'Failed to update interview subject', error);
  }
});

// Delete interview subject
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    console.log('ðŸ” DEBUG: Delete interview subject request received');
    console.log('ðŸ” DEBUG: Request params:', req.params);
    
    const { id } = req.params;
    
    // Validation
    if (!id || isNaN(parseInt(id))) {
      console.log('ðŸ” DEBUG: Invalid subject ID:', id);
      return sendError(res, 400, 'Invalid subject ID');
    }
    
    const client = await withTransaction(async (client) => {
      try {
        console.log('ðŸ” DEBUG: Deleting interview subject with ID:', id);
        
        // First check if subject exists
        const checkQuery = 'SELECT * FROM preformone_interview_subjects WHERE id = $1';
        const checkResult = await client.query(checkQuery, [id]);
        
        if (checkResult.rowCount === 0) {
          console.log('ðŸ” DEBUG: Interview subject not found:', id);
          return { success: false, message: 'Interview subject not found' };
        }
        
        console.log('ðŸ” DEBUG: Interview subject to delete:', checkResult.rows[0]);
        
        const deleteQuery = 'DELETE FROM preformone_interview_subjects WHERE id = $1';
        const result = await client.query(deleteQuery, [id]);
        
        console.log('ðŸ” DEBUG: Delete query successful');
        console.log('ðŸ” DEBUG: Row count:', result.rowCount);
        
        return { 
          success: true, 
          message: 'Interview subject deleted successfully',
          data: checkResult.rows[0] 
        };
      } catch (error) {
        console.error('ðŸ” DEBUG: Error deleting interview subject:', error);
        throw error;
      }
    });
    
    if (client.success) {
      console.log('ðŸ” DEBUG: Delete interview subject transaction completed');
      return sendSuccess(res, 200, client.message, client.data);
    } else {
      console.log('ðŸ” DEBUG: Delete interview subject failed:', client.message);
      return sendError(res, 400, client.message || 'Failed to delete interview subject');
    }
  } catch (error) {
    console.error('Error deleting interview subject:', error);
    return sendError(res, 500, 'Failed to delete interview subject', error);
  }
});

// Export interview subjects to Excel
router.get('/export', requireAuth, async (req, res) => {
  try {
    console.log('ðŸ” DEBUG: Export interview subjects request received');
    
    const result = await query(
      'SELECT subject_name, subject_code, is_active FROM preformone_interview_subjects ORDER BY subject_name'
    );
    
    console.log('ðŸ” DEBUG: Interview subjects for export:', result.rowCount);
    
    // Create CSV content
    const csvContent = [
      'Subject Name,Subject Code,Status',
      ...result.rows.map(subject => [
        subject.subject_name,
        subject.subject_code,
        subject.is_active ? 'Active' : 'Inactive'
      ])
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="preformone-interview-subjects.csv"');
    res.send(csvContent);
    
    console.log('ðŸ” DEBUG: Interview subjects exported successfully');
  } catch (error) {
    console.error('Error exporting interview subjects:', error);
    return sendError(res, 500, 'Failed to export interview subjects', error);
  }
});

module.exports = router;
