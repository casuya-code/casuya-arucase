/**
 * Anthropic Claude API - public chatbot only.
 * No access to student performance, admission, or protected data.
 * Copy ANTHROPIC_API_KEY from FAMILY-NEW .env into this project's backend .env.
 * SDK is loaded lazily so the server can start even if the package is not installed.
 */
let client = null;
let AnthropicModule = undefined; // undefined = not loaded yet, null = not installed, else the module

function loadAnthropic() {
  if (AnthropicModule !== undefined) return AnthropicModule;
  try {
    AnthropicModule = require('@anthropic-ai/sdk');
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') AnthropicModule = null;
    else throw e;
  }
  return AnthropicModule;
}

const MODEL_FALLBACKS = [
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307',
];

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'sk-ant-...') return null;
  const SDK = loadAnthropic();
  if (!SDK) return null;
  if (!client) client = new SDK({ apiKey });
  return client;
}

/** Default temperature: lower = more focused and consistent for FAQ/context-based answers. */
const DEFAULT_TEMPERATURE = 0.2;

/**
 * Call Claude with system prompt and user message. Used for public chatbot and admin AI Matters.
 * @param {string} systemPrompt - Instructions and context (FAQs, documents, NECTA, etc.).
 * @param {string} userMessage - User question.
 * @param {number} maxTokens - Max response length (default 2048 for public, 4096 for admin).
 * @param {number} [temperature] - 0–1; lower = more deterministic. Default 0.2.
 * @returns {Promise<string>}
 */
async function callClaude(systemPrompt, userMessage, maxTokens = 2048, temperature = DEFAULT_TEMPERATURE) {
  const anthropic = getClient();
  if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not set. Copy it from FAMILY-NEW .env to backend .env');
  const models = process.env.ANTHROPIC_MODEL ? [process.env.ANTHROPIC_MODEL] : MODEL_FALLBACKS;
  let lastError = null;
  for (const model of models) {
    try {
      const msg = await anthropic.messages.create({
        model,
        max_tokens: Math.min(Math.max(maxTokens, 256), 8192),
        temperature: Math.max(0, Math.min(1, temperature)),
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      const textBlock = msg.content.find((b) => b.type === 'text');
      return textBlock && textBlock.text ? textBlock.text : '';
    } catch (err) {
      lastError = err;
      const status = err?.status;
      const msg = err?.message || String(err);
      const is404 = status === 404 || /not_found|invalid_model/.test(msg);
      if (is404 && models.length > 1) continue;
      throw err;
    }
  }
  throw lastError;
}

module.exports = { getClient, callClaude };
