/**
 * Public chatbot user commands — logged for admin review (AI Matters → User Commands).
 */

async function ensureUserCommandsTable(query) {
  await query(`
    CREATE TABLE IF NOT EXISTS ai_user_commands (
      id SERIAL PRIMARY KEY,
      message TEXT NOT NULL,
      ai_reply TEXT,
      source VARCHAR(50) NOT NULL DEFAULT 'public_chatbot',
      page_path VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_ai_user_commands_created_at
    ON ai_user_commands (created_at DESC)
  `);
}

/**
 * Log a visitor command without blocking the chat response.
 * @param {Function} query
 * @param {{ message: string, aiReply?: string, source?: string, pagePath?: string }} payload
 */
async function logUserCommand(query, { message, aiReply = null, source = 'public_chatbot', pagePath = null }) {
  const text = String(message || '').trim().slice(0, 2000);
  if (!text) return;

  await ensureUserCommandsTable(query);
  await query(
    `INSERT INTO ai_user_commands (message, ai_reply, source, page_path)
     VALUES ($1, $2, $3, $4)`,
    [
      text,
      aiReply != null ? String(aiReply).trim().slice(0, 4000) : null,
      String(source || 'public_chatbot').slice(0, 50),
      pagePath ? String(pagePath).trim().slice(0, 500) : null,
    ]
  );
}

/**
 * Fire-and-forget logger — never throws to caller.
 */
function logUserCommandSafe(query, payload) {
  logUserCommand(query, payload).catch((err) => {
    console.warn('[user-commands] Failed to log command:', err.message);
  });
}

module.exports = {
  ensureUserCommandsTable,
  logUserCommand,
  logUserCommandSafe,
};
