/**
 * Admission PDFs — load from DB, stream as application/pdf (never image placeholder).
 *
 * Two single-row letters are stored:
 *  - `admission_letters`          → admission application form (homepage "Pakua Fomu ya Maombi")
 *  - `admission_preform_letters`  → Pre-Form One letter    (homepage "Pakua Fomu ya Pre-Form One")
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { query } = require('../config/database');

const DEFAULT_FILENAME = 'fomu-ya-maombi.pdf';
const DEFAULT_PREFORM_FILENAME = 'fomu-ya-pre-form-one.pdf';

async function getAdmissionApplicationFormRow() {
  const result = await query(
    'SELECT file_path, original_filename FROM admission_letters WHERE id = 1 AND file_path IS NOT NULL'
  );
  return result.rows[0] || null;
}

async function getAdmissionPreformLetterRow() {
  try {
    const result = await query(
      'SELECT file_path, original_filename FROM admission_preform_letters WHERE id = 1 AND file_path IS NOT NULL'
    );
    return result.rows[0] || null;
  } catch (err) {
    // The table is created on startup (initDatabase) and lazily by the admin routes.
    // If a server booted before that ran, treat a missing table as "no letter" so the
    // public homepage never breaks.
    const missingTable =
      err?.code === '42P01' ||
      (typeof err?.message === 'string' &&
        err.message.includes('admission_preform_letters') &&
        /does not exist/i.test(err.message));
    if (missingTable) {
      console.warn('[admission-preform] table missing — treating as no letter uploaded');
      return null;
    }
    throw err;
  }
}

function sanitizeDownloadFilename(name, fallback = DEFAULT_FILENAME) {
  const base = String(name || fallback).trim() || fallback;
  return base.replace(/["\r\n\\]/g, '_').replace(/[^\w.\-() ]+/g, '_') || fallback;
}

function resolveLocalAbsolutePath(filePath) {
  const relative = String(filePath).replace(/^\/+/, '').replace(/^static\//, '');
  return path.join(__dirname, '../static', relative);
}

/**
 * Stream a stored admission PDF row to an Express response.
 * @param {import('express').Response} res
 * @param {{ file_path?: string, original_filename?: string } | null} row
 * @param {{ inline?: boolean, missingMessage?: string, fallbackFilename?: string, logTag?: string }} options
 */
async function streamStoredAdmissionPdf(res, row, {
  inline = false,
  missingMessage = 'Application form PDF is not available yet.',
  fallbackFilename = DEFAULT_FILENAME,
  logTag = 'admission-form',
} = {}) {
  if (!row?.file_path) {
    res.status(404).json({ message: missingMessage });
    return;
  }

  const filename = sanitizeDownloadFilename(row.original_filename, fallbackFilename);
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
        console.error(`[${logTag}] upstream stream error:`, err.message);
        if (!res.headersSent) res.status(502).end();
      });
      upstream.data.pipe(res);
    } catch (err) {
      console.error(`[${logTag}] failed to fetch remote PDF:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({ message: 'Could not retrieve PDF.' });
      }
    }
    return;
  }

  const absolute = resolveLocalAbsolutePath(stored);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    res.status(404).json({
      message: 'PDF file not found on server. Please re-upload in Admin → Admission Letters.',
    });
    return;
  }

  res.sendFile(absolute, (err) => {
    if (err && !res.headersSent) {
      console.error(`[${logTag}] sendFile error:`, err.message);
      res.status(500).json({ message: 'Failed to send PDF.' });
    }
  });
}

/**
 * Stream the admission application form PDF to an Express response.
 * @param {import('express').Response} res
 * @param {{ inline?: boolean }} options
 */
async function streamAdmissionApplicationPdf(res, { inline = false } = {}) {
  const row = await getAdmissionApplicationFormRow();
  await streamStoredAdmissionPdf(res, row, {
    inline,
    missingMessage: 'Application form PDF is not available yet.',
    fallbackFilename: DEFAULT_FILENAME,
    logTag: 'admission-form',
  });
}

/**
 * Stream the Pre-Form One letter PDF to an Express response.
 * @param {import('express').Response} res
 * @param {{ inline?: boolean }} options
 */
async function streamAdmissionPreformPdf(res, { inline = false } = {}) {
  const row = await getAdmissionPreformLetterRow();
  await streamStoredAdmissionPdf(res, row, {
    inline,
    missingMessage: 'Pre-Form One letter PDF is not available yet.',
    fallbackFilename: DEFAULT_PREFORM_FILENAME,
    logTag: 'admission-preform',
  });
}

module.exports = {
  getAdmissionApplicationFormRow,
  getAdmissionPreformLetterRow,
  streamAdmissionApplicationPdf,
  streamAdmissionPreformPdf,
  sanitizeDownloadFilename,
};
