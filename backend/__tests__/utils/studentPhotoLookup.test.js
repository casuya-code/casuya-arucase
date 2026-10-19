const { getStudentPhotoFilename } = require('../../utils/reportStudentExtras');

function fakeQuery(rows = []) {
  const calls = [];
  const fn = async (sql, params) => {
    calls.push({ sql, params });
    return { rows };
  };
  fn.calls = calls;
  return fn;
}

describe('getStudentPhotoFilename', () => {
  it('looks the photo up by adm_no, never by class position', async () => {
    const db = fakeQuery([{ photo_filename: 'smile.jpg' }]);

    const filename = await getStudentPhotoFilename(db, {
      admNo: 'S042',
      level: 'FORM II',
      normalizedStream: 'A',
      yearNum: 2026,
    });

    expect(filename).toBe('smile.jpg');
    expect(db.calls[0].sql).toContain('adm_no = $1');
    expect(db.calls[0].sql).not.toContain('student_index');
    expect(db.calls[0].params).toEqual(['S042', 'FORM II', 'A', 2026]);
  });

  it('still checks the NA stream for FORM I-IV stream A deployments', async () => {
    const db = fakeQuery([{ photo_filename: 'legacy.jpg' }]);

    await getStudentPhotoFilename(db, {
      admNo: 'S001',
      level: 'FORM I',
      normalizedStream: 'A',
      yearNum: 2026,
      isFormIToIV: true,
    });

    expect(db.calls[0].sql).toContain('stream IN ($3, $4)');
    expect(db.calls[0].params).toEqual(['S001', 'FORM I', 'A', 'NA', 2026]);
  });

  it('uses a single stream for non FORM I-IV levels', async () => {
    const db = fakeQuery([]);

    await getStudentPhotoFilename(db, {
      admNo: 'S007',
      level: 'FORM V',
      normalizedStream: 'PCM',
      yearNum: 2026,
      isFormIToIV: false,
    });

    expect(db.calls[0].sql).toContain('stream = $3');
    expect(db.calls[0].params).toEqual(['S007', 'FORM V', 'PCM', 2026]);
  });

  it('returns null when no photo row exists', async () => {
    const db = fakeQuery([]);

    await expect(getStudentPhotoFilename(db, {
      admNo: 'S042', level: 'FORM II', normalizedStream: 'A', yearNum: 2026,
    })).resolves.toBeNull();
  });

  it('returns null and skips the query when required fields are missing', async () => {
    const db = fakeQuery([{ photo_filename: 'x.jpg' }]);

    await expect(getStudentPhotoFilename(db, {
      admNo: '', level: 'FORM II', normalizedStream: 'A', yearNum: 2026,
    })).resolves.toBeNull();
    expect(db.calls).toHaveLength(0);
  });
});
