import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { studentsAPIMock, toastMock } = vi.hoisted(() => ({
  studentsAPIMock: {
    getSubjects: vi.fn(),
    getTeachers: vi.fn(),
    getSubjectTeacherTemplate: vi.fn(),
    uploadSubjectTeachersCsv: vi.fn(),
    deleteTeacher: vi.fn(),
  },
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
  useParams: () => ({ year: '2025', stream: 'HGE', term: 'First Term' }),
}));

vi.mock('../../../components/layout/AdminLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../../../services/students', () => ({
  studentsAPI: studentsAPIMock,
}));

vi.mock('../../../services/api', () => ({
  default: { post: vi.fn() },
}));

vi.mock('../../../utils/toast', () => ({
  toast: toastMock,
}));

const { default: TeachersManagement } = await import('../TeachersManagement');

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TeachersManagement formLevel="form-v" />
    </QueryClientProvider>
  );
}

describe('TeachersManagement CSV actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:subject-teachers'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    studentsAPIMock.getSubjects.mockResolvedValue({
      data: {
        subjects: [{
          subject_code: '0181',
          subject_name: 'Mathematics',
          subject_abbreviation: 'MATH',
          level: 'FORM V',
          stream: 'HGE',
          year: 2025,
        }],
      },
    });
    studentsAPIMock.getTeachers.mockResolvedValue({ data: { teachers: {} } });
    studentsAPIMock.getSubjectTeacherTemplate.mockResolvedValue({
      data: new Blob(['Subject Code,Teacher Name']),
    });
    studentsAPIMock.uploadSubjectTeachersCsv.mockResolvedValue({
      data: { message: '1 assignment registered', saved: 1, skipped: 0 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads the template for the current class', async () => {
    renderPage();

    const button = await screen.findByRole('button', { name: /CSV Template/i });
    await waitFor(() => expect(button.disabled).toBe(false));
    fireEvent.click(button);

    await waitFor(() => {
      expect(studentsAPIMock.getSubjectTeacherTemplate).toHaveBeenCalledWith({
        level: 'FORM V',
        stream: 'HGE',
        year: 2025,
      });
    });
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:subject-teachers');
  });

  it('uploads a CSV with the current class scope', async () => {
    const { container } = renderPage();
    const input = await waitFor(() => {
      const element = container.querySelector('input[type="file"]');
      expect(element).not.toBeNull();
      return element;
    });
    const file = new File(['Subject Code,Teacher Name\n0181,Jane Doe'], 'teachers.csv', {
      type: 'text/csv',
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(studentsAPIMock.uploadSubjectTeachersCsv).toHaveBeenCalledTimes(1);
    });
    const formData = studentsAPIMock.uploadSubjectTeachersCsv.mock.calls[0][0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('file')).toBe(file);
    expect(formData.get('level')).toBe('FORM V');
    expect(formData.get('stream')).toBe('HGE');
    expect(formData.get('year')).toBe('2025');
  });
});
