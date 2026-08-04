import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import { analyticsAPI } from '../../services/analytics';
import { Bar, Line } from 'react-chartjs-2';
import '../../utils/chartConfig';
import { normalizeFormLabel } from '../../utils/analyticsUtils';
import './AnalyticsTrack.css';

const StudentTrack = () => {
  const { form } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const formLabel = normalizeFormLabel(form);

  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ['student-search', searchQuery, formLabel],
    queryFn: async () => {
      if (searchQuery.length < 3) return [];
      const res = await analyticsAPI.searchStudents(searchQuery, formLabel);
      return res.data.students || [];
    },
    enabled: searchQuery.length >= 3 && !!formLabel,
  });

  const { data: performanceData, isLoading: loadingPerformance } = useQuery({
    queryKey: ['student-performance', selectedStudent?.adm_no, formLabel],
    queryFn: async () => {
      if (!selectedStudent) return null;
      const res = await analyticsAPI.getStudentPerformance(selectedStudent.adm_no, {
        form: formLabel,
        stream: selectedStudent.stream,
        year: selectedStudent.year,
      });
      return res.data;
    },
    enabled: !!selectedStudent,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
      return failureCount < 2;
    },
  });

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setSearchQuery('');
  };

  return (
    <AdminLayout>
      <div className="an-st-page">
        <div className="an-st-shell">
          <header className="an-st-top">
            <div className="an-st-top-row">
              <div>
                <h1 className="an-st-title">Student Track</h1>
                <p className="an-st-sub">{formLabel}</p>
              </div>
              <Link to={`/admin/analytics/${form}`} className="an-st-back">
                <i className="fas fa-arrow-left" />
                <span>Back</span>
              </Link>
            </div>
          </header>

          {/* Search */}
          <div className="an-st-search">
            <div className="an-st-search-wrap">
              <i className="fas fa-search an-st-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or admission number..."
                className="an-st-search-input"
              />
              {searching && <i className="fas fa-spinner fa-spin an-st-search-spinner" />}
            </div>

            {searchQuery.length >= 3 && searchResults.length > 0 && (
              <div className="an-st-results">
                {searchResults.map((s) => {
                  const name = s.name || `${s.first_name || ''} ${s.middle_name || ''} ${s.surname || ''}`.trim() || 'Unknown';
                  return (
                    <button
                      key={`${s.adm_no}-${s.level}-${s.stream}-${s.year}`}
                      className="an-st-result"
                      onClick={() => handleStudentSelect(s)}
                      type="button"
                    >
                      <div className="an-st-result-info">
                        <span className="an-st-result-name">{name}</span>
                        <span className="an-st-result-meta">Adm: {s.adm_no} &middot; {s.level} {s.stream}</span>
                      </div>
                      <i className="fas fa-chevron-right an-st-result-arrow" />
                    </button>
                  );
                })}
              </div>
            )}

            {searchQuery.length >= 3 && !searching && searchResults.length === 0 && (
              <div className="an-st-empty-hint">No students found</div>
            )}
          </div>

          {/* Performance */}
          {selectedStudent && (
            <div className="an-st-perf">
              <div className="an-st-perf-header">
                <div className="an-st-perf-avatar">
                  <i className="fas fa-user-graduate" />
                </div>
                <div>
                  <h2 className="an-st-perf-name">{selectedStudent.name}</h2>
                  <p className="an-st-perf-meta">Adm: {selectedStudent.adm_no} &middot; {selectedStudent.level} {selectedStudent.stream}</p>
                </div>
              </div>

              {loadingPerformance ? (
                <div className="an-st-loading">
                  <div className="an-st-spinner" />
                  <span>Loading performance data...</span>
                </div>
              ) : performanceData ? (
                <div className="an-st-perf-body">
                  {/* Subject Averages */}
                  {performanceData.subject_averages && Object.keys(performanceData.subject_averages).length > 0 && (
                    <div className="an-st-section">
                      <h3 className="an-st-section-title">Subject Averages</h3>
                      <div className="an-st-subject-grid">
                        {Object.entries(performanceData.subject_averages).map(([subject, avg]) => (
                          <div key={subject} className="an-st-subject-chip">
                            <span className="an-st-subject-name">{subject}</span>
                            <span className="an-st-subject-val">{avg.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Charts */}
                  {performanceData.scores_by_month && Object.keys(performanceData.scores_by_month).length > 0 && (
                    <div className="an-st-section">
                      <h3 className="an-st-section-title">Performance Charts</h3>

                      {/* Bar Chart */}
                      {performanceData.subject_averages && Object.keys(performanceData.subject_averages).length > 0 && (
                        <div className="an-st-chart-card">
                          <h4 className="an-st-chart-label">Subject Average Scores</h4>
                          <div className="an-st-chart-wrap">
                            <Bar
                              data={{
                                labels: Object.keys(performanceData.subject_averages),
                                datasets: [{
                                  label: 'Average Score',
                                  data: Object.values(performanceData.subject_averages),
                                  backgroundColor: 'rgba(59,130,246,0.6)',
                                  borderColor: 'rgba(59,130,246,1)',
                                  borderWidth: 2,
                                  borderRadius: 4,
                                }],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                  y: { beginAtZero: true, max: 100, title: { display: true, text: 'Score' } },
                                  x: { title: { display: true, text: 'Subject' }, ticks: { maxRotation: 45 } },
                                },
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Line Chart */}
                      {performanceData.scores_by_month && Object.keys(performanceData.scores_by_month).length > 0 && (
                        <div className="an-st-chart-card">
                          <h4 className="an-st-chart-label">Performance by Month</h4>
                          <div className="an-st-chart-wrap">
                            <Line
                              data={{
                                labels: Object.keys(performanceData.scores_by_month).sort((a, b) => {
                                  const mo = { 'Jrb1': 1, 'Robo': 2, 'Jrb2': 3, 'Nusu': 4, 'Muh': 5 };
                                  const gy = (s) => parseInt(s.split(' ').pop()) || 0;
                                  const gm = (s) => s.split(' ')[0];
                                  if (gy(a) !== gy(b)) return gy(a) - gy(b);
                                  return (mo[gm(a)] || 99) - (mo[gm(b)] || 99);
                                }),
                                datasets: Object.keys(performanceData.scores_by_month[Object.keys(performanceData.scores_by_month)[0]] || {}).map((subject, idx) => {
                                  const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];
                                  return {
                                    label: subject,
                                    data: Object.keys(performanceData.scores_by_month).sort((a, b) => {
                                      const mo = { 'Jrb1': 1, 'Robo': 2, 'Jrb2': 3, 'Nusu': 4, 'Muh': 5 };
                                      const gy = (s) => parseInt(s.split(' ').pop()) || 0;
                                      const gm = (s) => s.split(' ')[0];
                                      if (gy(a) !== gy(b)) return gy(a) - gy(b);
                                      return (mo[gm(a)] || 99) - (mo[gm(b)] || 99);
                                    }).map(m => performanceData.scores_by_month[m][subject] || 0),
                                    borderColor: colors[idx % colors.length],
                                    backgroundColor: colors[idx % colors.length] + '20',
                                    tension: 0.4,
                                    fill: false,
                                    pointRadius: 4,
                                    pointHoverRadius: 6,
                                  };
                                }),
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: true, position: 'top' } },
                                scales: {
                                  y: { beginAtZero: true, max: 100, title: { display: true, text: 'Score' } },
                                  x: { title: { display: true, text: 'Month & Year' }, ticks: { maxRotation: 45, minRotation: 45 } },
                                },
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="an-st-no-data">
                  <i className="fas fa-chart-line" />
                  <span>No performance data available</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default StudentTrack;
