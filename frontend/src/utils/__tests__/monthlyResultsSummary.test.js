import { describe, expect, it } from 'vitest';
import {
  buildMonthlyResultsSummary,
  dedupeSubjects,
} from '../monthlyResultsSummary';

const aLevelSubjects = [
  { subject_code: 'A/PHY', subject_abbreviation: 'A/PHY', subject_name: 'ADVANCED PHYSICS' },
  { subject_code: 'A/CHE', subject_abbreviation: 'A/CHE', subject_name: 'ADVANCED CHEMISTRY' },
  { subject_code: 'A/BIO', subject_abbreviation: 'A/BIO', subject_name: 'ADVANCED BIOLOGY' },
  { subject_code: 'A/MAT', subject_abbreviation: 'A/MAT', subject_name: 'ADVANCED MATHEMATICS' },
  { subject_code: 'A/DIV', subject_abbreviation: 'A/DIV', subject_name: 'ADVANCED DIVINITY' },
  { subject_code: 'A/COM', subject_abbreviation: 'A/COM', subject_name: 'ADVANCED COMPUTER STUDIES' },
  { subject_code: 'A/HTM', subject_abbreviation: 'A/HTM', subject_name: 'ADVANCED HISTORIA YA TANZANIA NA MAADILI' },
];

describe('buildMonthlyResultsSummary', () => {
  it('uses each A-Level student combination and counts every registered student', () => {
    const students = [
      { adm_no: 'S1', com: 'PCM' },
      { adm_no: 'S2', com: 'PCB' },
      // Combined view: page stream is ALL and this student has no recognisable
      // combination. They must still be counted instead of silently vanishing.
      { adm_no: 'S3', com: 'ALL' },
    ];
    const subjectScores = {
      S1: { 'A/PHY': 80, 'A/CHE': 76, 'A/MAT': 60, 'A/DIV': 90 },
      S2: { 'A/PHY': 60, 'A/CHE': 58, 'A/BIO': 70 },
      S3: { 'A/DIV': 88, 'A/COM': 72, 'A/HTM': 66 },
    };

    const summary = buildMonthlyResultsSummary({
      students,
      subjectScores,
      subjects: aLevelSubjects,
      isALevel: true,
      gradingSystem: 'seminary',
      fallbackStream: 'ALL',
    });

    expect(summary.registeredCount).toBe(3);
    expect(summary.gradeCols).toEqual(['A', 'B', 'C', 'D', 'E', 'S', 'F']);
    // I (PCM: 2+2+4 = 8), II (PCB: 4+5+3 = 12), 0 (unclassifiable fallback).
    expect(summary.divisionCounts).toMatchObject({ I: 1, II: 1, '0': 1 });
    expect(Object.values(summary.divisionCounts).reduce((a, b) => a + b, 0)).toBe(3);

    // A/DIV is a fourth subject, not the advanced-mathematics combo subject.
    expect(summary.subjectGradeCounts['A/DIV']).toMatchObject({ A: 2, total: 2 });
    expect(summary.subjectGradeCounts['A/MAT']).toMatchObject({ D: 1, total: 1 });
    expect(summary.subjectGradeCounts['A/BIO']).toMatchObject({ C: 1, total: 1 });
  });

  it('keeps A-Level D/E/S/F buckets present even when their counts are zero', () => {
    const summary = buildMonthlyResultsSummary({
      students: [{ adm_no: 'S1', com: 'PCM' }],
      subjectScores: { S1: { 'A/PHY': 63, 'A/CHE': 58, 'A/MAT': 47 } },
      subjects: aLevelSubjects,
      isALevel: true,
      gradingSystem: 'seminary',
      fallbackStream: 'PCM',
    });

    const phy = summary.subjectGradeCounts['A/PHY'];
    expect(phy.D).toBe(1);
    expect(phy.E).toBe(0);
    expect(phy.S).toBe(0);
    expect(phy.F).toBe(0);
    expect(phy.A + phy.B + phy.C + phy.D + phy.E + phy.S + phy.F).toBe(phy.total);
  });

  it('uses the five O-Level grade columns', () => {
    const summary = buildMonthlyResultsSummary({
      students: [],
      subjectScores: {},
      subjects: [{ subject_code: 'MAT', subject_abbreviation: 'MAT' }],
      isALevel: false,
      gradingSystem: 'government',
      fallbackStream: 'A',
    });
    expect(summary.gradeCols).toEqual(['A', 'B', 'C', 'D', 'F']);
  });
});

describe('dedupeSubjects', () => {
  it('removes advanced-prefixed duplicates', () => {
    const deduped = dedupeSubjects([
      { subject_code: 'A/DIV', subject_abbreviation: 'A/DIV' },
      { subject_code: 'DIV', subject_abbreviation: 'DIV' },
      { subject_code: 'ECO', subject_abbreviation: 'ECO' },
    ]);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].subject_code).toBe('A/DIV');
  });
});
