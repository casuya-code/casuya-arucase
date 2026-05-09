const express = require('express');
const { query } = require('./config/database');
const jwt = require('jsonwebtoken');

const app = express();

// Create test token
const createTestToken = () => {
  const JWT_SECRET = process.env.JWT_SECRET_KEY || 'your-super-secret-jwt-key-change-this-in-production';
  const testUser = {
    id: 1,
    username: 'test_admin',
    email: 'test@example.com',
    role: 'admin',
    permissions: {
      modules: ['all'],
      class_subjects: {},
      classes: ['all'],
      subjects: ['all'],
      score_entry_months: ['all'],
      class_permissions: {}
    }
  };
  
  return jwt.sign(testUser, JWT_SECRET, { expiresIn: '24h' });
};

// Copy the exact PDF generation logic from the main route
const generateInterviewResultsPDF = (results, subjects, year) => {
  const subjectHeaders = subjects.map(s => `<th>${s.subject_code}</th>`).join('');
  
  const tableRows = results.map((result, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${result.admission_number}</td>
      <td>${result.first_name}</td>
      <td>${result.middle_name || ''}</td>
      <td>${result.surname}</td>
      <td>${result.parish || ''}</td>
      ${subjects.map(subject => `<td>${result[subject.subject_code] || 0}</td>`).join('')}
      <td>${parseFloat(result.total_marks || 0).toFixed(2)}</td>
      <td>${parseFloat(result.average || 0).toFixed(2)}</td>
      <td>${result.grade || '-'}</td>
      <td>${result.position || '-'}</td>
      <td>${result.remarks || ''}</td>
    </tr>
  `).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pre-Form One Interview Results ${year}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background-color: #f2f2f2; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>CATHOLIC ARCHDIOCESE OF ARUSHA</h1>
      <h2>ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU</h2>
      <h3>Pre-Form One Interview Results ${year}</h3>
      <table>
        <thead>
          <tr>
            <th>S/N</th>
            <th>Admission No</th>
            <th>First Name</th>
            <th>Middle Name</th>
            <th>Surname</th>
            <th>Parish</th>
            ${subjectHeaders}
            <th>Total Marks</th>
            <th>Average</th>
            <th>Grade</th>
            <th>Position</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;
};

// Test the exact same logic as the main route
app.get('/test-pdf', async (req, res) => {
  try {
    const year = 2025;
    
    console.log('🔍 TEST: Getting interview results...');
    const results = await query('SELECT r.*, s.first_name, s.middle_name, s.surname, s.admission_number, s.parish FROM preform_one_interview_results r JOIN preform_one_students s ON r.student_id = s.id WHERE r.year = $1 ORDER BY r.position', [year]);
    console.log('✅ TEST: Results found:', results.rows.length);
    
    console.log('🔍 TEST: Getting interview subjects...');
    const subjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code');
    console.log('✅ TEST: Subjects found:', subjects.rows.length);
    
    console.log('🔍 TEST: Getting student scores...');
    const scores = await query(`
      SELECT sc.score, sc.student_id, sub.subject_code 
      FROM preform_one_scores sc
      JOIN preformone_interview_subjects sub ON sc.subject_id = sub.id
      WHERE sc.subject_type = 'interview' AND sc.student_id IN (
        SELECT student_id FROM preform_one_interview_results WHERE year = $1
      )
    `, [year]);
    console.log('✅ TEST: Scores found:', scores.rows.length);
    
    console.log('🔍 TEST: Creating scores map...');
    const scoresMap = {};
    scores.rows.forEach(scoreRow => {
      const studentId = scoreRow.student_id;
      const subjectCode = scoreRow.subject_code;
      if (!scoresMap[studentId]) {
        scoresMap[studentId] = {};
      }
      scoresMap[studentId][subjectCode] = scoreRow.score;
    });
    
    console.log('🔍 TEST: Combining results with scores...');
    const resultsWithScores = results.rows.map(result => ({
      ...result,
      ...scoresMap[result.student_id] || {}
    }));
    
    console.log('🔍 TEST: Generating HTML...');
    const htmlContent = generateInterviewResultsPDF(resultsWithScores, subjects.rows, year);
    console.log('✅ TEST: HTML generated, length:', htmlContent.length);
    
    console.log('🔍 TEST: Starting Puppeteer PDF generation...');
    const puppeteer = require('puppeteer');
    console.log('✅ TEST: Puppeteer loaded');
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      timeout: 30000
    });
    console.log('✅ TEST: Browser launched');
    
    const page = await browser.newPage();
    console.log('✅ TEST: Page created');
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    console.log('✅ TEST: HTML content set');
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      timeout: 15000
    });
    console.log('✅ TEST: PDF generated, size:', pdfBuffer.length);
    
    await browser.close();
    console.log('✅ TEST: Browser closed');
    
    // Check what we're actually sending
    console.log('🔍 TEST: PDF buffer type:', typeof pdfBuffer);
    console.log('🔍 TEST: PDF buffer constructor:', pdfBuffer.constructor.name);
    console.log('🔍 TEST: PDF first 10 bytes:', Array.from(pdfBuffer.slice(0, 10)));
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="test-interview-results-${year}.pdf"`);
    res.send(pdfBuffer);
    console.log('✅ TEST: PDF response sent');
    
  } catch (error) {
    console.error('❌ TEST: PDF generation failed:', error);
    console.error('❌ TEST: Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🧪 Test server running on port ${PORT}`);
  console.log(`🧪 Test URL: http://localhost:${PORT}/test-pdf`);
  console.log(`🧪 Test with token: ${createTestToken()}`);
});
