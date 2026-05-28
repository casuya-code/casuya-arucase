/**
 * AI Matters uploaded documents — shared by admin chat and public chatbot.
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
      created_by INTEGER
    )
  `);
}

/**
 * @param {Function} query - DB query helper
 * @param {{ maxPerDoc?: number, heading?: string }} [opts]
 * @returns {Promise<string>}
 */
async function buildAiMattersDocumentsSection(query, opts = {}) {
  const maxPerDoc = opts.maxPerDoc ?? 150000;
  const docLimit = opts.docLimit ?? 0;
  const heading = opts.heading ?? 'School documents (Admin → AI Matters uploads)';

  try {
    await ensureAiMattersTable(query);
    const limitClause = docLimit > 0 ? ` LIMIT ${Math.min(docLimit, 25)}` : '';
    const docsResult = await query(
      `SELECT name, extracted_text FROM ai_matters_documents
       WHERE extracted_text IS NOT NULL AND TRIM(extracted_text) != ''
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
