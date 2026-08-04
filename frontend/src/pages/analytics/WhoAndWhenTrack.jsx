import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import { analyticsAPI } from '../../services/analytics';
import { Line } from 'react-chartjs-2';
import '../../utils/chartConfig';
import { normalizeFormLabel, sortMonthlyData } from '../../utils/analyticsUtils';
import './AnalyticsTrack.css';

const CATEGORY_CONFIG = [
  { key: 'highPerformers', title: 'High Performers', icon: 'fa-star', color: '#10b981', desc: 'Avg ≥ 75' },
  { key: 'strugglingStudents', title: 'Struggling', icon: 'fa-exclamation-triangle', color: '#ef4444', desc: 'Avg < 50' },
  { key: 'improvingStudents', title: 'Improving', icon: 'fa-arrow-trend-up', color: '#3b82f6', desc: 'Upward trend' },
  { key: 'decliningStudents', title: 'Declining', icon: 'fa-arrow-trend-down', color: '#f59e0b', desc: 'Downward trend' },
  { key: 'inconsistentPerformers', title: 'Inconsistent', icon: 'fa-chart-line', color: '#8b5cf6', desc: 'High variance' },
];

const WhoAndWhenTrack = () => {
  const { form } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const formLabel = normalizeFormLabel(form);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const standardStreams = [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }];
  const combinationStreams = [
    { value: 'PCB', label: 'PCB' }, { value: 'PCM', label: 'PCM' },
    { value: 'EGM', label: 'EGM' }, { value: 'HGE', label: 'HGE' }, { value: 'HGL', label: 'HGL' },
  ];
  const availableStreams = (!formLabel || formLabel.includes('FORM V') || formLabel.includes('FORM VI'))
    ? combinationStreams : standardStreams;

  const [selectedStream, setSelectedStream] = useState(() => {
    const u = searchParams.get('stream');
    return (u && availableStreams.find(s => s.value === u)) ? u : availableStreams[0]?.value || 'A';
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const u = searchParams.get('year');
    if (u) { const y = parseInt(u); if (!isNaN(y) && y > 0) return y; }
    return null;
  });
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const p = new URLSearchParams(searchParams);
    if (selectedStream) p.set('stream', selectedStream); else p.delete('stream');
    if (selectedYear) p.set('year', selectedYear.toString()); else p.delete('year');
    setSearchParams(p, { replace: true });
  }, [selectedStream, selectedYear]);

  const { data, isLoading, error, isError, refetch } = useQuery({
    queryKey: ['who-and-when', formLabel, selectedStream, selectedYear],
    queryFn: async () => {
      const params = { form: formLabel, stream: selectedStream, term: 'First Term' };
      if (selectedYear) params.year = selectedYear;
      const res = await analyticsAPI.getWhoAndWhen(params);
      if (!res.data) throw new Error('No data received');
      return res.data;
    },
    enabled: !!selectedStream,
    staleTime: 5 * 60 * 1000,
    retry: (f, e) => (e?.response?.status >= 400 && e?.response?.status < 500) ? false : f < 2,
  });

  const categories = data?.categories || {};

  const miniChart = (student) => {
    const months = sortMonthlyData(student.monthlyAverages || []);
    if (months.length === 0) return null;
    return (
      <div className="an-waw-mini-chart">
        <Line
          data={{
            labels: months.map(m => `${m.month}`),
            datasets: [{
              data: months.map(m => m.average),
              borderColor: '#3b82f6',
              backgroundColor: '#3b82f615',
              tension: 0.4,
              fill: true,
              pointRadius: isMobile ? 2 : 3,
              borderWidth: 1.5,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { y: { display: false }, x: { display: false } },
          }}
        />
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="an-st-page">
        <div className="an-st-shell">
          <header className="an-st-top">
            <div className="an-st-top-row">
              <div>
                <h1 className="an-st-title">Who & When</h1>
                <p className="an-st-sub">{formLabel} &mdash; Stream {selectedStream}</p>
              </div>
              <Link to={`/admin/analytics/${encodeURIComponent(form)}`} className="an-st-back">
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
              <label className="an-ct-filter-label">Year (optional)</label>
              <input type="number" value={selectedYear || ''} onChange={e => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)} className="an-ct-input" placeholder="All years" min={new Date().getFullYear() - 10} max={new Date().getFullYear() + 5} />
            </div>
          </div>

          {isLoading ? (
            <div className="an-st-loading"><div className="an-st-spinner" /><span>Loading categories...</span></div>
          ) : isError ? (
            <div className="an-ct-error"><i className="fas fa-exclamation-triangle" /><span>{error?.message || 'Failed to load'}</span><button onClick={() => refetch()} className="an-ct-retry">Retry</button></div>
          ) : data ? (
            <div className="an-st-perf-body">
              {/* Summary Stats */}
              <div className="an-ct-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="an-ct-stat">
                  <span className="an-ct-stat-label">Total</span>
                  <span className="an-ct-stat-val an-ct-blue">{data.totalStudents || 0}</span>
                </div>
                <div className="an-ct-stat">
                  <span className="an-ct-stat-label">High</span>
                  <span className="an-ct-stat-val an-ct-green">{categories.highPerformers?.length || 0}</span>
                </div>
                <div className="an-ct-stat">
                  <span className="an-ct-stat-label">Struggling</span>
                  <span className="an-ct-stat-val an-ct-red">{categories.strugglingStudents?.length || 0}</span>
                </div>
              </div>

              {/* Category Accordion */}
              <div className="an-waw-cats">
                {CATEGORY_CONFIG.map(cat => {
                  const students = categories[cat.key] || [];
                  const isOpen = expanded === cat.key;
                  return (
                    <div key={cat.key} className="an-waw-cat">
                      <button className={`an-waw-cat-head ${isOpen ? 'open' : ''}`} onClick={() => setExpanded(isOpen ? null : cat.key)} type="button">
                        <span className="an-waw-cat-icon" style={{ background: cat.color + '14', color: cat.color }}>
                          <i className={`fas ${cat.icon}`} />
                        </span>
                        <span className="an-waw-cat-info">
                          <span className="an-waw-cat-title">{cat.title}</span>
                          <span className="an-waw-cat-desc">{cat.desc}</span>
                        </span>
                        <span className="an-waw-cat-count">{students.length}</span>
                        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} an-waw-cat-chevron`} />
                      </button>

                      {isOpen && (
                        <div className="an-waw-cat-body">
                          {students.length === 0 ? (
                            <div className="an-waw-empty">No students in this category</div>
                          ) : (
                            students.map(sd => (
                              <div key={sd.student.admNo} className="an-waw-student">
                                <div className="an-waw-student-top">
                                  <div className="an-waw-student-info">
                                    <span className="an-waw-student-name">{sd.student.firstName} {sd.student.middleName || ''} {sd.student.surname}</span>
                                    <span className="an-waw-student-meta">Adm {sd.student.admNo} · {sd.student.stream} · {sd.student.year}</span>
                                  </div>
                                  <div className="an-waw-student-avg">{sd.overallAverage.toFixed(1)}%</div>
                                </div>
                                {miniChart(sd)}
                                <div className="an-waw-timeline">
                                  {sortMonthlyData(sd.monthlyAverages).map((m, i) => (
                                    <span key={i} className="an-waw-tl-chip">
                                      <span className="an-waw-tl-month">{m.month}</span>
                                      <span className="an-waw-tl-score">{m.average.toFixed(1)}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AdminLayout>
  );
};

export default WhoAndWhenTrack;
