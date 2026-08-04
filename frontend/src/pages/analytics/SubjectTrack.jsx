import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import { analyticsAPI } from '../../services/analytics';
import { Line, Doughnut } from 'react-chartjs-2';
import '../../utils/chartConfig';
import {
  normalizeFormLabel,
  sortMonthlyData,
  calculateTrend,
  calculateStats,
  exportToCSV
} from '../../utils/analyticsUtils';
import './AnalyticsTrack.css';

const CURRENT_YEAR = new Date().getFullYear();

const SubjectTrack = () => {
  const { form } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const formLabel = normalizeFormLabel(form);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const standardStreams = [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }];
  const combinationStreams = [
    { value: 'PCB', label: 'PCB' }, { value: 'PCM', label: 'PCM' },
    { value: 'EGM', label: 'EGM' }, { value: 'HGE', label: 'HGE' }, { value: 'HGL', label: 'HGL' },
  ];
  const availableStreams = (formLabel.includes('FORM V') || formLabel.includes('FORM VI'))
    ? combinationStreams : standardStreams;

  const [selectedSubject, setSelectedSubject] = useState(() => searchParams.get('subject') || '');
  const [selectedStream, setSelectedStream] = useState(() => {
    const u = searchParams.get('stream');
    return (u && availableStreams.find(s => s.value === u)) ? u : availableStreams[0]?.value || 'A';
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const u = searchParams.get('year');
    if (u) { const y = parseInt(u); if (!isNaN(y) && y > 0) return y; }
    return CURRENT_YEAR;
  });

  useEffect(() => {
    const p = new URLSearchParams(searchParams);
    if (selectedStream) p.set('stream', selectedStream); else p.delete('stream');
    if (selectedYear) p.set('year', selectedYear.toString()); else p.delete('year');
    if (selectedSubject) p.set('subject', selectedSubject); else p.delete('subject');
    setSearchParams(p, { replace: true });
  }, [selectedStream, selectedYear, selectedSubject]);

  const { data: subjectsData, isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects-for-form', formLabel, selectedStream, selectedYear],
    queryFn: async () => {
      const params = { stream: selectedStream };
      if (selectedYear) params.year = selectedYear;
      const res = await analyticsAPI.getSubjectsForForm(formLabel, params);
      return res.data.subjects || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: subjectPerformance, isLoading: loadingPerformance, error: perfError, refetch } = useQuery({
    queryKey: ['subject-performance', formLabel, selectedSubject, selectedStream, selectedYear],
    queryFn: async () => {
      if (!selectedSubject) return null;
      const params = { form: formLabel, stream: selectedStream, subject_code: selectedSubject, term: 'First Term' };
      if (selectedYear) params.year = selectedYear;
      const res = await analyticsAPI.getSubjectPerformance(params);
      if (!res.data) throw new Error('No data received from server');
      return res.data;
    },
    enabled: !!selectedSubject,
    staleTime: 5 * 60 * 1000,
    retry: (f, e) => (e?.response?.status >= 400 && e?.response?.status < 500) ? false : f < 2,
  });

  const sortedMonthly = useMemo(() => sortMonthlyData(subjectPerformance?.monthly_averages ?? []), [subjectPerformance]);
  const trend = useMemo(() => sortedMonthly.length > 0 ? calculateTrend(sortedMonthly) : null, [sortedMonthly]);
  const stats = useMemo(() => sortedMonthly.length > 0 ? calculateStats(sortedMonthly) : null, [sortedMonthly]);

  const chartOpts = (xLabel) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: isMobile ? 'bottom' : 'top', labels: { boxWidth: isMobile ? 10 : 14, padding: isMobile ? 8 : 16, font: { size: isMobile ? 10 : 12 }, usePointStyle: true } },
      tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleFont: { size: isMobile ? 11 : 13 }, bodyFont: { size: isMobile ? 10 : 12 }, padding: isMobile ? 6 : 10, cornerRadius: 8, mode: 'index', intersect: false },
    },
    scales: {
      y: { beginAtZero: true, max: 100, title: { display: !isMobile, text: 'Score (%)', font: { size: 11 } }, ticks: { font: { size: isMobile ? 9 : 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
      x: { title: { display: !isMobile, text: xLabel, font: { size: 11 } }, ticks: { maxRotation: isMobile ? 60 : 45, font: { size: isMobile ? 9 : 11 } }, grid: { display: false } },
    },
  });

  return (
    <AdminLayout>
      <div className="an-st-page">
        <div className="an-st-shell">
          <header className="an-st-top">
            <div className="an-st-top-row">
              <div>
                <h1 className="an-st-title">Subject Track</h1>
                <p className="an-st-sub">{formLabel} &mdash; {selectedSubject || 'Select subject'}</p>
              </div>
              <Link to={`/admin/analytics/${form}`} className="an-st-back">
                <i className="fas fa-arrow-left" /><span>Back</span>
              </Link>
            </div>
          </header>

          {/* Filters */}
          <div className="an-ct-filters">
            <div className="an-ct-filter">
              <label className="an-ct-filter-label">Stream</label>
              <select value={selectedStream} onChange={e => setSelectedStream(e.target.value)} className="an-ct-select">
                {availableStreams.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="an-ct-filter">
              <label className="an-ct-filter-label">Year</label>
              <input type="number" value={selectedYear} onChange={e => setSelectedYear(e.target.value ? parseInt(e.target.value) : CURRENT_YEAR)} className="an-ct-input" min={CURRENT_YEAR - 10} max={CURRENT_YEAR + 5} />
            </div>
            <div className="an-ct-filter">
              <label className="an-ct-filter-label">Subject</label>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="an-ct-select">
                <option value="">Select Subject</option>
                {subjectsData?.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {loadingSubjects ? (
            <div className="an-st-loading"><div className="an-st-spinner" /><span>Loading subjects...</span></div>
          ) : !subjectsData || subjectsData.length === 0 ? (
            <div className="an-ct-empty"><i className="fas fa-book" /><span>No subjects for {formLabel} (Stream {selectedStream})</span></div>
          ) : !selectedSubject ? (
            <div className="an-ct-empty"><i className="fas fa-hand-pointer" /><span>Select a subject to view analytics</span></div>
          ) : loadingPerformance ? (
            <div className="an-st-loading"><div className="an-st-spinner" /><span>Loading performance data...</span></div>
          ) : subjectPerformance ? (
            <div className="an-st-perf-body">
              {/* Stat Cards */}
              {stats && (
                <div className="an-ct-stats">
                  <div className="an-ct-stat">
                    <span className="an-ct-stat-label">Average</span>
                    <span className="an-ct-stat-val an-ct-blue">{stats.avg.toFixed(1)}%</span>
                  </div>
                  <div className="an-ct-stat">
                    <span className="an-ct-stat-label">Highest</span>
                    <span className="an-ct-stat-val an-ct-green">{stats.max.toFixed(1)}%</span>
                  </div>
                  <div className="an-ct-stat">
                    <span className="an-ct-stat-label">Lowest</span>
                    <span className="an-ct-stat-val an-ct-red">{stats.min.toFixed(1)}%</span>
                  </div>
                  <div className="an-ct-stat">
                    <span className="an-ct-stat-label">Trend</span>
                    <span className={`an-ct-stat-val ${trend?.trend === 'improving' ? 'an-ct-green' : trend?.trend === 'declining' ? 'an-ct-red' : 'an-ct-muted'}`}>
                      {trend?.trend === 'improving' ? '↑' : trend?.trend === 'declining' ? '↓' : '—'}
                    </span>
                  </div>
                </div>
              )}

              {/* Export */}
              <div className="an-ct-actions">
                <button className="an-ct-action-btn" onClick={() => exportToCSV(
                  sortedMonthly.map(m => ({ 'Month/Year': m.monthYear || `${m.month} ${m.year || ''}`, 'Average': m.average.toFixed(1), 'Students': m.student_count })),
                  `${selectedSubject}-${formLabel}-${selectedStream}-${selectedYear}.csv`
                )}>
                  <i className="fas fa-download" /> Export CSV
                </button>
              </div>

              {/* Line Chart */}
              {sortedMonthly.length > 0 && (
                <div className="an-st-chart-card">
                  <h4 className="an-st-chart-label">Monthly Averages — {selectedSubject}</h4>
                  <div className="an-st-chart-wrap">
                    <Line
                      data={{
                        labels: sortedMonthly.map(m => m.monthYear || `${m.month} ${m.year || ''}`),
                        datasets: [{
                          label: 'Average',
                          data: sortedMonthly.map(m => m.average),
                          borderColor: '#10b981',
                          backgroundColor: '#10b98120',
                          tension: 0.4,
                          fill: true,
                          pointRadius: isMobile ? 3 : 5,
                          pointHoverRadius: isMobile ? 5 : 7,
                          borderWidth: 2,
                        }],
                      }}
                      options={chartOpts('Month & Year')}
                    />
                  </div>
                </div>
              )}

              {/* Doughnut */}
              {subjectPerformance.grade_distribution?.length > 0 && (
                <div className="an-st-chart-card">
                  <h4 className="an-st-chart-label">Grade Distribution</h4>
                  <div className="an-st-chart-wrap">
                    <Doughnut
                      data={{
                        labels: subjectPerformance.grade_distribution.map(g => `Grade ${g.grade}`),
                        datasets: [{
                          data: subjectPerformance.grade_distribution.map(g => g.count),
                          backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'],
                          borderWidth: 2,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: isMobile ? 'bottom' : 'right', labels: { boxWidth: 12, font: { size: isMobile ? 10 : 12 }, padding: isMobile ? 8 : 16 } },
                          tooltip: { callbacks: { label: ctx => { const t = ctx.dataset.data.reduce((a, b) => a + b, 0); return `${ctx.label}: ${ctx.parsed} (${t > 0 ? ((ctx.parsed / t) * 100).toFixed(1) : 0}%)`; } } },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="an-ct-empty"><i className="fas fa-chart-bar" /><span>No data for {selectedSubject} ({formLabel} - {selectedStream} - {selectedYear})</span></div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default SubjectTrack;
