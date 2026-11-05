/**
 * AI chat helpers for public chatbot and admin AI Matters.
 *
 * Providers (tried in order): Groq (if GROQ_API_KEY set), then Mistral (if MISTRAL_API_KEY set).
 * Groq uses an OpenAI-compatible endpoint; Mistral uses its SDK.
 * Set keys in backend/.env.
 */
let mistralClient = null;
let mistralModulePromise = null;

/** Providers that returned 401/403 — skipped for the rest of the process. */
const failedProviders = new Set();
let lastAuthFailureMessage = '';

const MODEL_FALLBACKS = [
  'mistral-small-latest',
  'mistral-medium-latest',
  'mistral-large-latest',
];

/** True when at least one provider key is configured and not failed. */
function getClient() {
  const groqKey = (process.env.GROQ_API_KEY || '').trim();
  const mistralKey = (process.env.MISTRAL_API_KEY || '').trim();
  const groqOk = !!groqKey && groqKey !== '...' && !failedProviders.has('groq');
  const mistralOk = !!mistralKey && mistralKey !== '...' && !failedProviders.has('mistral');
  if (!groqOk && !mistralOk) return null;
  return { configured: true, groq: groqOk, mistral: mistralOk };
}

function loadMistralModule() {
  if (!mistralModulePromise) {
    mistralModulePromise = import('@mistralai/mistralai').catch((e) => {
      if (e.code === 'ERR_MODULE_NOT_FOUND' || e.code === 'MODULE_NOT_FOUND') return null;
      throw e;
    });
  }
  return mistralModulePromise;
}

async function getMistralClient() {
  const apiKey = (process.env.MISTRAL_API_KEY || '').trim();
  if (!apiKey || apiKey === '...') return null;
  if (mistralClient) return mistralClient;
  const mod = await loadMistralModule();
  if (!mod?.Mistral) return null;
  mistralClient = new mod.Mistral({ apiKey });
  return mistralClient;
}

const DEFAULT_TEMPERATURE = 0.2;

function normalizeHistory(history, maxTurns = 8) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-maxTurns)
    .map((turn) => {
      const rawRole = String(turn?.role || '').toLowerCase();
      const role = rawRole === 'assistant' || rawRole === 'bot' ? 'assistant' : 'user';
      const content = String(turn?.content ?? turn?.text ?? '').trim().slice(0, 1500);
      return content ? { role, content } : null;
    })
    .filter(Boolean);
}

const MAX_SYSTEM_PROMPT_CHARS = 95000;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS_PER_MODEL = 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function trimSystemPrompt(systemPrompt, maxChars = MAX_SYSTEM_PROMPT_CHARS) {
  const text = String(systemPrompt || '');
  if (text.length <= maxChars) return text;
  const notice =
    '\n\n[Note: some lower-priority reference sections were trimmed to fit model limits. Answer from the sections above.]';
  return text.slice(0, maxChars - notice.length) + notice;
}

function isRetryableError(err) {
  const status = err?.status ?? err?.statusCode;
  if (RETRYABLE_STATUSES.has(status)) return true;
  const msg = err?.message || String(err);
  return /rate limit|timeout|timed out|econnreset|socket hang up|503|429/i.test(msg);
}

function markAuthFailure(provider, message) {
  failedProviders.add(provider);
  lastAuthFailureMessage = message;
}

async function callGroq(systemPrompt, userMessage, maxTokens, temperature, history) {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey || apiKey === '...') throw new Error('GROQ_API_KEY is not set.');
  if (failedProviders.has('groq')) throw new Error(lastAuthFailureMessage || 'Groq auth failed.');
  const model = (process.env.GROQ_MODEL || 'openai/gpt-oss-20b').trim();
  const cappedMaxTokens = Math.min(Math.max(maxTokens, 256), 8192);
  const cappedTemperature = Math.max(0, Math.min(1, temperature));
  const safeSystemPrompt = trimSystemPrompt(systemPrompt, 22000);
  const messages = [
    { role: 'system', content: safeSystemPrompt },
    ...normalizeHistory(history),
    { role: 'user', content: userMessage },
  ];
  const body = {
    model,
    messages,
    max_tokens: cappedMaxTokens,
    temperature: cappedTemperature,
  };
  if (/gpt-oss/i.test(model)) body.reasoning_effort = 'low';
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`API error occurred: Status ${res.status}. Body: ${body}`);
    err.status = res.status;
    if (res.status === 401 || res.status === 403) {
      markAuthFailure('groq', 'GROQ_API_KEY was rejected (401/403). Replace it in backend/.env and restart the server.');
    }
    throw err;
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : '';
}

async function callMistralProvider(systemPrompt, userMessage, maxTokens, temperature, history) {
  const mistral = await getMistralClient();
  if (!mistral) throw new Error('MISTRAL_API_KEY is not set. Add it to backend/.env');
  if (failedProviders.has('mistral')) throw new Error(lastAuthFailureMessage || 'Mistral auth failed.');
  const models = process.env.MISTRAL_MODEL ? [process.env.MISTRAL_MODEL] : MODEL_FALLBACKS;
  const cappedMaxTokens = Math.min(Math.max(maxTokens, 256), 8192);
  const cappedTemperature = Math.max(0, Math.min(1, temperature));
  const safeSystemPrompt = trimSystemPrompt(systemPrompt);
  const messages = [
    { role: 'system', content: safeSystemPrompt },
    ...normalizeHistory(history),
    { role: 'user', content: userMessage },
  ];
  let lastError = null;
  for (const model of models) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const result = await mistral.chat.complete({
          model,
          maxTokens: cappedMaxTokens,
          temperature: cappedTemperature,
          messages,
        });
        const content = result?.choices?.[0]?.message?.content;
        return typeof content === 'string' ? content : '';
      } catch (err) {
        lastError = err;
        const status = err?.status ?? err?.statusCode;
        const msg = err?.message || String(err);
        if (status === 401 || status === 403) {
          markAuthFailure('mistral', 'MISTRAL_API_KEY was rejected (401/403). Replace it in backend/.env and restart the server.');
          throw new Error(lastAuthFailureMessage);
        }
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

/**
 * Try providers in priority order (Groq, then Mistral). Falls through on errors.
 */
async function callMistral(systemPrompt, userMessage, maxTokens = 2048, temperature = DEFAULT_TEMPERATURE, history = []) {
  const providers = [];
  if ((process.env.GROQ_API_KEY || '').trim() && (process.env.GROQ_API_KEY || '').trim() !== '...') providers.push('groq');
  if ((process.env.MISTRAL_API_KEY || '').trim() && (process.env.MISTRAL_API_KEY || '').trim() !== '...') providers.push('mistral');

  let lastError = null;
  for (const provider of providers) {
    if (failedProviders.has(provider)) continue;
    try {
      if (provider === 'groq') {
        return await callGroq(systemPrompt, userMessage, maxTokens, temperature, history);
      }
      return await callMistralProvider(systemPrompt, userMessage, maxTokens, temperature, history);
    } catch (err) {
      lastError = err;
      const status = err?.status ?? err?.statusCode;
      // Only fail fast on auth errors; for rate limits / other errors, try the next provider.
      if (status !== 401 && status !== 403) {
        // continue to next provider
      }
    }
  }
  if (lastAuthFailureMessage && failedProviders.size === providers.length) {
    throw new Error(lastAuthFailureMessage);
  }
  throw lastError || new Error('No AI provider configured. Set GROQ_API_KEY or MISTRAL_API_KEY in backend/.env');
}

module.exports = { getClient, callMistral };
