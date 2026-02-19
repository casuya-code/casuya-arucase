/**
 * Extract plain text from PDF, CSV, or DOCX buffers for AI Matters.
 */
const path = require('path');

/**
 * @param {Buffer} buffer
 * @param {string} originalName - e.g. "report.pdf"
 * @returns {Promise<string>} extracted text
 */
async function extractText(buffer, originalName) {
  if (!buffer || !Buffer.isBuffer(buffer)) return '';
  const ext = (path.extname(originalName || '') || '').toLowerCase();
  if (ext === '.pdf') return extractPdf(buffer);
  if (ext === '.docx' || ext === '.doc') return extractDocx(buffer);
  if (ext === '.csv') return extractCsv(buffer);
  return '';
}

async function extractPdf(buffer) {
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return (data && data.text) ? String(data.text).trim() : '';
  } catch (e) {
    console.error('PDF extract error:', e.message);
    return '';
  }
}

async function extractDocx(buffer) {
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return (result && result.value) ? String(result.value).trim() : '';
  } catch (e) {
    console.error('DOCX extract error:', e.message);
    return '';
  }
}

function extractCsv(buffer) {
  try {
    const text = buffer.toString('utf8');
    return text.trim();
  } catch (e) {
    console.error('CSV read error:', e.message);
    return '';
  }
}

module.exports = { extractText };
