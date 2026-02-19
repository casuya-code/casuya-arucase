/**
 * Bulk PDF Generator - Generates ONE HTML document with all individual reports
 * Then converts the entire HTML to PDF using Puppeteer (like Python version)
 * This is much more efficient than generating individual PDFs and merging them
 */
const puppeteer = require('puppeteer');
const axios = require('axios');
const { generateReportHTML } = require('./htmlReportRenderer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Read CSS file content
 */
async function getCSSContent() {
  try {
    const cssPath = path.join(__dirname, '../../frontend/src/pages/reports/IndividualReportDetail.css');
    return await fs.readFile(cssPath, 'utf-8');
  } catch (e) {
    console.log('Could not read CSS file, using minimal styles');
    return `
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
      .report-container { max-width: 194mm; margin: 0 auto; padding: 3px; }
      table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
      th, td { border: 1px solid #000; padding: 4px 5px; font-size: 10px; }
      th { background: #fff; font-weight: bold; }
    `;
  }
}

/**
 * Generate HTML for a single report (extract just the report-container content)
 */
async function generateSingleReportHTML(reportData) {
  const fullHTML = await generateReportHTML(reportData);
  // Extract just the report-container content
  // The HTML structure is: <body><div class="report-container">...</div></body></html>
  const containerMatch = fullHTML.match(/<div class="report-container">([\s\S]*?)<\/div>\s*(?:<\/body>|<\/html>)/);
  if (containerMatch && containerMatch[1]) {
    return containerMatch[1].trim();
  }
  // Fallback: try to extract everything between body tags
  const bodyMatch = fullHTML.match(/<body>([\s\S]*?)<\/body>/);
  if (bodyMatch && bodyMatch[1]) {
    return bodyMatch[1].trim();
  }
  // Last resort: return full HTML (will work but less efficient)
  console.warn('[BULK PDF] Could not extract report container, using full HTML');
  return fullHTML;
}

/**
 * Generate bulk PDF by creating ONE HTML document with all reports, then converting to PDF
 * This matches the Python version's approach - much more efficient!
 * @param {string} form - Form level (e.g., 'FORM I')
 * @param {string} stream - Stream (e.g., 'NA', 'A', 'PCB')
 * @param {number} year - Year (e.g., 2025)
 * @param {string} term - Term (e.g., 'Term I', 'Term II')
 * @param {Array} students - Array of student objects with adm_no
 * @param {string} apiUrl - Backend API URL
 * @param {string} authToken - Auth token for API requests
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateBulkReportPDFWithBatches(
  form,
  stream,
  year,
  term,
  students,
  apiUrl = process.env.API_URL || 'http://localhost:5000',
  authToken = null
) {
  console.log(`[BULK PDF] Starting bulk PDF generation for ${students.length} students`);
  console.log(`[BULK PDF] Using Python-style approach: Generate ONE HTML with all reports, then convert to PDF`);
  
  const startTime = Date.now();
  let browser = null;
  
  try {
    // Step 1: Generate HTML for all individual reports
    console.log(`[BULK PDF] Step 1: Generating HTML for all ${students.length} reports...`);
    const htmlStartTime = Date.now();
    const reportHTMLs = [];
    const errors = [];
    
    // Encode parameters for URL
    const encodedForm = encodeURIComponent(form);
    const encodedStream = encodeURIComponent(stream || 'NA');
    const encodedTerm = encodeURIComponent(term);
    
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // Fetch report data for all students and generate HTML
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const admNo = student.adm_no || student.admNo;
      const studentStream = student.stream || stream;
      
      try {
        // Fetch report data from API
        const reportDataUrl = `${apiUrl}/api/reports/individual/${encodedForm}/${encodeURIComponent(studentStream)}/${year}/${encodedTerm}/${admNo}`;
        const reportDataResponse = await axios.get(reportDataUrl, { headers });
        const reportData = reportDataResponse.data;
        
        // Generate HTML for this report (just the container content)
        const reportHTML = await generateSingleReportHTML({
          ...reportData,
          form,
          term,
          year
        });
        
        reportHTMLs.push(reportHTML);
        
        // Log progress every 10 students
        if ((i + 1) % 10 === 0) {
          console.log(`[BULK PDF] Generated HTML for ${i + 1}/${students.length} students`);
        }
      } catch (error) {
        console.error(`[BULK PDF] Error generating HTML for student ${admNo}:`, error.message);
        errors.push({ admNo, error: error.message });
      }
    }
    
    if (reportHTMLs.length === 0) {
      throw new Error('No reports were generated successfully. All students failed.');
    }
    
    const htmlTime = Date.now() - htmlStartTime;
    console.log(`[BULK PDF] HTML generation completed in ${htmlTime}ms (${reportHTMLs.length}/${students.length} reports)`);
    if (errors.length > 0) {
      console.warn(`[BULK PDF] ${errors.length} students failed:`, errors.map(e => e.admNo).join(', '));
    }
    
    // Step 2: Combine all report HTMLs into one document
    console.log(`[BULK PDF] Step 2: Combining ${reportHTMLs.length} reports into one HTML document...`);
    const cssContent = await getCSSContent();
    
    const combinedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bulk Student Report - ${form} ${year} ${term}</title>
  <style>
    ${cssContent}
    @media print {
      .download-section, .breadcrumb { display: none !important; }
      .report-container {
        page-break-after: always;
      }
      .report-container:last-child {
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
${reportHTMLs.map(html => `<div class="report-container">${html}</div>`).join('\n')}
</body>
</html>`;
    
    // Step 3: Convert combined HTML to PDF using Puppeteer
    console.log(`[BULK PDF] Step 3: Converting HTML to PDF using Puppeteer...`);
    const pdfStartTime = Date.now();
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      timeout: 300000 // 5 minutes timeout for browser launch (bulk PDFs can take time)
    });
    
    const page = await browser.newPage();
    
    // Set default timeout for page operations (5 minutes for bulk PDFs)
    page.setDefaultTimeout(300000);
    page.setDefaultNavigationTimeout(300000);
    
    // Set viewport
    await page.setViewport({
      width: 1920,
      height: 1600,
      deviceScaleFactor: 2
    });
    
    // Set auth headers for image requests
    if (authToken) {
      await page.setExtraHTTPHeaders({
        'Authorization': `Bearer ${authToken}`
      });
    }
    
    // Set base URL for relative image paths
    const baseUrl = apiUrl.replace('/api', '');
    
    // Set content and wait for it to load
    // Use 'load' instead of 'networkidle0' for bulk PDFs to avoid timeout issues
    // networkidle0 waits for no network activity, which can timeout with many reports
    try {
      await page.setContent(combinedHTML, {
        waitUntil: 'load', // Changed from 'networkidle0' to 'load' for better reliability
        timeout: 300000, // 5 minutes timeout for setContent (bulk PDFs can be large)
        baseURL: baseUrl
      });
    } catch (contentError) {
      // If 'load' times out, try with 'domcontentloaded' as fallback
      console.warn('[BULK PDF] setContent with "load" timed out, trying "domcontentloaded"...');
      try {
        await page.setContent(combinedHTML, {
          waitUntil: 'domcontentloaded',
          timeout: 300000,
          baseURL: baseUrl
        });
      } catch (domError) {
        // Last resort: set content without waiting
        console.warn('[BULK PDF] setContent with "domcontentloaded" also timed out, setting content without wait...');
        await page.setContent(combinedHTML, {
          waitUntil: 'commit',
          timeout: 300000,
          baseURL: baseUrl
        });
      }
    }
    
    // Wait a bit for all images/fonts to load (increased wait time for bulk PDFs)
    console.log('[BULK PDF] Waiting for resources to load...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Increased from 2s to 5s
    
    // Generate PDF
    // Note: page.pdf() doesn't have a direct timeout option, but we can wrap it in Promise.race
    console.log('[BULK PDF] Generating PDF from HTML (this may take a while for bulk reports)...');
    const pdfPromise = page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '3mm',
        right: '3mm',
        bottom: '3mm',
        left: '3mm'
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      scale: 1.0
    });
    
    // Add timeout wrapper (10 minutes for very large bulk PDFs)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('PDF generation timed out after 10 minutes')), 600000);
    });
    
    const pdfBuffer = await Promise.race([pdfPromise, timeoutPromise]);
    
    const pdfTime = Date.now() - pdfStartTime;
    const totalTime = Date.now() - startTime;
    
    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }
    
    let buffer;
    if (Buffer.isBuffer(pdfBuffer)) {
      buffer = pdfBuffer;
    } else {
      buffer = Buffer.from(pdfBuffer);
    }
    
    // Verify it's a valid PDF
    const firstBytes = buffer.slice(0, 4);
    if (firstBytes[0] !== 0x25 || firstBytes[1] !== 0x50 || firstBytes[2] !== 0x44 || firstBytes[3] !== 0x46) {
      throw new Error('Generated file is not a valid PDF');
    }
    
    console.log(`[BULK PDF] PDF conversion completed in ${pdfTime}ms`);
    console.log(`[BULK PDF] TOTAL TIME: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`[BULK PDF] Final PDF size: ${buffer.length} bytes`);
    
    return buffer;
    
  } catch (error) {
    console.error('[BULK PDF] Error during PDF generation:', error);
    // Provide more helpful error messages
    if (error.message.includes('timeout') || error.message.includes('Timeout') || error.name === 'TimeoutError') {
      throw new Error(`PDF generation timed out. This can happen with large bulk reports (${students.length} students). The operation may take several minutes. Please try again or generate PDFs in smaller batches.`);
    }
    throw error;
  } finally {
    // Always close browser
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('[BULK PDF] Error closing browser:', closeError);
      }
    }
  }
}

module.exports = {
  generateBulkReportPDFWithBatches
};
