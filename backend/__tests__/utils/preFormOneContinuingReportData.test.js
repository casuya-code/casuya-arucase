/**
 * Pre-Form One continuing report data builder.
 *
 * Verifies the comments/tabia wiring (preform_one_comments +
 * preform_one_tabia_mwenendo) and the O-Level subject/summary shaping without a
 * live database by stubbing the `query` function.
 */
const {
  buildPreFormOneContinuingReportData,
  buildPreFormOneContinuingBulkReportData,
} = require('../../utils/preFormOneContinuingReportData');

function makeQuery() {
  return jest.fn(async (sql) => {
    const s = String(sql);
    // Order matters: the scores query also joins preformone_continuing_subjects.
    if (s.includes('FROM preform_one_scores')) {
      return { rows: [{ student_id: 7, subject_id: 1, score: 88, subject_code: 'MATH' }] };
    }
    if (s.includes('preformone_continuing_subjects')) {
      return { rows: [{ id: 1, subject_code: 'MATH', subject_name: 'Mathematics' }] };
    }
    if (s.includes('FROM preform_one_students')) {
      return {
        rows: [
          {
            id: 7,
            admission_number: 'PF-001',
            serial_number: 'S-1',
            first_name: 'Juma',
            middle_name: 'Hassan',
            surname: 'Mwinyi',
            sex: 'Male',
            parish: 'KIA',
            year: 2026,
          },
        ],
      };
    }
    if (s.includes('FROM preform_one_continuing_results')) {
      return {
        rows: [{ student_id: 7, total_marks: 88, average: 88, grade: 'A', position: 1 }],
      };
    }
    if (s.includes('FROM preform_one_comments')) {
      return {
        rows: [
          { student_id: 7, comment_type: 'taaluma', comment_text: 'Amefanya vizuri' },
          { student_id: 7, comment_type: 'sala', comment_text: 'Anahudhuria sala' },
        ],
      };
    }
    if (s.includes('FROM preform_one_tabia_mwenendo')) {
      return {
        rows: [
          { student_id: 7, criterion: '901', evaluation: 'A' },
          { student_id: 7, criterion: '902', evaluation: 'B' },
        ],
      };
    }
    if (s.includes('FROM fees_announcements')) {
      return { rows: [{ announcement_index: '1', announcement_text: 'Lipa ada ya Novemba' }] };
    }
    if (s.includes('FROM individual_debt')) {
      return { rows: [{ student_index: '7', amount: 5000, description: 'Ada ya Novemba' }] };
    }
    return { rows: [] }; // branding tables
  });
}

describe('preFormOneContinuingReportData', () => {
  it('attaches per-student comments and tabia evaluations', async () => {
    const query = makeQuery();
    const { reportData } = await buildPreFormOneContinuingReportData(query, {
      year: 2026,
      studentId: 7,
    });

    expect(reportData).not.toBeNull();
    expect(reportData.comments).toEqual({
      taaluma: 'Amefanya vizuri',
      sala: 'Anahudhuria sala',
    });
    expect(reportData.tabia_mwenendo).toEqual({ '901': 'A', '902': 'B' });
  });

  it('grades subjects on the O-Level scale and derives division/position', async () => {
    const query = makeQuery();
    const { reportData } = await buildPreFormOneContinuingReportData(query, {
      year: 2026,
      studentId: 7,
    });

    expect(reportData.subjects).toHaveLength(1);
    expect(reportData.subjects[0]).toMatchObject({
      subject_code: 'MATH',
      score: 88,
      grade: 'A',
      position: 1,
    });
    expect(reportData.summary.position).toBe(1);
    expect(reportData.summary.total_students).toBe(1);
  });

  it('builds bulk report data ordered by result position', async () => {
    const query = makeQuery();
    const list = await buildPreFormOneContinuingBulkReportData(query, { year: 2026 });
    expect(list).toHaveLength(1);
    expect(list[0].comments.taaluma).toBe('Amefanya vizuri');
  });

  it('wires fees announcements and the student debt from the shared tables', async () => {
    const query = makeQuery();
    const { reportData } = await buildPreFormOneContinuingReportData(query, {
      year: 2026,
      studentId: 7,
    });

    expect(reportData.class_fees_announcements).toEqual({ '1': 'Lipa ada ya Novemba' });
    expect(reportData.student_fees_debt).toBe('5000 - Ada ya Novemba');
  });

  it('tolerates missing comment tables (returns empty maps)', async () => {
    const base = makeQuery();
    const query = jest.fn(async (sql) => {
      const s = String(sql);
      if (s.includes('FROM preform_one_comments') || s.includes('FROM preform_one_tabia_mwenendo')) {
        throw new Error('relation does not exist');
      }
      return base(sql);
    });

    const { reportData } = await buildPreFormOneContinuingReportData(query, {
      year: 2026,
      studentId: 7,
    });
    expect(reportData.comments).toEqual({});
    expect(reportData.tabia_mwenendo).toEqual({});
  });
});
