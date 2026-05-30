/**
 * Whole-number formatting for individual and bulk student report marks.
 */

function formatReportScore(value) {
  if (value === undefined || value === null || value === '') return '-';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  return String(Math.round(num));
}

function formatReportWeightPercent(value) {
  if (value === undefined || value === null || value === '') return '0';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  return String(Math.round(num));
}

module.exports = {
  formatReportScore,
  formatReportWeightPercent,
};
