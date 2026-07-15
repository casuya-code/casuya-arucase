/**
 * Pre-Form One Continuing Results Page
 * Full results grid: S/N, names, parish, per-subject scores, totals, grade, position, remarks
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { preFormOneService } from '../../services/preFormOneService';
import preFormOneContinuingSubjectsService from '../../services/preFormOneContinuingSubjectsService';
import preFormOneStudentsService from '../../services/preFormOneStudentsService';
import { adminAPI } from '../../services/admin';
import { useAuth } from '../../context/AuthContext';
import YearMonthFilter from '../../components/common/YearMonthFilter';
import { resolveStaticUrl } from '../../utils/backendUrl';
import {
  admissionKey,
  resultsByAdmissionNumber,
  unwrapListPayload,
} from '../../services/preFormOneApiHelpers';
import {
  assignResultPositions,
  buildSubjectScoresMap,
  calculateInterviewMetrics,
  formatSubjectScoreCell,
  mergeAutoAndSavedResult,
  normalizeSubjectCode,
  scoreForSubject,
} from './preFormOneResultsUtils';
import './PreFormOneResults.css';
import AdminLayout from '../../components/layout/AdminLayout';
import { CSV_BULK_LABELS } from '../../constants/csvBulkActions';

const PreFormOneContinuingResults = () => {
  const { year } = useParams();
  const { isAuthenticated: isAuth } = useAuth();
  const isAuthenticated = isAuth();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [subjectScores, setSubjectScores] = useState({});
  const [scoresLoading, setScoresLoading] = useState(false);
  const [filter, setFilter] = useState({
    year: year || '',
    month: 'all',
  });

  const ITEMS_PER_PAGE = 20;
  const reportYear = filter.year || year;

  useEffect(() => {
    if (year) {
      setFilter((prev) => ({ ...prev, year }));
    }
  }, [year]);

  const getLogoUrl = (logoPath) => (logoPath ? resolveStaticUrl(logoPath) : null);

  const handleLogoError = (e) => {
    e.target.style.display = 'none';
  };

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['preform-one-students', reportYear],
    queryFn: async () => {
      try {
        const res = await preFormOneStudentsService.getPreFormOneStudents(reportYear);
        return unwrapListPayload(res);
      } catch (error) {
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load students');
        }
        return [];
      }
    },
    enabled: isAuthenticated && !!reportYear,
    retry: false,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [students.length]);

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['preform-one-continuing-subjects', reportYear],
    queryFn: async () => {
      try {
        const list = await preFormOneContinuingSubjectsService.getSubjects();
        const active = Array.isArray(list) ? list.filter((s) => s.is_active !== false) : [];
        return [...active].sort((a, b) =>
          normalizeSubjectCode(a.subject_code).localeCompare(
            normalizeSubjectCode(b.subject_code)
          )
        );
      } catch (error) {
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load continuing subjects');
        }
        return [];
      }
    },
    enabled: isAuthenticated && !!reportYear,
    retry: false,
  });

  const { data: existingResults = {}, isLoading: resultsLoading } = useQuery({
    queryKey: ['preform-one-continuing-results', reportYear, filter.month],
    queryFn: async () => {
      try {
        const res = await preFormOneService.getContinuingResults(reportYear, filter.month);
        if (
          res?.data?.results &&
          typeof res.data.results === 'object' &&
          !Array.isArray(res.data.results)
        ) {
          const map = {};
          Object.entries(res.data.results).forEach(([key, row]) => {
            const k = admissionKey(row?.admission_number ?? key);
            if (k) map[k] = row;
          });
          return map;
        }
        return resultsByAdmissionNumber(res);
      } catch (error) {
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || 'Failed to load continuing results');
        }
        return {};
      }
    },
    enabled: isAuthenticated && !!reportYear,
    retry: false,
  });

  useEffect(() => {
    if (!reportYear || students.length === 0 || subjects.length === 0) {
      setSubjectScores({});
      setScoresLoading(false);
      return;
    }

    let cancelled = false;
    const loadAllScores = async () => {
      setScoresLoading(true);
      try {
        const scoresResponse = await preFormOneStudentsService.getScoresByYear(
          reportYear,
          'continuing'
        );
        const rows = unwrapListPayload(scoresResponse);
        const merged = buildSubjectScoresMap(rows, admissionKey);
        if (!cancelled) setSubjectScores(merged);
      } catch {
        if (!cancelled) setSubjectScores({});
      } finally {
        if (!cancelled) setScoresLoading(false);
      }
    };

    loadAllScores();
    return () => {
      cancelled = true;
    };
  }, [reportYear, students.length, subjects.length]);

  const autoCalculatedResults = useMemo(() => {
    const draft = {};
    students.forEach((student) => {
      const key = admissionKey(student.admission_number);
      if (!key) return;
      const scores = subjectScores[key];
      if (!scores || Object.keys(scores).length === 0) return;
      draft[key] = calculateInterviewMetrics(scores, subjects);
    });
    return assignResultPositions(draft);
  }, [subjectScores, students, subjects]);

  const displayResults = useMemo(() => {
    const merged = {};
    students.forEach((student) => {
      const key = admissionKey(student.admission_number);
      if (!key) return;
      merged[key] = mergeAutoAndSavedResult(
        autoCalculatedResults[key],
        existingResults[key]
      );
    });
    return assignResultPositions(merged);
  }, [autoCalculatedResults, existingResults, students]);

  const calculateResultsMutation = useMutation({
    mutationFn: async () =>
      preFormOneService.calculateContinuingResults(reportYear, filter.month),
    onSuccess: (response) => {
      toast.success(
        response?.message || response?.data?.message || 'Continuing results calculated and saved.'
      );
      queryClient.invalidateQueries({
        queryKey: ['preform-one-continuing-results', reportYear, filter.month],
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to calculate continuing results');
    },
  });

  const compareNames = (a, b) => {
    const fn = (a.first_name || '').localeCompare(b.first_name || '', undefined, {
      sensitivity: 'base',
    });
    if (fn !== 0) return fn;
    const mn = (a.middle_name || '').localeCompare(b.middle_name || '', undefined, {
      sensitivity: 'base',
    });
    if (mn !== 0) return mn;
    return (a.surname || '').localeCompare(b.surname || '', undefined, { sensitivity: 'base' });
  };

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const resultA = displayResults[admissionKey(a.admission_number)];
      const resultB = displayResults[admissionKey(b.admission_number)];

      const avgA =
        resultA?.average !== null && resultA?.average !== undefined
          ? Number(resultA.average)
          : null;
      const avgB =
        resultB?.average !== null && resultB?.average !== undefined
          ? Number(resultB.average)
          : null;

      const aHasAvg = avgA !== null && Number.isFinite(avgA) && avgA > 0;
      const bHasAvg = avgB !== null && Number.isFinite(avgB) && avgB > 0;

      if (aHasAvg && bHasAvg && avgA !== avgB) return avgB - avgA;
      if (aHasAvg && !bHasAvg) return -1;
      if (!aHasAvg && bHasAvg) return 1;

      return compareNames(a, b);
    });
  }, [students, displayResults]);

  const totalPages = Math.ceil(sortedStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedStudents.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedStudents, currentPage]);

  const { data: schoolLogoData } = useQuery({
    queryKey: ['school-logo'],
    queryFn: async () => {
      try {
        const res = await adminAPI.getSchoolLogo();
        return res.data?.logo || null;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const downloadPDF = async () => {
    const btn = document.getElementById('downloadContinuingResultsBtn');
    const btnText = document.getElementById('downloadContinuingBtnText');
    if (btn && btnText) {
      btn.disabled = true;
      btnText.textContent = 'Generating PDF...';
    }

    try {
      const response = await preFormOneService.downloadContinuingResultsPDF(reportYear);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      if (blob.size === 0) throw new Error('PDF file is empty');

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PreFormOne_Continuing_Results_${reportYear}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      let message = error.message || 'Failed to generate PDF';
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text);
          message = parsed.message || message;
        } catch {
          /* keep default */
        }
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      toast.error(message);
    } finally {
      if (btn && btnText) {
        btn.disabled = false;
        btnText.textContent = 'Download Continuing Results (PDF)';
      }
    }
  };

  const handleDownloadCSV = () => {
    const table = document.querySelector('.compact-results-table');
    if (!table) {
      toast.warning('No table data to export.');
      return;
    }

    const rows = table.querySelectorAll('tr');
    const csv = [];

    csv.push(['CATHOLIC ARCHDIOCESE OF ARUSHA']);
    csv.push(['ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU']);
    csv.push(['P.O BOX 3102 Arusha, Tanzania']);
    csv.push([]);
    csv.push([`PRE-FORM ONE CONTINUING RESULTS ${reportYear}`]);
    csv.push([]);

    const headerRow = rows[0];
    if (!headerRow) {
      toast.warning('No table data to export.');
      return;
    }
    const headers = [];
    headerRow.querySelectorAll('th').forEach((th) => {
      const rotatedHeader = th.querySelector('.rotate-header');
      headers.push(rotatedHeader ? rotatedHeader.textContent.trim() : th.textContent.trim());
    });
    csv.push(headers);

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].querySelectorAll('td');
      const rowData = [];
      cols.forEach((col) => {
        let cellText = col.textContent.trim();
        if (
          cellText === '-' &&
          (col.classList.contains('result-col') || col.classList.contains('subject-col'))
        ) {
          cellText = '';
        }
        rowData.push(cellText);
      });
      if (rowData.length > 0) csv.push(rowData);
    }

    const BOM = '\uFEFF';
    const csvContent =
      BOM +
      csv
        .map((row) =>
          row
            .map((cell) => {
              const cellStr = String(cell);
              if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            })
            .join(',')
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PreFormOne_Continuing_Results_${reportYear}.csv`;
    link.click();
    toast.success('CSV file downloaded successfully!');
  };

  const handleFilterChange = (newFilter) => {
    setFilter((prev) => ({
      ...prev,
      year: newFilter.year || prev.year || year,
      month: newFilter.month ?? prev.month,
    }));
  };

  const isLoading = studentsLoading || subjectsLoading || resultsLoading || scoresLoading;
  const calcPending =
    calculateResultsMutation.isPending ?? calculateResultsMutation.isLoading;

  const buildRowContext = (student, index, offset = 0) => {
    const adm = admissionKey(student.admission_number);
    const result = displayResults[adm] || {};
    const studentSubjectScores = subjectScores[adm] || {};
    const gradeClass = result.grade || 'none';
    const avgValue = result.average != null ? parseFloat(result.average) : null;
    const gradeRowClass =
      gradeClass === 'C' && avgValue !== null && avgValue < 55
        ? `grade-row-${gradeClass}-low`
        : `grade-row-${gradeClass}`;
    const fullName =
      [student.first_name, student.middle_name, student.surname]
        .filter((part) => part && String(part).trim())
        .join(' ') || '-';

    return {
      result,
      studentSubjectScores,
      gradeRowClass,
      avgValue,
      sn: offset + index + 1,
      fullName,
      parish: student.parish || '-',
    };
  };

  return (
    <AdminLayout>
      <div className="preform-one-results-page-container">
        <div className="excel-card preform-one-results">
          <div className="excel-card-header">
            <h2 className="excel-card-title">
              <i className="fas fa-chart-line" aria-hidden="true"></i>
              <span>Pre-Form One Continuing Results</span>
            </h2>
            <div className="header-actions">
              <button
                type="button"
                onClick={() => calculateResultsMutation.mutate()}
                className="excel-btn primary small"
                disabled={calcPending || students.length === 0 || subjects.length === 0}
              >
                <i className="fas fa-calculator"></i>{' '}
                {calcPending ? 'Calculating...' : 'Calculate Results'}
              </button>
              <Link
                to={`/admin/pre-form-one/${reportYear}`}
                className="excel-btn secondary small"
              >
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <YearMonthFilter
            onFilterChange={handleFilterChange}
            initialYear={reportYear}
            initialMonth={filter.month}
            usePreFormOneMonths={true}
            disabled={isLoading}
          />
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">
                <i className="fas fa-spinner"></i> Loading...
              </div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-users empty-icon"></i>
                <h3>No Pre-Form One Students Found</h3>
                <p>No students registered for Pre-Form One {reportYear} yet.</p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-book empty-icon"></i>
                <h3>No Continuing Subjects</h3>
                <p>Add continuing subjects before viewing results.</p>
              </div>
            ) : (
              <div className="results-info">
                <div className="info-item">
                  <strong>Students:</strong> {students.length}
                </div>
                <div className="info-item">
                  <strong>Year:</strong> {reportYear}
                </div>
                <div className="info-item">
                  <strong>Month:</strong>{' '}
                  {filter.month === 'all' ? 'All Months' : filter.month}
                </div>
                <div className="info-item">
                  <strong>Subjects:</strong> {subjects.length}
                </div>
              </div>
            )}
          </div>
        </div>

        {!isLoading && students.length > 0 && subjects.length > 0 && (
          <>
            <div className="print-button-container">
              <button
                type="button"
                onClick={downloadPDF}
                id="downloadContinuingResultsBtn"
                className="download-btn-monthly"
              >
                <i className="fas fa-file-pdf"></i>{' '}
                <span id="downloadContinuingBtnText">Download Continuing Results (PDF)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCSV}
                className="download-btn-monthly download-btn-monthly--secondary"
              >
                <i className="fas fa-file-csv"></i> {CSV_BULK_LABELS.filled}
              </button>
            </div>

            <div className="report-header-section">
              <div className="report-header">
                <div className="logo-section">
                  {schoolLogoData?.logo_image_path ? (
                    <img
                      src={getLogoUrl(schoolLogoData.logo_image_path)}
                      alt="School logo"
                      className="school-logo"
                      onError={handleLogoError}
                    />
                  ) : (
                    <div className="school-logo-placeholder">
                      <i className="fas fa-school"></i>
                    </div>
                  )}
                </div>
                <div className="school-info">
                  <h1>CATHOLIC ARCHDIOCESE OF ARUSHA</h1>
                  <h2>ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU</h2>
                  <div className="contact-info">
                    <p>P.O BOX 3102 Arusha, Tanzania</p>
                    <p>+255 754 92 60 22 / +255 765 394 802</p>
                    <p>Email: arucase@gmail.com</p>
                  </div>
                </div>
                <div className="logo-section-right">
                  {schoolLogoData?.logo_image_path ? (
                    <img
                      src={getLogoUrl(schoolLogoData.logo_image_path)}
                      alt="School logo"
                      className="school-logo-right"
                      onError={handleLogoError}
                    />
                  ) : (
                    <div className="school-logo-placeholder">
                      <i className="fas fa-school"></i>
                    </div>
                  )}
                </div>
              </div>
              <div className="test-info-bar">
                PRE-FORM ONE CONTINUING RESULTS {reportYear}
                {filter.month !== 'all' ? ` — ${filter.month}` : ''}
              </div>
            </div>

            <p className="results-table-scroll-hint" role="note">
              <i className="fas fa-arrows-alt-h" aria-hidden="true"></i>
              Swipe sideways to see all subjects and summary columns
            </p>

            <div className="results-mobile-list" aria-label="Continuing results by student">
              {paginatedStudents.map((student, index) => {
                const ctx = buildRowContext(student, index, (currentPage - 1) * ITEMS_PER_PAGE);
                const { result, studentSubjectScores, gradeRowClass, avgValue, sn, fullName, parish } =
                  ctx;

                return (
                  <article
                    key={student.id}
                    className={`results-mobile-card ${gradeRowClass}`}
                  >
                    <header className="results-mobile-card__head">
                      <span className="results-mobile-card__sn">{sn}</span>
                      <div className="results-mobile-card__identity">
                        <p className="results-mobile-card__name">{fullName}</p>
                        <p className="results-mobile-card__parish">
                          <i className="fas fa-church" aria-hidden="true"></i> {parish}
                        </p>
                      </div>
                      <div className="results-mobile-card__badge" aria-label="Grade and position">
                        <span className="results-mobile-card__grade">{result.grade || '—'}</span>
                        <span className="results-mobile-card__position">
                          Pos {result.position || '—'}
                        </span>
                      </div>
                    </header>

                    <dl className="results-mobile-card__scores">
                      {subjects.map((subject) => (
                        <div key={subject.id} className="results-mobile-score-item">
                          <dt title={subject.subject_name}>{subject.subject_code}</dt>
                          <dd>
                            {formatSubjectScoreCell(
                              scoreForSubject(studentSubjectScores, subject.subject_code)
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <div className="results-mobile-card__summary">
                      <div className="results-mobile-summary-item">
                        <span>TOT</span>
                        <strong>
                          {result.total_marks != null && result.total_marks !== ''
                            ? formatSubjectScoreCell(result.total_marks)
                            : '—'}
                        </strong>
                      </div>
                      <div className="results-mobile-summary-item">
                        <span>AVR</span>
                        <strong>
                          {avgValue != null && Number.isFinite(avgValue)
                            ? Math.round(avgValue)
                            : '—'}
                        </strong>
                      </div>
                      <div className="results-mobile-summary-item">
                        <span>GRD</span>
                        <strong>{result.grade || '—'}</strong>
                      </div>
                      <div className="results-mobile-summary-item">
                        <span>POS</span>
                        <strong>{result.position || '—'}</strong>
                      </div>
                    </div>

                    {result.remarks ? (
                      <p className="results-mobile-card__remarks">{result.remarks}</p>
                    ) : null}
                  </article>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <i className="fas fa-chevron-left"></i> Prev
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}

            <div className="results-table-container results-table-desktop">
              <div className="results-table-wrapper">
                <table className="compact-results-table">
                  <thead>
                    <tr>
                      <th className="sticky-col col-sn">S/N</th>
                      <th className="sticky-col col-fname">First Name</th>
                      <th className="sticky-col col-mname">Middle Name</th>
                      <th className="sticky-col col-sname">Surname</th>
                      <th className="sticky-col col-parish">Parish</th>
                      {subjects.map((subject) => (
                        <th key={subject.id} className="subject-col" title={subject.subject_name}>
                          <div className="rotate-header">{subject.subject_code}</div>
                        </th>
                      ))}
                      <th className="result-col">TOT</th>
                      <th className="result-col">AVR</th>
                      <th className="result-col">GRD</th>
                      <th className="result-col">POS</th>
                      <th className="result-col">REMARKS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((student, index) => {
                      const ctx = buildRowContext(student, index, (currentPage - 1) * ITEMS_PER_PAGE);
                      const {
                        result,
                        studentSubjectScores,
                        gradeRowClass,
                        avgValue,
                        sn,
                      } = ctx;

                      return (
                        <tr key={student.id} className={gradeRowClass}>
                          <td className="sticky-col col-sn">{sn}</td>
                          <td className="sticky-col col-fname">{student.first_name || '-'}</td>
                          <td className="sticky-col col-mname">{student.middle_name || '-'}</td>
                          <td className="sticky-col col-sname">{student.surname || '-'}</td>
                          <td className="sticky-col col-parish">{student.parish || '-'}</td>
                          {subjects.map((subject) => (
                            <td key={subject.id} className="subject-col">
                              {formatSubjectScoreCell(
                                scoreForSubject(studentSubjectScores, subject.subject_code)
                              )}
                            </td>
                          ))}
                          <td className="result-col tot-col">
                            {result.total_marks != null && result.total_marks !== ''
                              ? formatSubjectScoreCell(result.total_marks)
                              : '-'}
                          </td>
                          <td className="result-col">
                            {avgValue != null && Number.isFinite(avgValue)
                              ? Math.round(avgValue)
                              : '-'}
                          </td>
                          <td className="result-col grd-col">{result.grade || '-'}</td>
                          <td className="result-col">{result.position || '-'}</td>
                          <td className="result-col">{result.remarks || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <i className="fas fa-chevron-left"></i> Prev
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}

            <div className="back-margin">
              <Link to={`/admin/pre-form-one/${reportYear}`} className="excel-btn">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
              <button type="button" onClick={handleDownloadCSV} className="excel-btn csv-btn">
                <i className="fas fa-file-csv"></i> {CSV_BULK_LABELS.filled}
              </button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default PreFormOneContinuingResults;
