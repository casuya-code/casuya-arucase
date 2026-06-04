/**
 * Shared level/stream/term matching for class-scoped DB operations.
 */
const { normalizeStream } = require('./streamNormalizer');
const { getTermMatchValues } = require('./termNormalizer');

function getLevelMatchValues(level) {
  const L = level != null ? String(level).trim().toUpperCase() : '';
  if (L.length > 50) throw new Error('Invalid level value: too long');
  const variants = [L];
  if (/^FORM\s+I$/.test(L)) variants.push('FORM I', 'FORM 1');
  else if (/^FORM\s+II$/.test(L)) variants.push('FORM II', 'FORM 2');
  else if (/^FORM\s+III$/.test(L)) variants.push('FORM III', 'FORM 3');
  else if (/^FORM\s+IV$/.test(L)) variants.push('FORM IV', 'FORM 4');
  else if (/^FORM\s+V$/.test(L)) variants.push('FORM V', 'FORM 5');
  else if (/^FORM\s+VI$/.test(L)) variants.push('FORM VI', 'FORM 6');
  return [...new Set(variants)];
}

/**
 * @returns {{ levelValues: string[], streams: string[], yearNum: number, termValues: string[]|null, label: string }}
 */
function parseClassScope({ level, stream, year, term }) {
  if (!level || !String(level).trim()) throw new Error('level is required');
  if (!stream || !String(stream).trim()) throw new Error('stream is required');
  const yearNum = parseInt(year, 10);
  if (!Number.isFinite(yearNum) || yearNum <= 0 || yearNum > 2100) {
    throw new Error('year is required');
  }

  const levelValues = getLevelMatchValues(level);
  const normalizedStream = normalizeStream(String(stream).trim());
  const primaryLevel = levelValues[0];
  const isFormIV = /^FORM\s+(I|II|III|IV)$/i.test(primaryLevel);
  const streams =
    isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')
      ? ['A', 'NA']
      : [normalizedStream];

  const termValues =
    term != null && String(term).trim() !== '' ? getTermMatchValues(term) : null;

  const termLabel = termValues ? termValues[0] : 'all terms';
  const label = `${primaryLevel} ${streams.join('/')} ${yearNum} (${termLabel})`;

  return { levelValues, streams, yearNum, termValues, label, primaryLevel };
}

/** Must match client confirmation dialog (RegistrationForm bulk delete). */
function buildBulkDeleteConfirmPhrase(scopeInput) {
  const scope = parseClassScope(scopeInput);
  return `DELETE ${scope.label}`;
}

module.exports = {
  getTermMatchValues,
  getLevelMatchValues,
  parseClassScope,
  buildBulkDeleteConfirmPhrase,
  normalizeStream,
};
