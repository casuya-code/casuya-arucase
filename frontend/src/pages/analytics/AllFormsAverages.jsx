import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import { analyticsAPI } from '../../services/analytics';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import '../../utils/chartConfig';
import './AnalyticsTrack.css';

const FORM_COLORS = {
  'FORM I': { bg: '#3b82f6', light: '#3b82f620' },
  'FORM II': { bg: '#10b981', light: '#10b98120' },
  'FORM III': { bg: '#ef4444', light: '#ef444420' },
  'FORM IV': { bg: '#8b5cf6', light: '#8b5cf620' },
  'FORM V': { bg: '#f59e0b', light: '#f59e0b20' },
  'FORM VI': { bg: '#ec4899', light: '#ec489920' },
};

const SUBJECT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48'];

const AllFormsAverages = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const { data: formsData, isLoading, error, isError, refetch } = useQuery({
    queryKey: ['all-forms-averages'],
    queryFn: async () => {
      const res = await analyticsAPI.getAllFormsAverages();
      if (!res.data || !res.data.forms) throw new Error('No data received');
      return res.data.forms || [];
    },
    staleTime: 5 * 60 * 1000,
    retry: (f, e) => (e?.response?.status >= 400 && e?.response?.status < 500) ? false : f < 2,
  });

  const processedData = useMemo(() => {
    if (!formsData || formsData.length === 0) return [];
    return formsData.map(form => {
      if (!form || !form.level) return null;
      const monthlyData = (form.averages || []).map(avg => ({
        month: avg.month, year: avg.year,
        monthYear: avg.monthYear || `${avg.month} ${avg.year}`,
        average: avg.class_average || avg.average || 0,
        student_count: avg.student_count || 0, score_count: avg.score_count || 0,
      }));
      let finalMonthly = monthlyData;
      if (monthlyData.length === 0 && form.subject_averages?.length > 0) {
        finalMonthly = form.subject_averages
          .filter(m => m?.subjects && Object.keys(m.subjects).length > 0)
          .map(m => {
            const vals = Object.values(m.subjects).filter(s => s && typeof s === 'object');
            const avgs = vals.map(s => parseFloat(s.average) || 0).filter(a => a > 0);
            const counts = vals.map(s => parseInt(s.student_count) || 0).filter(c => c > 0);
            return {
              month: m.month || '', year: m.year || 0,
              monthYear: m.monthYear || `${m.month || ''} ${m.year || 0}`.trim(),
              average: avgs.length > 0 ? avgs.reduce((s, a) => s + a, 0) / avgs.length : 0,
              student_count: counts.length > 0 ? Math.max(...counts) : 0,
              score_count: counts.length > 0 ? Math.max(...counts) : 0,
            };
          }).filter(Boolean);
      }
      let overallAvg = 0;
      if (finalMonthly.length > 0) {
        const valid = finalMonthly.map(m => parseFloat(m.average) || 0).filter(a => a > 0);
        overallAvg = valid.length > 0 ? valid.reduce((s, a) => s + a, 0) / valid.length : 0;
      }
      let studentCount = form.distinct_student_count || 0;
      if (!studentCount && finalMonthly.length > 0) {
        studentCount = Math.max(...finalMonthly.map(m => parseInt(m.student_count) || 0));
      }
      return {
        level: form.level, monthly_data: finalMonthly,
        subject_averages: form.subject_averages || [],
        overall_average: isNaN(overallAvg) ? 0 : overallAvg,
        overall_student_count: isNaN(studentCount) ? 0 : studentCount,
      };
    }).filter(Boolean);
  }, [formsData]);

  const getDoughnutOpts = () => {
    const doughnutGenerateLabels = (chart) => {
      const d = chart.data;
      const total = d.datasets[0].data.reduce((a, b) => (a || 0) + (b || 0), 0);
      return d.labels.map((l, i) => {
        const v = d.datasets[0].data[i] || 0;
        const pct = total > 0 ? ((v / total) * 100).toFixed(1) : 0;
        return {
          text: l + ': ' + v + ' (' + pct + '%)',
          fillStyle: d.datasets[0].backgroundColor[i],
          hidden: false,
          index: i,
        };
      });
    };
    const doughnutTooltipLabel = (ctx) => {
      const v = ctx.parsed || 0;
      const total = ctx.dataset.data.reduce((a, b) => (a || 0) + (b || 0), 0);
      const pct = total > 0 ? ((v / total) * 100).toFixed(1) : 0;
      return ctx.label + ': ' + v + ' (' + pct + '%)';
    };
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: isMobile ? 'bottom' : 'right',
          labels: {
            boxWidth: 12,
            font: { size: isMobile ? 10 : 12 },
            padding: isMobile ? 8 : 16,
            generateLabels: doughnutGenerateLabels,
          },
        },
        tooltip: {
          callbacks: { label: doughnutTooltipLabel },
        },
      },
    };
  };

  const chartOpts = (xLabel) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: isMobile ? 'bottom' : 'top', labels: { boxWidth: isMobile ? 10 : 14, padding: isMobile ? 8 : 16, font: { size: isMobile ? 10 : 12 }, usePointStyle: true } },
      tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleFont: { size: isMobile ? 11 : 13 }, bodyFont: { size: isMobile ? 10 : 12 }, padding: isMobile ? 6 : 10, cornerRadius: 8, mode: 'index', intersect: false },
    },
    scales: {
      y: { beginAtZero: true, max: 100, title: { display: !isMobile, text: 'Score (%)', font: { size: 11 } }, ticks: { font: { size: isMobile ? 9 : 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
      x: { title: { display: !isMobile, text: xLabel, font: { size: 11 } }, ticks: { maxRotation: isMobile ? 60 : 45, font: { size: isMobile ? 9 : 11 } }, grid: { display: false } },
    },
  });

  const monthOrder = { 'Jrb1': 1, 'Robo': 2, 'Jrb2': 3, 'Nusu': 4, 'Muh': 5, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'August': 5, 'September': 6, 'October': 7, 'November': 8 };
  const sortMonths = (arr) => [...arr].sort((a, b) => { const gy = s => parseInt(String(s).split(' ').pop()) || 0; const gm = s => String(s).split(' ')[0]; if (gy(a.monthYear || a.month) !== gy(b.monthYear || b.month)) return gy(a.monthYear || a.month) - gy(b.monthYear || b.month); return (monthOrder[gm(a.monthYear || a.month)] || 99) - (monthOrder[gm(b.monthYear || b.month)] || 99); });

  return (
    <AdminLayout>
      <div className="an-st-page">
        <div className="an-st-shell">
          <header className="an-st-top">
            <div className="an-st-top-row">
              <div>
                <h1 className="an-st-title">All Forms Averages</h1>
                <p className="an-st-sub">Cross-form performance comparison</p>
              </div>
              <Link to="/admin/analytics" className="an-st-back"><i className="fas fa-arrow-left" /><span>Back</span></Link>
            </div>
          </header>

          {isLoading ? (
            <div className="an-st-loading"><div className="an-st-spinner" /><span>Loading forms data...</span></div>
          ) : isError ? (
            <div className="an-ct-error"><i className="fas fa-exclamation-triangle" /><span>{error?.message || 'Failed to load'}</span><button onClick={() => refetch()} className="an-ct-retry">Retry</button></div>
          ) : processedData.length > 0 ? (
            <div className="an-st-perf-body">
              {/* Summary Cards */}
              <div className="an-ct-stats" style={{ gridTemplateColumns: `repeat(${Math.min(processedData.length, 6)}, 1fr)` }}>
                {processedData.map(f => (
                  <div key={f.level} className="an-ct-stat">
                    <span className="an-ct-stat-label">{f.level}</span>
                    <span className="an-ct-stat-val" style={{ color: FORM_COLORS[f.level]?.bg || '#3b82f6' }}>{f.overall_average.toFixed(1)}%</span>
                    <span className="an-ct-stat-label" style={{ fontSize: '0.6rem' }}>{f.overall_student_count} students</span>
                  </div>
                ))}
              </div>

              {/* Summary Table */}
              <div className="an-aft-card">
                <h3 className="an-aft-card-title">Overall Summary</h3>
                <div className="an-aft-table-wrap">
                  <table className="an-aft-table">
                    <thead><tr><th>Form</th><th>Average</th><th>Students</th></tr></thead>
                    <tbody>
                      {processedData.map(f => (
                        <tr key={f.level}>
                          <td><span className="an-aft-dot" style={{ background: FORM_COLORS[f.level]?.bg }} />{f.level}</td>
                          <td className="an-aft-bold">{f.overall_average.toFixed(1)}%</td>
                          <td>{f.overall_student_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly Trend per Form */}
              {processedData.filter(f => f.monthly_data.length > 0).map(f => {
                const sorted = sortMonths(f.monthly_data);
                return (
                  <div key={`trend-${f.level}`} className="an-st-chart-card">
                    <h4 className="an-st-chart-label">{f.level} — Monthly Trend</h4>
                    <div className="an-st-chart-wrap">
                      <Line data={{
                        labels: sorted.map(m => m.monthYear),
                        datasets: [{ label: f.level, data: sorted.map(m => m.average), borderColor: FORM_COLORS[f.level]?.bg || '#3b82f6', backgroundColor: FORM_COLORS[f.level]?.light || '#3b82f620', tension: 0.4, fill: true, pointRadius: isMobile ? 3 : 5, borderWidth: 2 }],
                      }} options={chartOpts('Month')} />
                    </div>
                  </div>
                );
              })}

              {/* Per-Form Monthly Subject Bar Charts */}
              {processedData.filter(f => f.subject_averages.length > 0).map(f => {
                const sorted = sortMonths(f.subject_averages);
                return sorted.map(m => {
                  if (!m.subjects || Object.keys(m.subjects).length === 0) return null;
                  const subjects = Object.keys(m.subjects).sort();
                  const avg = subjects.length > 0 ? subjects.reduce((s, k) => s + (m.subjects[k].average || 0), 0) / subjects.length : 0;
                  return (
                    <div key={`${f.level}-${m.monthYear}`} className="an-st-chart-card">
                      <h4 className="an-st-chart-label">{f.level} — {m.monthYear} <span style={{ fontWeight: 400, color: '#888', fontSize: '0.8rem' }}>(avg: {avg.toFixed(1)}%)</span></h4>
                      <div className="an-st-chart-wrap">
                        <Bar data={{
                          labels: subjects,
                          datasets: [{ label: 'Average', data: subjects.map(s => m.subjects[s].average || 0), backgroundColor: subjects.map((_, i) => SUBJECT_COLORS[i % SUBJECT_COLORS.length]), borderRadius: 4, borderWidth: 0 }],
                        }} options={{ ...chartOpts('Subject'), plugins: { ...chartOpts().plugins, legend: { display: false } } }} />
                      </div>
                    </div>
                  );
                });
              })}

              {/* Cross-Form Grouped Bar */}
              {processedData.some(f => f.monthly_data.length > 0) && (
                <div className="an-st-chart-card">
                  <h4 className="an-st-chart-label">Cross-Form Comparison</h4>
                  <div className="an-st-chart-wrap" style={{ height: isMobile ? 260 : 360 }}>
                    {(() => {
                      const allMY = new Set();
                      processedData.forEach(f => f.monthly_data.forEach(m => allMY.add(m.monthYear)));
                      const sortedMY = sortMonths(Array.from(allMY).map(my => ({ monthYear: my }))).map(m => m.monthYear);
                      return (
                        <Bar data={{
                          labels: sortedMY.length > 0 ? sortedMY : ['No Data'],
                          datasets: processedData.map(f => {
                            const map = {};
                            f.monthly_data.forEach(m => { map[m.monthYear] = m.average; });
                            return {
                              label: f.level,
                              data: sortedMY.length > 0 ? sortedMY.map(my => map[my] || null) : [null],
                              backgroundColor: FORM_COLORS[f.level]?.bg || '#888',
                              borderRadius: 3, borderWidth: 0,
                            };
                          }),
                        }} options={chartOpts('Month')} />
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Student Distribution Doughnut */}
              {processedData.some(f => f.overall_student_count > 0) && (
                <div className="an-st-chart-card">
                  <h4 className="an-st-chart-label">Student Distribution</h4>
                  <div className="an-st-chart-wrap" style={{ height: isMobile ? 250 : 320, maxWidth: 500, margin: '0 auto' }}>
                    <Doughnut data={{
                      labels: processedData.map(f => f.level),
                      datasets: [{ data: processedData.map(f => f.overall_student_count || 0), backgroundColor: processedData.map(f => FORM_COLORS[f.level]?.bg || '#888'), borderWidth: 2 }],
                    }} options={getDoughnutOpts()} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="an-ct-empty"><i className="fas fa-chart-bar" /><span>No performance data available for comparison</span></div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AllFormsAverages;
