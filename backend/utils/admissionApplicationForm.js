/**
 * Admission application form PDF — load from DB, stream as application/pdf (never image placeholder).
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { query } = require('../config/database');

const DEFAULT_FILENAME = 'fomu-ya-maombi.pdf';

async function getAdmissionApplicationFormRow() {
  const result = await query(
    'SELECT file_path, original_filename FROM admission_letters WHERE id = 1 AND file_path IS NOT NULL'
  );
  return result.rows[0] || null;
}

function sanitizeDownloadFilename(name) {
  const base = String(name || DEFAULT_FILENAME).trim() || DEFAULT_FILENAME;
  return base.replace(/["\r\n\\]/g, '_').replace(/[^\w.\-() ]+/g, '_') || DEFAULT_FILENAME;
}

function resolveLocalAbsolutePath(filePath) {
  const relative = String(filePath).replace(/^\/+/, '').replace(/^static\//, '');
  return path.join(__dirname, '../static', relative);
}

/**
 * Stream the admission PDF to an Express response.
 * @param {import('express').Response} res
 * @param {{ inline?: boolean }} options
 */
async function streamAdmissionApplicationPdf(res, { inline = false } = {}) {
  const row = await getAdmissionApplicationFormRow();
  if (!row?.file_path) {
    res.status(404).json({ message: 'Application form PDF is not available yet.' });
    return;
  }

  const filename = sanitizeDownloadFilename(row.original_filename);
  const disposition = inline ? 'inline' : 'attachment';

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=300');

  const stored = String(row.file_path).trim();

  if (/^https?:\/\//i.test(stored)) {
    try {
      const upstream = await axios.get(stored, {
        responseType: 'stream',
        timeout: 60000,
        maxRedirects: 5,
        validateStatus: (s) => s >= 200 && s < 300,
      });
      upstream.data.on('error', (err) => {
        console.error('[admission-form] upstream stream error:', err.message);
        if (!res.headersSent) res.status(502).end();
      });
      upstream.data.pipe(res);
    } catch (err) {
      console.error('[admission-form] failed to fetch remote PDF:', err.message);
      if (!res.headersSent) {
        res.status(502).json({ message: 'Could not retrieve application form PDF.' });
      }
    }
    return;
  }

  const absolute = resolveLocalAbsolutePath(stored);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    res.status(404).json({
      message: 'Application form PDF file not found on server. Please re-upload in Admin → Admission Letters.',
    });
    return;
  }

  res.sendFile(absolute, (err) => {
    if (err && !res.headersSent) {
      console.error('[admission-form] sendFile error:', err.message);
      res.status(500).json({ message: 'Failed to send application form PDF.' });
    }
  });
}

module.exports = {
  getAdmissionApplicationFormRow,
  streamAdmissionApplicationPdf,
  sanitizeDownloadFilename,
};
