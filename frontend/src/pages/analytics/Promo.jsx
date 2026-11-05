import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/layout/AdminLayout';
import { analyticsAPI } from '../../services/analytics';
import {
  getCurrentCalendarYear,
  getSchoolYearOptions,
} from '../../utils/academicYearUtils';
import './Promo.css';

const FALLBACK_MONTHS = [
  'February', 'March', 'April', 'May',
  'August', 'September', 'October', 'November',
];

const formatScore = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
};

const formatAverage = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return Number(value).toFixed(1);
};

const gradeClass = (grade) => {
  const value = String(grade || '').trim().toUpperCase();
  return ['A', 'B', 'C', 'D', 'F'].includes(value) ? `promo-grade--${value.toLowerCase()}` : '';
};

const remarkClass = (remarks) => {
  const value = String(remarks || '').trim().toUpperCase();
  if (value === 'QUALIFY') return 'promo-remark--qualify';
  if (value === 'DISCUSS') return 'promo-remark--discuss';
  if (value === 'NOT QUALIFY') return 'promo-remark--not';
  return 'promo-remark--none';
};

// The helpers below mirror the backend so filtered views agree with the
// full report and the PDF.
const gradeForAverage = (average) => {
  if (average === null || average === undefined) return '-';
  if (average >= 85) return 'A';
  if (average >= 70) return 'B';
  if (average >= 50) return 'C';
  if (average >= 40) return 'D';
  return 'F';
};

const remarkForAverage = (average, qualifyThreshold = 65, discussThreshold = 54.5) => {
  if (average === null || average === undefined) return 'NO SCORES';
  if (average >= qualifyThreshold) return 'QUALIFY';
  if (average >= discussThreshold) return 'DISCUSS';
  return 'NOT QUALIFY';
};

const streamKeyOf = (stream) => {
  const value = String(stream === null || stream === undefined ? '' : stream).trim().toUpperCase() || 'A';
  return value === 'NA' ? 'A' : value;
};

// Total and average of one subject using only the selected months.
const scoreStats = (subject, activeMonths) => {
  let total = 0;
  let counted = 0;
  for (const month of activeMonths) {
    const raw = subject.scores ? subject.scores[month] : null;
    if (raw === null || raw === undefined || Number.isNaN(Number(raw))) continue;
    total += Number(raw);
    counted += 1;
  }
  return {
    total: counted ? Number(total.toFixed(2)) : null,
    average: counted ? Number((total / counted).toFixed(2)) : null,
  };
};

const collectSubjects = (studentList) => {
  const byCode = new Map();
  for (const student of studentList) {
    for (const subject of student.subjects || []) {
      if (!subject.subject_code || byCode.has(subject.subject_code)) continue;
      byCode.set(subject.subject_code, subject.subject_name || subject.subject_code);
    }
  }
  return [...byCode.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const toggleValue = (list, value) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

const Promo = () => {
  const years = getSchoolYearOptions();
  const [selectedYear, setSelectedYear] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState([]);
  const [monthFilter, setMonthFilter] = useState([]);
  const [qualifyThreshold, setQualifyThreshold] = useState(65);
  const [discussThreshold, setDiscussThreshold] = useState(54.5);

  // Preserve scroll position when filter chips are toggled so the page
  // doesn't jump up when content shrinks.
  const savedScrollTop = useRef(0);
  const scrollPreservingRef = useRef(false);
  const initialisedYearRef = useRef(null);

  const saveScrollPosition = () => {
    const main = document.querySelector('.admin-main-content');
    if (main) {
      savedScrollTop.current = main.scrollTop;
      scrollPreservingRef.current = true;
      // Lock scroll position to prevent browser from jumping
      main.style.position = 'fixed';
      main.style.top = `-${savedScrollTop.current}px`;
      main.style.left = '0';
      main.style.right = '0';
      main.style.overflow = 'hidden';
    }
  };

  // Restore scroll position after filter changes.
  useEffect(() => {
    const main = document.querySelector('.admin-main-content');
    if (main && scrollPreservingRef.current) {
      // Release fixed position
      main.style.position = '';
      main.style.top = '';
      main.style.left = '';
      main.style.right = '';
      main.style.overflow = '';
      // Restore scroll position, clamped to new content height
      const maxScroll = Math.max(0, main.scrollHeight - main.clientHeight);
      main.scrollTop = Math.min(savedScrollTop.current, maxScroll);
      scrollPreservingRef.current = false;
    }
  }, [subjectFilter, monthFilter, search]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  // PROMO report data only depends on the year. Thresholds and checkbox
  // filters are applied client-side (and sent separately to the PDF route),
  // so editing them must not refetch and wipe the current selection.
  } = useQuery({
    queryKey: ['promo-form-one', selectedYear],
    queryFn: async () => {
      const response = await analyticsAPI.getPromoFormOne(selectedYear);
      return response.data;
    },
    enabled: Boolean(selectedYear),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, requestError) => {
      const status = requestError?.response?.status;
      if (status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
  });

  // Memoized so filter effects don't re-run on every render.
  const students = useMemo(() => data?.students || [], [data]);
  const months = data?.months?.length ? data.months : FALLBACK_MONTHS;
  const subjectCount = students.reduce((codes, student) => {
    for (const subject of student.subjects || []) codes.add(subject.subject_code);
    return codes;
  }, new Set()).size;

  const subjectOptions = useMemo(() => collectSubjects(students), [students]);

  // A fresh year means fresh filters: everything selected, search cleared.
  // Guard on the year so background refetches keep the user's choices.
  useEffect(() => {
    if (!data || initialisedYearRef.current === selectedYear) return;
    initialisedYearRef.current = selectedYear;
    setSearch('');
    setSubjectFilter(subjectOptions.map((subject) => subject.code));
    setMonthFilter(months);
  }, [data, selectedYear, subjectOptions, months]);

  const activeMonths = useMemo(
    () => months.filter((month) => monthFilter.includes(month)),
    [months, monthFilter],
  );
  const activeSubjectSet = useMemo(() => new Set(subjectFilter), [subjectFilter]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) => (
      String(student.full_name || '').toLowerCase().includes(query)
      || String(student.adm_no || '').toLowerCase().includes(query)
    ));
  }, [students, search]);

  // Positions cover every student of the year (search does not re-rank anyone).
  const positionMap = useMemo(() => {
    const buckets = new Map();
    for (const student of students) {
      for (const subject of student.subjects || []) {
        if (!activeSubjectSet.has(subject.subject_code)) continue;
        const { average } = scoreStats(subject, activeMonths);
        if (average === null) continue;
        const key = `${streamKeyOf(student.stream)}|${subject.subject_code}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push({ admNo: student.adm_no, code: subject.subject_code, average });
      }
    }

    const map = new Map();
    for (const [key, bucket] of buckets) {
      bucket.sort((a, b) => b.average - a.average);
      let previousAverage = null;
      let previousRank = 0;
      bucket.forEach((entry, index) => {
        const rank = previousAverage !== null && Math.abs(entry.average - previousAverage) < 1e-9
          ? previousRank
          : index + 1;
        previousAverage = entry.average;
        previousRank = rank;
        map.set(`${key}|${entry.admNo}|${entry.code}`, rank);
      });
    }
    return map;
  }, [students, activeSubjectSet, activeMonths]);

  const buildRows = (student) => (student.subjects || [])
    .filter((subject) => activeSubjectSet.has(subject.subject_code))
    .map((subject) => {
      const { total, average } = scoreStats(subject, activeMonths);
      return {
        subject,
        total,
        average,
        grade: gradeForAverage(average),
        position: positionMap.get(
          `${streamKeyOf(student.stream)}|${subject.subject_code}|${student.adm_no}|${subject.subject_code}`,
        ) || null,
        remarks: remarkForAverage(average, qualifyThreshold, discussThreshold),
      };
    });

  const resetFilters = () => {
    setSearch('');
    setSubjectFilter(subjectOptions.map((subject) => subject.code));
    setMonthFilter(months);
  };

  const handleDownloadPdf = async () => {
    if (!selectedYear || isDownloading) return;
    setIsDownloading(true);

    try {
      const response = await analyticsAPI.getPromoFormOnePdf(selectedYear, qualifyThreshold, discussThreshold, activeMonths, subjectFilter);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      if (!blob.size) throw new Error('The generated PDF is empty');

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PROMO_Form_One_${selectedYear}.pdf`;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Keep the object URL alive briefly so the browser can finish saving.
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      let message = error?.message || 'Failed to generate PDF';
      const data = error?.response?.data;
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text());
          message = parsed.message || message;
        } catch {
          /* keep default message */
        }
      } else if (data?.message) {
        message = data.message;
      }
      toast.error(message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="promo-page">
        <div className="promo-shell">
          <header className="promo-top">
            <div className="promo-top-row">
              <div>
                <h1 className="promo-top-title">PROMO</h1>
                <p className="promo-top-sub">Form One to Form Two subject allocation guide</p>
              </div>
              <Link to="/admin/analytics" className="promo-back">
                <i className="fas fa-arrow-left" />
                <span>Back</span>
              </Link>
            </div>
          </header>

          <section className="promo-card">
            <div className="promo-hero">
              <p className="promo-hero-text">
                THIS PAGE GUIDES YOU ON HOW TO ALLOCATE SUBJECTS TO STUDENTS OF FORM ONE
                WHEN THEY ENTER FORM TWO
              </p>
            </div>

            <div className="promo-year-card">
              <div className="promo-year-grid">
                <div className="promo-year-copy">
                  <label className="promo-year-label" htmlFor="promo-year">
                    SELECT YEAR
                  </label>
                  <p className="promo-year-help">
                    Choose the academic year to begin allocating Form Two subjects.
                  </p>
                </div>

                <div className="promo-year-row">
                  <select
                    id="promo-year"
                    className="promo-year-select"
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(event.target.value)}
                  >
                    <option value="">Select a year</option>
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                        {year === getCurrentCalendarYear() ? ' (current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedYear ? (
                <div className="promo-year-note">
                  <i className="fas fa-circle-check" />
                  <span>
                    Year <strong>{selectedYear}</strong> selected. Form One subject
                    performance for this year is shown below.
                  </span>
                </div>
              ) : (
                <div className="promo-year-note promo-year-note--muted">
                  <i className="fas fa-circle-info" />
                  <span>Select a year to list Form One students.</span>
                </div>
              )}
            </div>
          </section>

          {selectedYear && (
            <section className="promo-results">
              {isLoading ? (
                <div className="promo-state">
                  <span className="promo-spinner" />
                  <span>Loading Form One students for {selectedYear}…</span>
                </div>
              ) : isError ? (
                <div className="promo-state promo-state--error">
                  <i className="fas fa-exclamation-triangle" />
                  <span>{error?.response?.data?.message || error?.message || 'Failed to load students'}</span>
                  <button type="button" className="promo-retry" onClick={() => refetch()}>
                    Retry
                  </button>
                </div>
              ) : students.length === 0 ? (
                <div className="promo-state promo-state--empty">
                  <i className="fas fa-user-graduate" />
                  <span>No Form One students were found for {selectedYear}.</span>
                </div>
              ) : (
                <>
                  <div className="promo-results-head">
                    <div>
                      <h2 className="promo-results-title">Form One Students — {selectedYear}</h2>
                      <p className="promo-results-sub">
                        {students.length} students · {subjectCount} registered subjects
                      </p>
                    </div>
                    <div className="promo-results-actions">
                      <div className="promo-legend">
                        <span className="promo-remark promo-remark--qualify">QUALIFY</span>
                        <span className="promo-remark promo-remark--discuss">DISCUSS</span>
                        <span className="promo-remark promo-remark--not">NOT QUALIFY</span>
                      </div>
                      <button
                        type="button"
                        className="promo-download"
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <span className="promo-spinner promo-spinner--small" />
                        ) : (
                          <i className="fas fa-file-pdf" />
                        )}
                        <span>{isDownloading ? 'Generating PDF…' : 'Download PDF'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="promo-toolbar">
                    <div className="promo-search">
                      <i className="fas fa-search" />
                      <input
                        type="search"
                        className="promo-search-input"
                        placeholder="Search student by name or admission number"
                        value={search}
                        onChange={(event) => {
                          saveScrollPosition();
                          setSearch(event.target.value);
                        }}
                        aria-label="Search students by name or admission number"
                      />
                      {search && (
                        <button
                          type="button"
                          className="promo-search-clear"
                          onClick={() => setSearch('')}
                          aria-label="Clear search"
                        >
                          <i className="fas fa-times" />
                        </button>
                      )}
                    </div>

                    <div className="promo-filter-group">
                      <div className="promo-filter-head">
                        <span className="promo-filter-label">
                          <i className="fas fa-book-open" /> SUBJECTS
                        </span>
                        <div className="promo-filter-btns">
                          <button
                            type="button"
                            onClick={() => {
                            saveScrollPosition();
                            setSubjectFilter(subjectOptions.map((subject) => subject.code));
                          }}
                          >
                            All
                          </button>
                          <button type="button" onClick={() => {
                          saveScrollPosition();
                          setSubjectFilter([]);
                        }}>
                            None
                          </button>
                        </div>
                      </div>
                      <div className="promo-chips">
                        {subjectOptions.map((subject) => {
                          const checked = subjectFilter.includes(subject.code);
                          return (
                            <label
                              key={subject.code}
                              className={`promo-chip ${checked ? 'promo-chip--on' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  saveScrollPosition();
                                  setSubjectFilter((prev) => toggleValue(prev, subject.code));
                                }}
                              />
                              <span className="promo-chip-box">
                                <i className="fas fa-check" />
                              </span>
                              <span className="promo-chip-text">{subject.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="promo-filter-group">
                      <div className="promo-filter-head">
                        <span className="promo-filter-label">
                          <i className="fas fa-calendar-days" /> MONTHS
                        </span>
                        <div className="promo-filter-btns">
                          <button type="button" onClick={() => {
                          saveScrollPosition();
                          setMonthFilter(months);
                        }}>
                            All
                          </button>
                          <button type="button" onClick={() => {
                          saveScrollPosition();
                          setMonthFilter([]);
                        }}>
                            None
                          </button>
                        </div>
                      </div>
                      <div className="promo-chips">
                        {months.map((month) => {
                          const checked = monthFilter.includes(month);
                          return (
                            <label
                              key={month}
                              className={`promo-chip ${checked ? 'promo-chip--on' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  saveScrollPosition();
                                  setMonthFilter((prev) => toggleValue(prev, month));
                                }}
                              />
                              <span className="promo-chip-box">
                                <i className="fas fa-check" />
                              </span>
                              <span className="promo-chip-text">{month}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="promo-threshold-group">
                      <div className="promo-threshold-head">
                        <span className="promo-filter-label">
                          <i className="fas fa-sliders-h" /> THRESHOLDS
                        </span>
                      </div>
                      <div className="promo-threshold-row">
                        <div className="promo-threshold-field">
                          <label className="promo-threshold-label" htmlFor="promo-qualify">
                            QUALIFY (avg ≥)
                          </label>
                          <input
                            id="promo-qualify"
                            type="number"
                            className="promo-threshold-input"
                            value={qualifyThreshold}
                            min="0"
                            max="100"
                            step="0.5"
                            onChange={(event) => {
                              const val = Number(event.target.value);
                              if (!Number.isNaN(val)) setQualifyThreshold(val);
                            }}
                          />
                        </div>
                        <div className="promo-threshold-field">
                          <label className="promo-threshold-label" htmlFor="promo-discuss">
                            DISCUSS (avg ≥)
                          </label>
                          <input
                            id="promo-discuss"
                            type="number"
                            className="promo-threshold-input"
                            value={discussThreshold}
                            min="0"
                            max="100"
                            step="0.5"
                            onChange={(event) => {
                              const val = Number(event.target.value);
                              if (!Number.isNaN(val)) setDiscussThreshold(val);
                            }}
                          />
                        </div>
                        <div className="promo-legend">
                          <span className="promo-remark promo-remark--qualify">QUALIFY</span>
                          <span className="promo-remark promo-remark--discuss">DISCUSS</span>
                          <span className="promo-remark promo-remark--not">NOT QUALIFY</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="promo-toolbar-meta">
                    <span>
                      Showing <strong>{filteredStudents.length}</strong> of{' '}
                      <strong>{students.length}</strong> students ·{' '}
                      <strong>{activeSubjectSet.size}</strong> of{' '}
                      <strong>{subjectOptions.length}</strong> subjects ·{' '}
                      <strong>{activeMonths.length}</strong> of{' '}
                      <strong>{months.length}</strong> months
                    </span>
                    <button type="button" className="promo-reset" onClick={() => {
                      saveScrollPosition();
                      resetFilters();
                    }}>
                      <i className="fas fa-rotate-left" /> Reset filters
                    </button>
                  </div>
                  {activeSubjectSet.size === 0 ? (
                    <div className="promo-state promo-state--empty">
                      <i className="fas fa-book-open" />
                      <span>No subject selected — tick at least one subject above.</span>
                    </div>
                  ) : activeMonths.length === 0 ? (
                    <div className="promo-state promo-state--empty">
                      <i className="fas fa-calendar-xmark" />
                      <span>No month selected — tick at least one month above.</span>
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="promo-state promo-state--empty">
                      <i className="fas fa-user-slash" />
                      <span>
                        No student matches “{search.trim()}” in {selectedYear}.
                      </span>
                    </div>
                  ) : (
                    filteredStudents.map((student, index) => {
                      const rows = buildRows(student);
                      return (
                        <article className="promo-student" key={student.adm_no || index}>
                          <header className="promo-student-head">
                            <div className="promo-student-id">
                              <span className="promo-student-index">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <div>
                                <h3 className="promo-student-name">{student.full_name}</h3>
                                <p className="promo-student-meta">
                                  <span>ADM: {student.adm_no}</span>
                                  <span>Form I · Stream {student.stream}</span>
                                </p>
                              </div>
                            </div>
                            <span className="promo-student-stream">{student.term || 'Form One'}</span>
                          </header>

                          {rows.length ? (
                            <div className="promo-table-wrap">
                              <table className="promo-table">
                                <thead>
                                  <tr>
                                    <th className="promo-th-subject">SUBJECT</th>
                                    {activeMonths.map((month) => (
                                      <th key={month}>{month.toUpperCase()}</th>
                                    ))}
                                    <th className="promo-th-result">TOTAL SCORE</th>
                                    <th className="promo-th-result">AVERAGE</th>
                                    <th className="promo-th-result">GRADE</th>
                                    <th className="promo-th-result">POSITION</th>
                                    <th className="promo-th-remarks">REMARKS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((row) => (
                                    <tr key={row.subject.subject_code}>
                                      <td className="promo-td-subject">
                                        <span className="promo-subject-name">
                                          {row.subject.subject_name || row.subject.subject_code}
                                        </span>
                                        <span className="promo-subject-code">
                                          {row.subject.subject_code}
                                        </span>
                                      </td>
                                      {activeMonths.map((month) => (
                                        <td key={month} className="promo-td-score">
                                          {formatScore(row.subject.scores?.[month])}
                                        </td>
                                      ))}
                                      <td className="promo-td-total">{formatScore(row.total)}</td>
                                      <td className="promo-td-average">{formatAverage(row.average)}</td>
                                      <td>
                                        <span className={`promo-grade ${gradeClass(row.grade)}`}>
                                          {row.grade}
                                        </span>
                                      </td>
                                      <td className="promo-td-position">{row.position || '-'}</td>
                                      <td className="promo-td-remarks">
                                        <span className={`promo-remark ${remarkClass(row.remarks)}`}>
                                          {row.remarks}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="promo-student-empty">
                              No subjects registered for this class.
                            </div>
                          )}
                        </article>
                      );
                    })
                  )}
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Promo;
