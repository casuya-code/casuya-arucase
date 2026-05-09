const { query } = require('./config/database');

async function testPDFGeneration() {
  try {
    console.log('🔍 PDF TEST: Testing PDF generation for interview results...');
    
    const year = 2025;
    
    // Check if there are interview results
    const results = await query('SELECT r.*, s.first_name, s.middle_name, s.surname, s.admission_number, s.parish FROM preform_one_interview_results r JOIN preform_one_students s ON r.student_id = s.id WHERE r.year = $1 ORDER BY r.position', [year]);
    
    console.log('🔍 PDF TEST: Interview results found:', results.rowCount);
    
    if (results.rows.length === 0) {
      console.log('❌ PDF TEST: No interview results found for year', year);
      console.log('🔍 PDF TEST: Please enter some interview scores first');
      return;
    }
    
    // Get subjects
    const subjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code');
    console.log('🔍 PDF TEST: Subjects found:', subjects.rowCount);
    
    // Get scores
    const scores = await query(`
      SELECT sc.score, sc.student_id, sub.subject_code 
      FROM preform_one_scores sc
      JOIN preformone_interview_subjects sub ON sc.subject_id = sub.id
      WHERE sc.subject_type = 'interview' AND sc.student_id IN (
        SELECT student_id FROM preform_one_interview_results WHERE year = $1
      )
    `, [year]);
    
    console.log('🔍 PDF TEST: Scores found:', scores.rowCount);
    
    // Test PDF generation
    try {
      const puppeteer = require('puppeteer');
      console.log('🔍 PDF TEST: Puppeteer module loaded');
      
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 30000
      });
      console.log('🔍 PDF TEST: Browser launched');
      
      const page = await browser.newPage();
      console.log('🔍 PDF TEST: Page created');
      
      // Simple test HTML
      const testHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test PDF</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Test PDF Generation</h1>
          <p>This is a test to verify PDF generation works.</p>
          <table>
            <tr>
              <th>Name</th>
              <th>Score</th>
            </tr>
            <tr>
              <td>Test Student</td>
              <td>85</td>
            </tr>
          </table>
        </body>
        </html>
      `;
      
      await page.setContent(testHTML, { waitUntil: 'networkidle0' });
      console.log('🔍 PDF TEST: HTML content set');
      
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
      console.log('🔍 PDF TEST: PDF generated, size:', pdfBuffer.length);
      
      await browser.close();
      console.log('🔍 PDF TEST: Browser closed');
      
      // Check if PDF is valid
      if (pdfBuffer.length >= 4 && 
          pdfBuffer[0] === 0x25 && 
          pdfBuffer[1] === 0x50 && 
          pdfBuffer[2] === 0x44 && 
          pdfBuffer[3] === 0x46) {
        console.log('✅ PDF TEST: Valid PDF generated successfully');
      } else {
        console.log('❌ PDF TEST: Invalid PDF generated');
        console.log('🔍 PDF TEST: First 4 bytes:', Array.from(pdfBuffer.slice(0, 4)));
      }
      
    } catch (puppeteerError) {
      console.error('❌ PDF TEST: Puppeteer error:', puppeteerError);
    }
    
  } catch (error) {
    console.error('❌ PDF TEST: Error:', error);
  }
}

// Run the test
testPDFGeneration()
  .then(() => {
    console.log('✅ PDF TEST: Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ PDF TEST: Test failed:', error);
    process.exit(1);
  });
