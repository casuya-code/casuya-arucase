const {
  formatReportScore,
  formatReportWeightPercent,
} = require('../../utils/reportScoreFormat');

describe('report score formatting', () => {
  it('keeps marks as whole numbers', () => {
    expect(formatReportScore(84.6)).toBe('85');
    expect(formatReportScore(51.4)).toBe('51');
    expect(formatReportScore(null)).toBe('-');
  });

  it('keeps decimal parts in weight percentages', () => {
    expect(formatReportWeightPercent(20)).toBe('20');
    expect(formatReportWeightPercent(20.5)).toBe('20.5');
    expect(formatReportWeightPercent(12.25)).toBe('12.25');
    expect(formatReportWeightPercent(0)).toBe('0');
    expect(formatReportWeightPercent(undefined)).toBe('0');
  });

  it('does not leak floating-point noise into weight labels', () => {
    expect(formatReportWeightPercent(0.1 + 0.2)).toBe('0.3');
    expect(formatReportWeightPercent(30.000000000000004)).toBe('30');
  });
});
