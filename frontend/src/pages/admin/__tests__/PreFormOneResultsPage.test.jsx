import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { serviceMock, studentsServiceMock, adminAPIMock, toastMock, goBackMock } = vi.hoisted(
  () => ({
    serviceMock: {
      getInterviewResults: vi.fn(),
      getContinuingResults: vi.fn(),
      calculateInterviewResults: vi.fn(),
      calculateContinuingResults: vi.fn(),
      downloadInterviewResultsPDF: vi.fn(),
      downloadContinuingResultsPDF: vi.fn(),
    },
    studentsServiceMock: {
      getPreFormOneStudents: vi.fn(),
      getScoresByYear: vi.fn(),
    },
    adminAPIMock: {
      getSchoolLogo: vi.fn(),
    },
    toastMock: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
    goBackMock: vi.fn(),
  })
);

vi.mock('react-router-dom', () => ({
  useParams: () => ({ year: '2026' }),
}));

vi.mock('../../../components/layout/AdminLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../../../components/common/YearMonthFilter', () => ({
  default: () => <div data-testid="year-month-filter" />,
}));

vi.mock('../../../hooks/useGoBack', () => ({
  useGoBack: () => goBackMock,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: () => true }),
}));

vi.mock('../../../services/preFormOneService', () => ({
  preFormOneService: serviceMock,
}));

vi.mock('../../../services/preFormOneStudentsService', () => ({
  default: studentsServiceMock,
}));

vi.mock('../../../services/admin', () => ({
  adminAPI: adminAPIMock,
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

const { default: PreFormOneResultsPage } = await import('../PreFormOneResultsPage');
const { default: PreFormOneInterviewResults } = await import('../PreFormOneInterviewResults');
const { default: PreFormOneContinuingResults } = await import('../PreFormOneContinuingResults');

const INTERVIEW_CONFIG = {
  labelTitle: 'Interview',
  scoreType: 'interview',
  resultsQueryKey: 'preform-one-interview-results',
  fetchResults: (year, month) => serviceMock.getInterviewResults(year, month),
  calculateResults: (year, month) => serviceMock.calculateInterviewResults(year, month),
  downloadResultsPDF: (year) => serviceMock.downloadInterviewResultsPDF(year),
  pageTitle: 'Interview Results',
  cardTitle: 'Calculate Results',
  cardIconClass: 'fa-calculator',
  pdfButtonId: 'downloadInterviewResultsBtn',
  pdfButtonTextId: 'downloadInterviewBtnText',
  showSummaryHeader: true,
  showBackButtonInCardHeader: false,
};

const CONTINUING_CONFIG = {
  labelTitle: 'Continuing',
  scoreType: 'continuing',
  resultsQueryKey: 'preform-one-continuing-results',
  fetchResults: (year, month) => serviceMock.getContinuingResults(year, month),
  calculateResults: (year, month) => serviceMock.calculateContinuingResults(year, month),
  downloadResultsPDF: (year) => serviceMock.downloadContinuingResultsPDF(year),
  pageTitle: 'Continuing Results',
  cardTitle: 'Pre-Form One Continuing Results',
  cardIconClass: 'fa-chart-line',
  pdfButtonId: 'downloadContinuingResultsBtn',
  pdfButtonTextId: 'downloadContinuingBtnText',
  showSummaryHeader: false,
  showBackButtonInCardHeader: true,
};

function renderPage(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const STUDENTS = [
  {
    id: 1,
    admission_number: 'P1001',
    first_name: 'Anna',
    middle_name: null,
    surname: 'Mushi',
    parish: 'Arusha',
  },
  {
    id: 2,
    admission_number: 'P1002',
    first_name: 'Baraka',
    middle_name: 'J',
    surname: 'Kimaro',
    parish: 'Moshi',
  },
];

const SCORE_ROWS = [
  { admission_number: 'P1001', subject_id: 11, subject_code: 'ENG', subject_name: 'English', score: 80 },
  { admission_number: 'P1001', subject_id: 12, subject_code: 'MATH', subject_name: 'Mathematics', score: 60 },
  { admission_number: 'P1002', subject_id: 11, subject_code: 'eng', subject_name: 'English', score: 75 },
  { admission_number: 'P1002', subject_id: 12, subject_code: 'math', subject_name: 'Mathematics', score: 75 },
];

const SAVED_RESULTS = [
  {
    admission_number: 'P1001',
    total_marks: 999,
    average: 99,
    grade: 'A',
    position: 1,
    remarks: 'AMECHAGULIWA',
  },
];

async function renderGrid(config) {
  const view = renderPage(<PreFormOneResultsPage config={config} />);
  await waitFor(() => {
    expect(studentsServiceMock.getScoresByYear).toHaveBeenCalledWith('2026', config.scoreType);
  });
  await waitFor(() => {
    expect(view.container.querySelectorAll('tbody tr')).toHaveLength(STUDENTS.length);
  });
  return view;
}

function rowCells(container, index) {
  return Array.from(container.querySelectorAll('tbody tr')[index].querySelectorAll('td')).map((td) =>
    td.textContent.trim()
  );
}

describe('PreFormOneResultsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminAPIMock.getSchoolLogo.mockResolvedValue({ data: { logo: null } });
    serviceMock.getInterviewResults.mockResolvedValue({ data: SAVED_RESULTS });
    serviceMock.getContinuingResults.mockResolvedValue({ data: SAVED_RESULTS });
    serviceMock.calculateInterviewResults.mockResolvedValue({ data: { message: 'saved' } });
    serviceMock.calculateContinuingResults.mockResolvedValue({ data: { message: 'saved' } });
    studentsServiceMock.getPreFormOneStudents.mockResolvedValue({ data: STUDENTS });
    studentsServiceMock.getScoresByYear.mockResolvedValue({ data: SCORE_ROWS });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('labels the grid from the config and scores it with the configured subject type', async () => {
    const { container } = await renderGrid(INTERVIEW_CONFIG);

    expect(container.textContent).toContain('Interview Results');
    expect(container.textContent).toContain('PRE-FORM ONE INTERVIEW RESULTS 2026');
    expect(container.textContent).toContain('Interview Subjects');

    const headerCells = Array.from(container.querySelectorAll('thead th')).map((th) =>
      th.textContent.trim()
    );
    expect(headerCells).toEqual([
      'S/N',
      'First Name',
      'Middle Name',
      'Surname',
      'Parish',
      'ENG',
      'MATH',
      'TOT',
      'AVR',
      'GRD',
      'POS',
      'REMARKS',
    ]);
  });

  it('keeps each variant on its own results endpoint', async () => {
    const { unmount } = await renderGrid(INTERVIEW_CONFIG);
    expect(serviceMock.getInterviewResults).toHaveBeenCalledWith('2026', 'all');
    unmount();

    const { container } = await renderGrid(CONTINUING_CONFIG);
    expect(serviceMock.getContinuingResults).toHaveBeenCalledWith('2026', 'all');
    expect(container.textContent).toContain('PRE-FORM ONE CONTINUING RESULTS 2026');
  });

  it('reads its labels and endpoints from the wrapper configs', async () => {
    const interview = renderPage(<PreFormOneInterviewResults />);
    await waitFor(() => {
      expect(serviceMock.getInterviewResults).toHaveBeenCalled();
    });
    expect(await screen.findByRole('heading', { name: 'Interview Results' })).toBeTruthy();
    interview.unmount();

    renderPage(<PreFormOneContinuingResults />);
    await waitFor(() => {
      expect(serviceMock.getContinuingResults).toHaveBeenCalled();
    });
    expect(await screen.findByText('Pre-Form One Continuing Results')).toBeTruthy();
  });

  it('shows the summary header on the interview page only', async () => {
    const interview = await renderGrid(INTERVIEW_CONFIG);
    expect(interview.container.querySelector('.pfo-results-stats-grid')).not.toBeNull();
    expect(screen.getByText('Registered Students')).toBeTruthy();
    expect(screen.getByText('Interview Subjects')).toBeTruthy();
    interview.unmount();

    const continuing = await renderGrid(CONTINUING_CONFIG);
    expect(continuing.container.querySelector('.pfo-results-stats-grid')).toBeNull();
    expect(continuing.container.textContent).not.toContain('Registered Students');
    expect(continuing.container.textContent).not.toContain('Interview Subjects');
  });

  it('prefers live totals over the saved row and re-ranks positions', async () => {
    const { container } = await renderGrid(INTERVIEW_CONFIG);

    // Baraka: 75 + 75 -> 75 average. Anna: 80 + 60 -> 70 average, even though the
    // saved row claims 99 and position 1, so she is ranked second.
    expect(rowCells(container, 0)).toEqual([
      '1',
      'Baraka',
      'J',
      'Kimaro',
      'Moshi',
      '75',
      '75',
      '150',
      '75',
      'B',
      '1',
      'AMECHAGULIWA',
    ]);
    expect(rowCells(container, 1)).toEqual([
      '2',
      'Anna',
      '-',
      'Mushi',
      'Arusha',
      '80',
      '60',
      '140',
      '70',
      'B',
      '2',
      'AMECHAGULIWA',
    ]);
  });

  it('shows no subjects message per variant', async () => {
    studentsServiceMock.getScoresByYear.mockResolvedValue({ data: [] });

    const interview = renderPage(<PreFormOneResultsPage config={INTERVIEW_CONFIG} />);
    expect(await interview.findByText(/No Interview Subjects/i)).toBeTruthy();
    expect(interview.container.textContent).toContain(
      'Add interview subjects before viewing results.'
    );
    interview.unmount();

    const continuing = renderPage(<PreFormOneResultsPage config={CONTINUING_CONFIG} />);
    expect(await continuing.findByText(/No Continuing Subjects/i)).toBeTruthy();
    expect(continuing.container.textContent).toContain(
      'Add continuing subjects before viewing results.'
    );
  });

  it('posts the calculation to the endpoint the config supplies', async () => {
    await renderGrid(CONTINUING_CONFIG);

    const button = screen.getByRole('button', { name: /Calculate Results/i });
    await waitFor(() => expect(button.disabled).toBe(false));
    fireEvent.click(button);

    await waitFor(() => {
      expect(serviceMock.calculateContinuingResults).toHaveBeenCalledWith('2026', 'all');
    });
    expect(serviceMock.calculateInterviewResults).not.toHaveBeenCalled();
  });

  it('hides the pagination controls when every student fits on one page', async () => {
    const { container } = await renderGrid(INTERVIEW_CONFIG);

    expect(container.querySelector('.pagination-controls')).toBeNull();
  });

  it('pages the grid 20 rows at a time and keeps S/N counting across pages', async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      admission_number: `P${2000 + i}`,
      first_name: `Student${i + 1}`,
      middle_name: null,
      surname: 'Test',
      parish: 'Arusha',
    }));
    const manyScores = many.flatMap((student, i) => [
      {
        admission_number: student.admission_number,
        subject_id: 11,
        subject_code: 'ENG',
        subject_name: 'English',
        score: 50 + (i % 10),
      },
      {
        admission_number: student.admission_number,
        subject_id: 12,
        subject_code: 'MATH',
        subject_name: 'Mathematics',
        score: 40 + (i % 10),
      },
    ]);
    studentsServiceMock.getPreFormOneStudents.mockResolvedValue({ data: many });
    studentsServiceMock.getScoresByYear.mockResolvedValue({ data: manyScores });
    serviceMock.getInterviewResults.mockResolvedValue({ data: [] });

    const { container } = renderPage(<PreFormOneResultsPage config={INTERVIEW_CONFIG} />);
    await waitFor(() => {
      expect(container.querySelectorAll('tbody tr')).toHaveLength(20);
    });

    // The interview page used to grow the slice (20 rows, then 40) instead of paging.
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(container.querySelectorAll('tbody tr')).toHaveLength(5);
    });
    expect(container.querySelector('.pagination-info').textContent).toContain('Page 2 of 2');
    expect(container.querySelector('tbody tr td').textContent.trim()).toBe('21');
  });

  it('downloads the PDF through the configured endpoint', async () => {
    serviceMock.downloadInterviewResultsPDF.mockResolvedValue({
      data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:results'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await renderGrid(INTERVIEW_CONFIG);

    fireEvent.click(
      screen.getByRole('button', { name: /Download Interview Results \(PDF\)/i })
    );

    await waitFor(() => {
      expect(serviceMock.downloadInterviewResultsPDF).toHaveBeenCalledWith('2026');
    });
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:results');
  });
});
