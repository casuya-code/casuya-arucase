const SUBJECT_TEACHER_CSV_HEADERS = [
  'Subject Code',
  'Subject Name',
  'Teacher Name',
  'Teacher Signature',
];

const MAX_SUBJECT_TEACHER_ROWS = 1000;

function normalizeHeader(value) {
  return String(value || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function restoreExcelEscapedValue(value) {
  const text = String(value || '');
  return /^'[=+\-@]/.test(text) ? text.slice(1) : text;
}

function escapeCsvValue(value) {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildSubjectTeacherCsv(subjects, teachers = {}) {
  const rows = subjects.map((subject) => {
    const subjectCode = subject.subject_code || subject.subject_abbreviation || '';
    const assignment =
      teachers[subjectCode] ||
      (subject.subject_abbreviation ? teachers[subject.subject_abbreviation] : null) ||
      {};
    return [
      subjectCode,
      subject.subject_name || '',
      assignment.teacher_name || '',
      assignment.teacher_signature || '',
    ];
  });

  return `\uFEFF${[SUBJECT_TEACHER_CSV_HEADERS, ...rows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\r\n')}\r\n`;
}

function parseCsvRows(input) {
  const source = Buffer.isBuffer(input) ? input.toString('utf8') : String(input ?? '');
  const text = source.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };

  const pushRow = () => {
    pushField();
    if (row.some((value) => String(value).trim() !== '')) {
      rows.push(row);
    }
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === ',' && !inQuotes) {
      pushField();
    } else if ((character === '\n' || character === '\r') && !inQuotes) {
      pushRow();
      if (character === '\r' && text[index + 1] === '\n') {
        index += 1;
      }
    } else {
      field += character;
    }
  }

  if (inQuotes) {
    throw new Error('CSV contains an unclosed quoted field');
  }

  if (field !== '' || row.length > 0) {
    pushRow();
  }

  return rows;
}

function findHeaderIndex(headers, aliases) {
  return headers.findIndex((header) => aliases.includes(header));
}

function parseSubjectTeacherCsv(input) {
  const records = parseCsvRows(input);
  if (records.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headers = records[0].map(normalizeHeader);
  const subjectCodeIndex = findHeaderIndex(headers, ['subjectcode', 'code']);
  const teacherNameIndex = findHeaderIndex(headers, [
    'teachername',
    'teachersname',
    'teacher',
  ]);

  if (subjectCodeIndex === -1 || teacherNameIndex === -1) {
    throw new Error('CSV must contain columns: Subject Code and Teacher Name');
  }

  const subjectNameIndex = findHeaderIndex(headers, ['subjectname']);
  const teacherSignatureIndex = findHeaderIndex(headers, [
    'teachersignature',
    'signature',
  ]);
  const rows = records.slice(1).map((cells, index) => ({
    row: index + 2,
    subjectCode: restoreExcelEscapedValue(cells[subjectCodeIndex]).trim(),
    subjectName: subjectNameIndex >= 0
      ? restoreExcelEscapedValue(cells[subjectNameIndex]).trim()
      : '',
    teacherName: restoreExcelEscapedValue(cells[teacherNameIndex]).trim(),
    teacherSignature: teacherSignatureIndex >= 0
      ? restoreExcelEscapedValue(cells[teacherSignatureIndex]).trim()
      : '',
  }));

  if (rows.length === 0) {
    throw new Error('CSV must contain at least one data row');
  }
  if (rows.length > MAX_SUBJECT_TEACHER_ROWS) {
    throw new Error(`CSV cannot contain more than ${MAX_SUBJECT_TEACHER_ROWS} data rows`);
  }

  return rows;
}

function validateSubjectTeacherRows(rows, subjects) {
  const subjectLookup = new Map();
  const seenSubjects = new Set();
  const errors = [];
  const assignments = [];
  let skipped = 0;

  for (const subject of subjects) {
    for (const value of [subject.subject_code, subject.subject_abbreviation]) {
      const code = String(value || '').trim();
      const key = code.toUpperCase();
      if (code && !subjectLookup.has(key)) {
        subjectLookup.set(key, subject);
      }
    }
  }

  for (const row of rows) {
    if (!row.subjectCode) {
      errors.push({ row: row.row, subject_code: '', error: 'Subject Code is required' });
      continue;
    }
    if (row.subjectCode.length > 100) {
      errors.push({ row: row.row, subject_code: row.subjectCode, error: 'Subject Code is too long' });
      continue;
    }

    const subject = subjectLookup.get(row.subjectCode.toUpperCase());
    if (!subject) {
      errors.push({
        row: row.row,
        subject_code: row.subjectCode,
        error: 'Subject does not belong to this class',
      });
      continue;
    }

    if (!row.teacherName) {
      skipped += 1;
      continue;
    }
    let valueTooLong = false;
    if (row.teacherName.length > 255) {
      errors.push({
        row: row.row,
        subject_code: row.subjectCode,
        error: 'Teacher Name cannot exceed 255 characters',
      });
      valueTooLong = true;
    }
    if (row.teacherSignature.length > 255) {
      errors.push({
        row: row.row,
        subject_code: row.subjectCode,
        error: 'Teacher Signature cannot exceed 255 characters',
      });
      valueTooLong = true;
    }
    if (valueTooLong) {
      continue;
    }

    const subjectKey = String(subject.subject_code || subject.subject_abbreviation).toUpperCase();
    if (seenSubjects.has(subjectKey)) {
      errors.push({
        row: row.row,
        subject_code: row.subjectCode,
        error: 'Subject appears more than once in the CSV',
      });
      continue;
    }
    seenSubjects.add(subjectKey);

    let teacherSubjectCode = String(subject.subject_code || subject.subject_abbreviation || '').trim();
    if (
      subject.subject_abbreviation &&
      (/^\d+$/.test(teacherSubjectCode) || teacherSubjectCode.length > 20)
    ) {
      teacherSubjectCode = String(subject.subject_abbreviation).trim();
    }
    if (!teacherSubjectCode || teacherSubjectCode.length > 20) {
      errors.push({
        row: row.row,
        subject_code: row.subjectCode,
        error: 'Subject Code must be 20 characters or fewer',
      });
      continue;
    }

    assignments.push({
      row: row.row,
      subjectCode: teacherSubjectCode,
      subjectCodes: [...new Set([
        subject.subject_code,
        subject.subject_abbreviation,
        teacherSubjectCode,
      ].filter(Boolean).map((value) => String(value).trim()))],
      teacherName: row.teacherName,
      teacherSignature: row.teacherSignature || null,
    });
  }

  return { assignments, errors, skipped };
}

module.exports = {
  SUBJECT_TEACHER_CSV_HEADERS,
  MAX_SUBJECT_TEACHER_ROWS,
  buildSubjectTeacherCsv,
  parseSubjectTeacherCsv,
  validateSubjectTeacherRows,
};
