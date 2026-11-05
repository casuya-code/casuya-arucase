const { getStudentPhotoFilename } = require('../../utils/reportStudentExtras');

function fakeQuery(...rowSets) {
  const calls = [];
  let callIdx = 0;
  const fn = async (sql, params) => {
    calls.push({ sql, params });
    const rows = rowSets[callIdx] !== undefined ? rowSets[callIdx] : (rowSets[rowSets.length - 1] || []);
    callIdx += 1;
    return { rows };
  };
  fn.calls = calls;
  return fn;
}

describe('getStudentPhotoFilename', () => {
  it('looks the photo up by adm_no across any year when student is registered', async () => {
    const db = fakeQuery([{ photo_filename: 'smile.jpg' }]);

    const filename = await getStudentPhotoFilename(db, {
      admNo: 'S042',
      level: 'FORM II',
      normalizedStream: 'A',
      yearNum: 2026,
    });

    expect(filename).toBe('smile.jpg');
    // First call verifies student is registered; second call fetches photo by adm_no (no year filter)
    expect(db.calls).toHaveLength(2);
    const photoCall = db.calls[1];
    expect(photoCall.sql).toContain('adm_no = $1');
    expect(photoCall.sql).not.toContain('student_index');
    expect(photoCall.sql).not.toContain('AND year =');
    expect(photoCall.params).toEqual(['S042', 'FORM II', 'A']);
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

    expect(db.calls[1].sql).toContain('stream IN ($3, $4)');
    expect(db.calls[1].params).toEqual(['S001', 'FORM I', 'A', 'NA']);
  });

  it('uses a single stream for non FORM I-IV levels', async () => {
    // First call (existence) returns a row so student is registered; second call (photo) checks stream
    const db = fakeQuery([{ adm_no: 'S007' }, []]);

    await getStudentPhotoFilename(db, {
      admNo: 'S007',
      level: 'FORM V',
      normalizedStream: 'PCM',
      yearNum: 2026,
      normalizedTerm: 'First Term',
      isFormIToIV: false,
    });

    expect(db.calls).toHaveLength(2);
    expect(db.calls[1].sql).toContain('stream = $3');
    expect(db.calls[1].params).toEqual(['S007', 'FORM V', 'PCM']);
  });

  it('returns null when student is not registered in that year/term', async () => {
    // students table lookup returns empty -> student not registered
    const db = fakeQuery([]);

    await expect(getStudentPhotoFilename(db, {
      admNo: 'S042', level: 'FORM II', normalizedStream: 'A', yearNum: 2026,
    })).resolves.toBeNull();
    expect(db.calls).toHaveLength(1); // only the existence check, no photo lookup
  });

  it('returns null when no photo row exists but student is registered', async () => {
    // first call (existence) returns a row -> student registered; second call (photo) returns empty
    const db = fakeQuery([{ adm_no: 'S042' }, []]);

    await expect(getStudentPhotoFilename(db, {
      admNo: 'S042', level: 'FORM II', normalizedStream: 'A', yearNum: 2026,
    })).resolves.toBeNull();
    expect(db.calls).toHaveLength(2);
  });

  it('returns null and skips the query when required fields are missing', async () => {
    const db = fakeQuery([{ photo_filename: 'x.jpg' }]);

    await expect(getStudentPhotoFilename(db, {
      admNo: '', level: 'FORM II', normalizedStream: 'A', yearNum: 2026,
    })).resolves.toBeNull();
    expect(db.calls).toHaveLength(0);
  });
});
