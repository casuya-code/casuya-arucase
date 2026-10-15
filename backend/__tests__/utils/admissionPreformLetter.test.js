jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

const fs = require('fs');
const { query } = require('../../config/database');
const {
  getAdmissionPreformLetterRow,
  streamAdmissionPreformPdf,
  sanitizeDownloadFilename,
} = require('../../utils/admissionApplicationForm');

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    sendFile: jest.fn((_p, cb) => cb && cb(null)),
    headersSent: false,
  };
}

describe('admission Pre-Form One letter util', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reads the Pre-Form row from its own table', async () => {
    query.mockResolvedValue({
      rows: [{ file_path: 'uploads/admission-preform-letters/barua.pdf', original_filename: 'barua.pdf' }],
    });

    const row = await getAdmissionPreformLetterRow();
    expect(row.original_filename).toBe('barua.pdf');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('admission_preform_letters'));
  });

  it('returns null when no Pre-Form letter is stored', async () => {
    query.mockResolvedValue({ rows: [] });
    expect(await getAdmissionPreformLetterRow()).toBeNull();
  });

  it('responds 404 with a Pre-Form specific message when nothing is stored', async () => {
    query.mockResolvedValue({ rows: [] });
    const res = makeRes();

    await streamAdmissionPreformPdf(res, {});

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Pre-Form One letter PDF is not available yet.',
    });
  });

  it('streams a stored local PDF as an attachment', async () => {
    query.mockResolvedValue({
      rows: [{ file_path: 'uploads/admission-preform-letters/barua.pdf', original_filename: 'barua.pdf' }],
    });
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true });
    const res = makeRes();

    await streamAdmissionPreformPdf(res, {});

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="barua.pdf"'
    );
    expect(res.sendFile).toHaveBeenCalled();
  });

  it('sanitizes filenames and honours a custom fallback', () => {
    expect(sanitizeDownloadFilename('', 'fomu-ya-pre-form-one.pdf')).toBe(
      'fomu-ya-pre-form-one.pdf'
    );
    expect(sanitizeDownloadFilename('a"b\\c.pdf')).toBe('a_b_c.pdf');
  });
});
