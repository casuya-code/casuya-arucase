/**
 * Formatting for individual and bulk student report marks and weight labels.
 *
 * Marks are shown as whole numbers, but assessment weights keep their decimal
 * part (e.g. 20.5%, 12.25%) so the header always shows the configured value.
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
  // Strip floating-point noise (e.g. 0.1 + 0.2) without dropping real decimals.
  return String(Number(num.toFixed(10)));
}

module.exports = {
  formatReportScore,
  formatReportWeightPercent,
};
