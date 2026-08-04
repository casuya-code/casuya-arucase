import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import { analyticsAPI } from '../../services/analytics';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import '../../utils/chartConfig';
import {
  normalizeFormLabel,
  sortMonthlyData,
  getCommonChartOptions,
  calculateTrend,
  calculateStats,
  exportToCSV
} from '../../utils/analyticsUtils';
import './AnalyticsTrack.css';

const ClassTrack = () => {
  const { form } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const formLabel = normalizeFormLabel(form);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const standardStreams = [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }];
  const combinationStreams = [
    { value: 'PCB', label: 'PCB' },
    { value: 'PCM', label: 'PCM' },
    { value: 'EGM', label: 'EGM' },
    { value: 'HGE', label: 'HGE' },
    { value: 'HGL', label: 'HGL' },
  ];

  const availableStreams = (formLabel.includes('FORM V') || formLabel.includes('FORM VI'))
    ? combinationStreams : standardStreams;

  const [selectedStream, setSelectedStream] = useState(() => {
    const urlStream = searchParams.get('stream');
    if (urlStream && availableStreams.find(s => s.value === urlStream)) return urlStream;
    return availableStreams[0]?.value || 'A';
  });

  const [selectedYear, setSelectedYear] = useState(() => {
    const urlYear = searchParams.get('year');
    if (urlYear) { const y = parseInt(urlYear); if (!isNaN(y) && y > 0) return y; }
    return null;
  });

  useEffect(() => {
    const p = new URLSearchParams(searchParams);
    if (selectedStream) p.set('stream', selectedStream); else p.delete('stream');
    if (selectedYear) p.set('year', selectedYear.toString()); else p.delete('year');
    setSearchParams(p, { replace: true });
  }, [selectedStream, selectedYear]);

  const { data: classPerformance, isLoading, error, isError, refetch } = useQuery({
    queryKey: ['class-performance', formLabel, selectedStream, selectedYear],
    queryFn: async () => {
      const params = { form: formLabel, stream: selectedStream };
      if (selectedYear) params.year = selectedYear;
      const res = await analyticsAPI.getClassPerformance(params);
      if (!res.data) throw new Error('No data received from server');
      return res.data;
    },
    enabled: !!selectedStream,
    staleTime: 5 * 60 * 1000,
    retry: (f, e) => (e?.response?.status >= 400 && e?.response?.status < 500) ? false : f < 2,
  });

  const sortedMonthly = useMemo(() => sortMonthlyData(classPerformance?.monthly_averages ?? []), [classPerformance]);
  const trend = useMemo(() => sortedMonthly.length > 0 ? calculateTrend(sortedMonthly) : null, [sortedMonthly]);
  const stats = useMemo(() => sortedMonthly.length > 0 ? calculateStats(sortedMonthly) : null, [sortedMonthly]);

  const mobileChartOpts = (extra = {}) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: isMobile ? 'bottom' : 'top', labels: { boxWidth: isMobile ? 10 : 14, padding: isMobile ? 8 : 16, font: { size: isMobile ? 10 : 12 }, usePointStyle: true } },
      tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleFont: { size: isMobile ? 11 : 13 }, bodyFont: { size: isMobile ? 10 : 12 }, padding: isMobile ? 6 : 10, cornerRadius: 8, ...extra.tooltip },
      ...(extra.plugins || {}),
    },
    scales: {
      y: { beginAtZero: true, max: 100, title: { display: !isMobile, text: 'Score (%)', font: { size: 11 } }, ticks: { font: { size: isMobile ? 9 : 11 } }, grid: { color: 'rgba(0,0,0,0.04)' }, ...extra.y },
      x: { title: { display: !isMobile, text: extra.xLabel || '', font: { size: 11 } }, ticks: { maxRotation: isMobile ? 60 : 45, font: { size: isMobile ? 9 : 11 } }, grid: { display: false }, ...extra.x },
    },
    ...extra.root,
  });

  return (
    <AdminLayout>
      <div className="an-st-page">
        <div className="an-st-shell">
          <header className="an-st-top">
            <div className="an-st-top-row">
              <div>
                <h1 className="an-st-title">Class Track</h1>
                <p className="an-st-sub">{formLabel} &mdash; Stream {selectedStream}</p>
              </div>
              <Link to={`/admin/analytics/${form}`} className="an-st-back">
                <i className="fas fa-arrow-left" />
                <span>Back</span>
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
              <label className="an-ct-filter-label">Year (optional)</label>
              <input type="number" value={selectedYear || ''} onChange={e => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)} className="an-ct-input" placeholder="All years" min={new Date().getFullYear() - 10} max={new Date().getFullYear() + 5} />
            </div>
          </div>

          {isLoading ? (
            <div className="an-st-loading"><div className="an-st-spinner" /><span>Loading class data...</span></div>
          ) : isError ? (
            <div className="an-ct-error">
              <i className="fas fa-exclamation-triangle" />
              <span>{error?.message || 'Failed to load data'}</span>
              <button onClick={() => refetch()} className="an-ct-retry">Retry</button>
            </div>
          ) : classPerformance ? (
            <div className="an-st-perf-body">
              {/* Stat Cards */}
              <div className="an-ct-stats">
                <div className="an-ct-stat">
                  <span className="an-ct-stat-label">Average</span>
                  <span className="an-ct-stat-val an-ct-blue">{stats?.avg.toFixed(1) ?? '0.0'}%</span>
                </div>
                <div className="an-ct-stat">
                  <span className="an-ct-stat-label">Highest</span>
                  <span className="an-ct-stat-val an-ct-green">{stats?.max.toFixed(1) ?? '0.0'}%</span>
                </div>
                <div className="an-ct-stat">
                  <span className="an-ct-stat-label">Lowest</span>
                  <span className="an-ct-stat-val an-ct-red">{stats?.min.toFixed(1) ?? '0.0'}%</span>
                </div>
                <div className="an-ct-stat">
                  <span className="an-ct-stat-label">Trend</span>
                  <span className={`an-ct-stat-val ${trend?.trend === 'improving' ? 'an-ct-green' : trend?.trend === 'declining' ? 'an-ct-red' : 'an-ct-muted'}`}>
                    {trend?.trend === 'improving' ? '↑' : trend?.trend === 'declining' ? '↓' : '—'}
                  </span>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="an-ct-actions">
                <button className="an-ct-action-btn" onClick={() => exportToCSV(
                  sortedMonthly.map(m => ({ 'Month/Year': m.monthYear || `${m.month} ${m.year || ''}`, 'Average': m.average.toFixed(1), 'Students': m.student_count })),
                  `class-${formLabel}-${selectedStream}-${selectedYear || 'all'}.csv`
                )}>
                  <i className="fas fa-download" /> Monthly
                </button>
                {classPerformance.subject_averages?.length > 0 && (
                  <button className="an-ct-action-btn" onClick={() => exportToCSV(
                    classPerformance.subject_averages.map(s => ({ 'Subject': s.subject_code, 'Average': s.average.toFixed(1), 'Students': s.student_count })),
                    `subjects-${formLabel}-${selectedStream}-${selectedYear || 'all'}.csv`
                  )}>
                    <i className="fas fa-download" /> Subjects
                  </button>
                )}
              </div>

              {/* Charts */}
              {sortedMonthly.length > 0 && (
                <div className="an-st-chart-card">
                  <h4 className="an-st-chart-label">Monthly Averages</h4>
                  <div className="an-st-chart-wrap">
                    <Line
                      data={{
                        labels: sortedMonthly.map(m => m.monthYear || `${m.month} ${m.year || ''}`),
                        datasets: [{
                          label: 'Average',
                          data: sortedMonthly.map(m => m.average),
                          borderColor: '#3b82f6',
                          backgroundColor: '#3b82f620',
                          tension: 0.4,
                          fill: true,
                          pointRadius: isMobile ? 3 : 5,
                          pointHoverRadius: isMobile ? 5 : 7,
                          borderWidth: 2,
                        }],
                      }}
                      options={mobileChartOpts({
                        xLabel: 'Month & Year',
                        tooltip: {
                          callbacks: { label: ctx => `Avg: ${ctx.parsed.y.toFixed(1)}% (${sortedMonthly[ctx.dataIndex]?.student_count} students)` },
                        },
                      })}
                    />
                  </div>
                </div>
              )}

              {classPerformance.subject_averages?.length > 0 && (
                <div className="an-st-chart-card">
                  <h4 className="an-st-chart-label">Subject Averages</h4>
                  <div className="an-st-chart-wrap">
                    <Bar
                      data={{
                        labels: classPerformance.subject_averages.map(s => s.subject_code),
                        datasets: [{
                          label: 'Average',
                          data: classPerformance.subject_averages.map(s => s.average),
                          backgroundColor: '#8b5cf6',
                          borderColor: '#8b5cf6',
                          borderWidth: 1,
                          borderRadius: 4,
                        }],
                      }}
                      options={mobileChartOpts({ xLabel: 'Subject' })}
                    />
                  </div>
                </div>
              )}

              {classPerformance.grade_distribution?.length > 0 && (
                <div className="an-st-chart-card">
                  <h4 className="an-st-chart-label">Grade Distribution</h4>
                  <div className="an-st-chart-wrap">
                    <Doughnut
                      data={{
                        labels: classPerformance.grade_distribution.map(g => `Grade ${g.grade}`),
                        datasets: [{
                          data: classPerformance.grade_distribution.map(g => g.count),
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
            <div className="an-ct-empty">
              <i className="fas fa-chart-line" />
              <span>No data for {formLabel} - Stream {selectedStream}{selectedYear ? ` in ${selectedYear}` : ''}</span>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ClassTrack;
