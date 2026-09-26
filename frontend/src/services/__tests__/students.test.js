import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('../api', () => ({
  default: {
    get: getMock,
    post: postMock,
  },
}));

const { studentsAPI } = await import('../students');

describe('studentsAPI subject teacher CSV methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads a scoped subject teacher template as a blob', async () => {
    const response = { data: new Blob(['csv']) };
    getMock.mockResolvedValue(response);

    const result = await studentsAPI.getSubjectTeacherTemplate({
      level: 'FORM V',
      stream: 'HGE',
      year: 2025,
    });

    expect(getMock).toHaveBeenCalledWith(
      '/students/teachers/template?level=FORM+V&stream=HGE&year=2025',
      { responseType: 'blob' }
    );
    expect(result).toBe(response);
  });

  it('uploads CSV form data to the subject teacher bulk endpoint', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['csv']), 'teachers.csv');
    const response = { data: { saved: 2 } };
    postMock.mockResolvedValue(response);

    const result = await studentsAPI.uploadSubjectTeachersCsv(formData);

    expect(postMock).toHaveBeenCalledWith('/students/teachers/bulk-upload', formData);
    expect(result).toBe(response);
  });
});
