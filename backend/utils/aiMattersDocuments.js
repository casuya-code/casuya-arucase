/**
 * AI Matters uploaded documents — shared by admin chat and public chatbot.
 *
 * Public chatbot use is opt-in only: a document must be explicitly approved
 * (is_public = TRUE) before its text is included in public-facing context.
 * Admin chat continues to use all uploaded documents.
 */

async function ensureAiMattersTable(query) {
  await query(`
    CREATE TABLE IF NOT EXISTS ai_matters_documents (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      extracted_text TEXT,
      mime_type VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      is_public BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);

  // Existing installations predate the publication flag. Fail closed: every
  // existing document becomes private until an admin explicitly approves it.
  await query(`
    ALTER TABLE ai_matters_documents
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_ai_matters_documents_public
    ON ai_matters_documents (is_public, created_at DESC)
  `);
}

/**
 * @param {Function} query - DB query helper
 * @param {{ maxPerDoc?: number, heading?: string, docLimit?: number, publicOnly?: boolean }} [opts]
 * @returns {Promise<string>}
 */
async function buildAiMattersDocumentsSection(query, opts = {}) {
  const maxPerDoc = opts.maxPerDoc ?? 150000;
  const docLimit = opts.docLimit ?? 0;
  const heading = opts.heading ?? 'School documents (Admin → AI Matters uploads)';
  const publicOnly = opts.publicOnly === true;

  try {
    await ensureAiMattersTable(query);
    const limitClause = docLimit > 0 ? ` LIMIT ${Math.min(docLimit, 25)}` : '';
    const publicClause = publicOnly ? ' AND is_public = TRUE' : '';
    const docsResult = await query(
      `SELECT name, extracted_text FROM ai_matters_documents
       WHERE extracted_text IS NOT NULL AND TRIM(extracted_text) != ''
       ${publicClause}
       ORDER BY created_at DESC${limitClause}`
    );
    const rows = docsResult.rows || [];
    if (!rows.length) return '';

    const docContent = rows
      .map((d) => `--- ${d.name} ---\n${(d.extracted_text || '').slice(0, maxPerDoc)}`)
      .join('\n\n');
    return `${heading}:\n${docContent}`;
  } catch (err) {
    console.error('AI Matters documents context error:', err);
    return '';
  }
}

module.exports = {
  ensureAiMattersTable,
  buildAiMattersDocumentsSection,
};
