/**
 * Shared term label normalization (students routes, Form V/VI promotion, reports).
 */

function normalizeTerm(term) {
  const t = term != null ? String(term).trim() : '';
  if (/^Term\s+I$/i.test(t) || /^Term\s+1$/i.test(t) || /^First\s+Term$/i.test(t)) {
    return 'First Term';
  }
  if (/^Term\s+II$/i.test(t) || /^Term\s+2$/i.test(t) || /^Second\s+Term$/i.test(t)) {
    return 'Second Term';
  }
  return t || 'First Term';
}

function getTermMatchValues(term) {
  const t = term != null ? String(term).trim() : '';
  if (t.length > 50) {
    throw new Error('Invalid term value: too long');
  }
  const variants = [t];
  if (/^Term\s+I$/i.test(t) || /^Term\s+1$/i.test(t) || /^First\s+Term$/i.test(t)) {
    variants.push('Term I', 'Term 1', 'First Term');
  } else if (/^Term\s+II$/i.test(t) || /^Term\s+2$/i.test(t) || /^Second\s+Term$/i.test(t)) {
    variants.push('Term II', 'Term 2', 'Second Term');
  } else if (/^Term\s+III$/i.test(t) || /^Term\s+3$/i.test(t)) {
    variants.push('Term III', 'Term 3');
  } else if (/^Term\s+IV$/i.test(t) || /^Term\s+4$/i.test(t)) {
    variants.push('Term IV', 'Term 4');
  }
  return [...new Set(variants)];
}

module.exports = {
  normalizeTerm,
  getTermMatchValues,
};
