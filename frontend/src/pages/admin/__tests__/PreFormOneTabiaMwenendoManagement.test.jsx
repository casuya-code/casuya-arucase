import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { serviceMock, toastMock } = vi.hoisted(() => ({
  serviceMock: {
    getStudents: vi.fn(),
    getTabiaMwenendo: vi.fn(),
    saveTabiaMwenendo: vi.fn(),
  },
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ year: '2026' }),
  Link: ({ children, to, ...rest }) => <a href={typeof to === 'string' ? to : '#'} {...rest}>{children}</a>,
}));

vi.mock('../../../components/layout/AdminLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../../../utils/toast', () => ({ toast: toastMock }));

// The page imports the default export; expose the named one too for safety.
vi.mock('../../../services/preFormOneService', () => ({
  default: serviceMock,
  preFormOneService: serviceMock,
}));

const { default: PreFormOneTabiaMwenendoManagement } = await import(
  '../PreFormOneTabiaMwenendoManagement'
);

const STUDENTS = [
  { id: 1, admission_number: 'P1001', first_name: 'Anna', middle_name: null, surname: 'Mushi' },
  { id: 2, admission_number: 'P1002', first_name: 'Baraka', middle_name: 'J', surname: 'Kimaro' },
];

// 11 criteria per student row.
const SELECTS_PER_ROW = 11;

function renderPage(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

async function renderGrid() {
  const view = renderPage(<PreFormOneTabiaMwenendoManagement />);
  await waitFor(() => {
    expect(view.container.querySelectorAll('select')).toHaveLength(
      STUDENTS.length * SELECTS_PER_ROW
    );
  });
  return view;
}

describe('PreFormOneTabiaMwenendoManagement — save payloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMock.getStudents.mockResolvedValue({ data: STUDENTS });
    serviceMock.getTabiaMwenendo.mockResolvedValue({ evaluations: {} });
    serviceMock.saveTabiaMwenendo.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Regression: "Save All Evaluations" used to POST a bare array. The
  // Pre-Form One route requires req.body.evaluations, so the save was rejected
  // (400) and the Tabia na Mwenendo section of the report stayed empty.
  it('posts { evaluations: [...] } when Save All Evaluations is clicked', async () => {
    const { container } = await renderGrid();

    const firstSelect = container.querySelectorAll('select')[0];
    fireEvent.change(firstSelect, { target: { value: 'A' } });
    // Blur clears the autosave debounce so only the Save All call is asserted.
    fireEvent.blur(firstSelect);
    await waitFor(() => expect(serviceMock.saveTabiaMwenendo).toHaveBeenCalled());

    serviceMock.saveTabiaMwenendo.mockClear();

    const saveAll = screen.getByRole('button', { name: /Save All Evaluations/i });
    await waitFor(() => expect(saveAll.disabled).toBe(false));
    fireEvent.click(saveAll);

    await waitFor(() => {
      expect(serviceMock.saveTabiaMwenendo).toHaveBeenCalledWith('2026', {
        evaluations: [{ student_id: 1, criterion: '901', evaluation: 'A' }],
      });
    });
  });

  it('posts { evaluations: [...] } for the per-student autosave', async () => {
    const { container } = await renderGrid();

    const firstSelect = container.querySelectorAll('select')[0];
    fireEvent.change(firstSelect, { target: { value: 'B' } });
    fireEvent.blur(firstSelect);

    await waitFor(() => {
      expect(serviceMock.saveTabiaMwenendo).toHaveBeenCalledWith('2026', {
        evaluations: [{ student_id: 1, criterion: '901', evaluation: 'B' }],
      });
    });
  });
});
