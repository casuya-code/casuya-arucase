import { describe, it, expect } from 'vitest';
import {
  normalizeSubjectCode,
  scoreForSubject,
  buildSubjectScoresMap,
  calculateInterviewMetrics,
  assignResultPositions,
  mergeAutoAndSavedResult,
  formatSubjectScoreCell,
  calculateResultsStats,
} from '../preFormOneResultsUtils';

const subjects = (...codes) => codes.map((subject_code) => ({ subject_code }));

describe('normalizeSubjectCode', () => {
  it('trims and uppercases codes', () => {
    expect(normalizeSubjectCode(' eng ')).toBe('ENG');
    expect(normalizeSubjectCode('Math')).toBe('MATH');
  });

  it('returns an empty string for missing codes', () => {
    expect(normalizeSubjectCode(null)).toBe('');
    expect(normalizeSubjectCode('')).toBe('');
  });
});

describe('scoreForSubject', () => {
  it('matches the normalized code first', () => {
    expect(scoreForSubject({ ENG: 70 }, 'eng')).toBe(70);
  });

  it('falls back to the raw key', () => {
    expect(scoreForSubject({ eng: 70 }, 'eng')).toBe(70);
  });

  it('returns undefined when there is no score map', () => {
    expect(scoreForSubject(null, 'ENG')).toBeUndefined();
  });
});

describe('buildSubjectScoresMap', () => {
  it('groups scores by admission number with normalized codes', () => {
    const map = buildSubjectScoresMap(
      [
        { admission_number: 'P1001', subject_code: 'eng', score: 70 },
        { admission_number: 'P1001', subject_code: 'math', score: 60 },
        { admission_number: 'P1002', subject_code: 'ENG', score: 55 },
      ],
      (adm) => adm
    );

    expect(map).toEqual({
      P1001: { ENG: 70, MATH: 60 },
      P1002: { ENG: 55 },
    });
  });

  it('skips rows without an admission number or subject code', () => {
    const map = buildSubjectScoresMap(
      [
        { admission_number: null, subject_code: 'ENG', score: 70 },
        { admission_number: 'P1001', subject_code: '', score: 70 },
        { admission_number: 'P1003', subject_code: 'ENG', score: 80 },
      ],
      (adm) => adm
    );

    expect(map).toEqual({ P1003: { ENG: 80 } });
  });

  it('returns an empty map for non-array input', () => {
    expect(buildSubjectScoresMap(null, (adm) => adm)).toEqual({});
  });
});

describe('calculateInterviewMetrics', () => {
  it('reports no result when there are no active subjects', () => {
    expect(calculateInterviewMetrics({ ENG: 90 }, [])).toEqual({
      total_marks: 0,
      average: 0,
      grade: '-',
      remarks: '-',
    });
  });

  it('averages scored subjects only', () => {
    const metrics = calculateInterviewMetrics(
      { ENG: 80, MATH: 60, PHYS: null, CHEM: '', BIO: undefined },
      subjects('ENG', 'MATH', 'PHYS', 'CHEM', 'BIO')
    );

    expect(metrics.total_marks).toBe(140);
    expect(metrics.average).toBe(70);
  });

  it('ignores non-numeric scores instead of counting them as zero', () => {
    const metrics = calculateInterviewMetrics({ ENG: 80, MATH: 'abc' }, subjects('ENG', 'MATH'));

    expect(metrics.total_marks).toBe(80);
    expect(metrics.average).toBe(80);
    expect(metrics.grade).toBe('A');
  });

  it('uses the canonical Pre-Form One bands with a pass mark of 65', () => {
    const passing = calculateInterviewMetrics({ ENG: 65 }, subjects('ENG'));
    expect(passing).toMatchObject({ average: 65, grade: 'C', remarks: 'AMECHAGULIWA' });

    const failing = calculateInterviewMetrics({ ENG: 64 }, subjects('ENG'));
    expect(failing).toMatchObject({ average: 64, grade: 'D', remarks: 'HAJACHAGULIWA' });

    const top = calculateInterviewMetrics({ ENG: 85 }, subjects('ENG'));
    expect(top).toMatchObject({ average: 85, grade: 'A', remarks: 'AMECHAGULIWA' });

    const bottom = calculateInterviewMetrics({ ENG: 44 }, subjects('ENG'));
    expect(bottom).toMatchObject({ average: 44, grade: 'F', remarks: 'HAJACHAGULIWA' });
  });

  it('grades the rounded average so the grid matches the stored row', () => {
    // 194.99 / 3 = 64.9966... -> stored as 65 -> C / AMECHAGULIWA
    const metrics = calculateInterviewMetrics(
      { ENG: 65, MATH: 65, PHYS: 64.99 },
      subjects('ENG', 'MATH', 'PHYS')
    );

    expect(metrics.average).toBe(65);
    expect(metrics.grade).toBe('C');
    expect(metrics.remarks).toBe('AMECHAGULIWA');
  });

  it('accepts scores stored as strings', () => {
    const metrics = calculateInterviewMetrics({ ENG: '75', MATH: '65' }, subjects('ENG', 'MATH'));

    expect(metrics.total_marks).toBe(140);
    expect(metrics.average).toBe(70);
    expect(metrics.grade).toBe('B');
  });

  it('rounds the average to two decimals', () => {
    const metrics = calculateInterviewMetrics({ ENG: 70, MATH: 71, PHYS: 72 }, subjects('ENG', 'MATH', 'PHYS'));

    expect(metrics.average).toBe(71);
  });

  it('keeps showing a fail row for a student with no usable score', () => {
    const metrics = calculateInterviewMetrics({ ENG: null, MATH: '' }, subjects('ENG', 'MATH'));

    expect(metrics).toEqual({
      total_marks: 0,
      average: 0,
      grade: 'F',
      remarks: 'HAJACHAGULIWA',
    });
  });
});

describe('assignResultPositions', () => {
  it('ranks by descending average', () => {
    const positioned = assignResultPositions({
      P1001: { average: 60 },
      P1002: { average: 80 },
      P1003: { average: 70 },
    });

    expect(positioned.P1001.position).toBe(3);
    expect(positioned.P1002.position).toBe(1);
    expect(positioned.P1003.position).toBe(2);
  });

  it('gives tied averages the same position and skips the next one', () => {
    const positioned = assignResultPositions({
      P1001: { average: 90 },
      P1002: { average: 90 },
      P1003: { average: 80 },
    });

    expect(positioned.P1001.position).toBe(1);
    expect(positioned.P1002.position).toBe(1);
    expect(positioned.P1003.position).toBe(3);
  });

  it('compares rounded averages like the API does', () => {
    // 80.004 and 79.996 both store as 80, so all three share one position.
    const rounded = assignResultPositions({
      P1001: { average: 80.004 },
      P1002: { average: 80 },
      P1003: { average: 79.996 },
    });

    expect(rounded.P1001.position).toBe(1);
    expect(rounded.P1002.position).toBe(1);
    expect(rounded.P1003.position).toBe(1);

    const distinct = assignResultPositions({
      P1001: { average: 80 },
      P1002: { average: 80 },
      P1003: { average: 79.99 },
    });

    expect(distinct.P1001.position).toBe(1);
    expect(distinct.P1002.position).toBe(1);
    expect(distinct.P1003.position).toBe(3);
  });

  it('treats an unusable average as zero', () => {
    const positioned = assignResultPositions({
      P1001: { average: null },
      P1002: {},
      P1003: { average: 70 },
    });

    expect(positioned.P1001.position).toBe(2);
    expect(positioned.P1002.position).toBe(2);
    expect(positioned.P1003.position).toBe(1);
  });

  it('does not mutate the input object', () => {
    const results = { P1001: { average: 60 } };
    assignResultPositions(results);

    expect(results.P1001.position).toBeUndefined();
  });
});

describe('mergeAutoAndSavedResult', () => {
  it('prefers live totals but keeps saved-only fields', () => {
    const merged = mergeAutoAndSavedResult(
      { total_marks: 140, average: 70, grade: 'B' },
      { total_marks: 100, average: 50, grade: 'D', position: 4, rank: 7 }
    );

    expect(merged).toEqual({
      total_marks: 140,
      average: 70,
      grade: 'B',
      position: 4,
      rank: 7,
    });
  });

  it('leaves position to assignResultPositions', () => {
    const merged = mergeAutoAndSavedResult(
      { total_marks: 140, average: 70, position: 9 },
      { total_marks: 100, average: 50, position: 1 }
    );

    expect(merged.position).toBe(9);
  });

  it('handles one-sided input', () => {
    expect(mergeAutoAndSavedResult({ average: 70 }, null)).toEqual({ average: 70 });
    expect(mergeAutoAndSavedResult(null, { average: 50 })).toEqual({ average: 50 });
    expect(mergeAutoAndSavedResult(null, null)).toEqual({});
  });
});

describe('formatSubjectScoreCell', () => {
  it('shows a dash for missing scores', () => {
    expect(formatSubjectScoreCell(undefined)).toBe('-');
    expect(formatSubjectScoreCell(null)).toBe('-');
    expect(formatSubjectScoreCell('')).toBe('-');
  });

  it('shows whole numbers without a decimal part', () => {
    expect(formatSubjectScoreCell(80)).toBe('80');
    expect(formatSubjectScoreCell('80')).toBe('80');
  });

  it('trims trailing zeros from fractions', () => {
    expect(formatSubjectScoreCell(71.50)).toBe('71.5');
    expect(formatSubjectScoreCell(71.25)).toBe('71.25');
  });

  it('keeps non-numeric values as text', () => {
    expect(formatSubjectScoreCell('absent')).toBe('absent');
  });
});

describe('calculateResultsStats', () => {
  it('counts graded rows and averages the graded averages', () => {
    const stats = calculateResultsStats({
      P1001: { grade: 'B', average: 70 },
      P1002: { grade: 'A', average: 80 },
      P1003: { grade: 'C', average: 69 },
    });

    expect(stats.graded).toBe(3);
    expect(stats.averageScore).toBe(73);
  });

  it('rounds the average score to one decimal', () => {
    const stats = calculateResultsStats({
      P1001: { grade: 'B', average: 70 },
      P1002: { grade: 'B', average: 71 },
    });

    expect(stats.averageScore).toBe(70.5);
  });

  it('ignores a zero or missing average so one ungraded student cannot skew it', () => {
    const stats = calculateResultsStats({
      P1001: { grade: 'B', average: 70 },
      P1002: { grade: '-', average: 0 },
      P1003: { grade: 'A', average: 80 },
    });

    expect(stats.graded).toBe(3);
    expect(stats.averageScore).toBe(75);
  });

  it('returns a null average when nothing is graded', () => {
    expect(calculateResultsStats({})).toEqual({ graded: 0, averageScore: null });
    expect(calculateResultsStats({ P1001: { average: 0 } })).toEqual({
      graded: 0,
      averageScore: null,
    });
  });
});
