/**
 * Mistral AI API - public chatbot and admin AI Matters.
 * Set MISTRAL_API_KEY in backend/.env (get a key from https://console.mistral.ai).
 * SDK is loaded lazily (ESM) so the server can start even if the package is not installed.
 */
let client = null;
let mistralModulePromise = null;

function loadMistralModule() {
  if (!mistralModulePromise) {
    mistralModulePromise = import('@mistralai/mistralai').catch((e) => {
      if (e.code === 'ERR_MODULE_NOT_FOUND' || e.code === 'MODULE_NOT_FOUND') return null;
      throw e;
    });
  }
  return mistralModulePromise;
}

const MODEL_FALLBACKS = [
  'mistral-small-latest',
  'mistral-medium-latest',
  'mistral-large-latest',
];

/** True when MISTRAL_API_KEY is set (sync check for route availability). */
function getClient() {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey || apiKey === '...') return null;
  return { configured: true };
}

async function getMistralClient() {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey || apiKey === '...') return null;
  if (client) return client;
  const mod = await loadMistralModule();
  if (!mod?.Mistral) return null;
  client = new mod.Mistral({ apiKey });
  return client;
}

/** Default temperature: lower = more focused and consistent for FAQ/context-based answers. */
const DEFAULT_TEMPERATURE = 0.2;

/**
 * Call Mistral with system prompt and user message. Used for public chatbot and admin AI Matters.
 * @param {string} systemPrompt - Instructions and context (FAQs, documents, NECTA, etc.).
 * @param {string} userMessage - User question.
 * @param {number} maxTokens - Max response length (default 2048 for public, 4096 for admin).
 * @param {number} [temperature] - 0–1; lower = more deterministic. Default 0.2.
 * @returns {Promise<string>}
 */
const MAX_SYSTEM_PROMPT_CHARS = 95000;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS_PER_MODEL = 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function trimSystemPrompt(systemPrompt) {
  const text = String(systemPrompt || '');
  if (text.length <= MAX_SYSTEM_PROMPT_CHARS) return text;
  const notice =
    '\n\n[Note: some lower-priority reference sections were trimmed to fit model limits. Answer from the sections above.]';
  return text.slice(0, MAX_SYSTEM_PROMPT_CHARS - notice.length) + notice;
}

function isRetryableError(err) {
  const status = err?.status ?? err?.statusCode;
  if (RETRYABLE_STATUSES.has(status)) return true;
  const msg = err?.message || String(err);
  return /rate limit|timeout|timed out|econnreset|socket hang up|503|429/i.test(msg);
}

async function callMistral(systemPrompt, userMessage, maxTokens = 2048, temperature = DEFAULT_TEMPERATURE) {
  const mistral = await getMistralClient();
  if (!mistral) {
    throw new Error('MISTRAL_API_KEY is not set. Add it to backend/.env');
  }
  const models = process.env.MISTRAL_MODEL ? [process.env.MISTRAL_MODEL] : MODEL_FALLBACKS;
  const cappedMaxTokens = Math.min(Math.max(maxTokens, 256), 8192);
  const cappedTemperature = Math.max(0, Math.min(1, temperature));
  const safeSystemPrompt = trimSystemPrompt(systemPrompt);
  let lastError = null;

  for (const model of models) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const result = await mistral.chat.complete({
          model,
          maxTokens: cappedMaxTokens,
          temperature: cappedTemperature,
          messages: [
            { role: 'system', content: safeSystemPrompt },
            { role: 'user', content: userMessage },
          ],
        });
        const content = result?.choices?.[0]?.message?.content;
        return typeof content === 'string' ? content : '';
      } catch (err) {
        lastError = err;
        const status = err?.status ?? err?.statusCode;
        const msg = err?.message || String(err);
        const is404 = status === 404 || /not_found|invalid_model|unknown_model/i.test(msg);
        if (is404 && models.length > 1) break;
        if (isRetryableError(err) && attempt + 1 < MAX_ATTEMPTS_PER_MODEL) {
          await sleep(800 * (attempt + 1));
          continue;
        }
        throw err;
      }
    }
  }
  throw lastError;
}

module.exports = { getClient, callMistral };
