/**
 * Student Track - Individual Student Performance Tracking
 */
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import { analyticsAPI } from '../../services/analytics';
import { Bar, Line } from 'react-chartjs-2';
import '../../utils/chartConfig'; // Register Chart.js components
import { normalizeFormLabel } from '../../utils/analyticsUtils';
import './AnalyticsTrack.css';

const StudentTrack = () => {
  const { form } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const formLabel = normalizeFormLabel(form);

  // Search students
  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ['student-search', searchQuery, formLabel],
    queryFn: async () => {
      if (searchQuery.length < 3) return [];
      const res = await analyticsAPI.searchStudents(searchQuery, formLabel);
      return res.data.students || [];
    },
    enabled: searchQuery.length >= 3 && !!formLabel,
  });

  // Get student performance
  const { data: performanceData, isLoading: loadingPerformance, error: _performanceError, isError: _isPerformanceError, refetch: _refetchPerformance } = useQuery({
    queryKey: ['student-performance', selectedStudent?.adm_no, formLabel],
    queryFn: async () => {
      if (!selectedStudent) return null;
      const res = await analyticsAPI.getStudentPerformance(selectedStudent.adm_no, {
        form: formLabel,
        stream: selectedStudent.stream,
        year: selectedStudent.year,
      });
      if (!res.data) {
        throw new Error('No data received from server');
      }
      return res.data;
    },
    enabled: !!selectedStudent,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setSearchQuery('');
  };

  return (
    <AdminLayout>
      <div className="analytics-track-page">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-user-graduate"></i>
            Student Track - {formLabel}
            <div className="header-actions">
              <Link to={`/admin/analytics/${form}`} className="excel-btn secondary small">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            <div className="student-search-section">
              <h3>Search Student</h3>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter student name or admission number (min 3 characters)..."
                  className="search-input"
                />
                {searching && <i className="fas fa-spinner fa-spin search-spinner"></i>}
              </div>

              {searchQuery.length >= 3 && searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((student) => {
                    // Construct name if not provided
                    const studentName = student.name || 
                      `${student.first_name || ''} ${student.middle_name || ''} ${student.surname || ''}`.trim() ||
                      'Unknown Student';
                    
                    return (
                      <div
                        key={`${student.adm_no}-${student.level}-${student.stream}-${student.year}`}
                        className="search-result-item"
                        onClick={() => handleStudentSelect(student)}
                      >
                        <div className="student-info">
                          <strong>{studentName}</strong>
                          <span className="student-adm">Adm: {student.adm_no}</span>
                          <span className="student-class">{student.level} {student.stream} {student.year}</span>
                        </div>
                        <i className="fas fa-chevron-right"></i>
                      </div>
                    );
                  })}
                </div>
              )}

              {searchQuery.length >= 3 && !searching && searchResults && searchResults.length === 0 && (
                <div className="no-results">No students found</div>
              )}
              
              {searchQuery.length >= 3 && searching && (
                <div className="no-results">Searching...</div>
              )}
            </div>

            {selectedStudent && (
              <div className="performance-section">
                <h3>
                  Performance: {selectedStudent.name} ({selectedStudent.adm_no})
                </h3>
                
                {loadingPerformance ? (
                  <div className="loading-state">Loading performance data...</div>
                ) : performanceData ? (
                  <div className="performance-data">
                    <div className="performance-summary">
                      <div className="summary-card">
                        <h4>Subject Averages</h4>
                        <div className="subject-list">
                          {Object.entries(performanceData.subject_averages || {}).map(([subject, avg]) => (
                            <div key={subject} className="subject-item">
                              <span className="subject-name">{subject}</span>
                              <span className="subject-avg">{avg.toFixed(1)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {performanceData.scores_by_month && Object.keys(performanceData.scores_by_month).length > 0 && (
                      <div className="charts-section">
                        <h3 className="section-title">Performance Charts</h3>
                        
                        {/* Subject Averages Bar Chart */}
                        {performanceData.subject_averages && Object.keys(performanceData.subject_averages).length > 0 && (
                          <div className="chart-container">
                            <h4 className="chart-title">Subject Average Scores</h4>
                            <div className="chart-wrapper">
                              <Bar
                              data={{
                                labels: Object.keys(performanceData.subject_averages),
                                datasets: [
                                  {
                                    label: 'Average Score',
                                    data: Object.values(performanceData.subject_averages),
                                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    borderWidth: 2,
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                layout: {
                                  padding: {
                                    bottom: 20,
                                    top: 10,
                                    left: 10,
                                    right: 10
                                  }
                                },
                                plugins: {
                                  legend: {
                                    display: true,
                                    position: 'top',
                                  },
                                  tooltip: {
                                    callbacks: {
                                      label: function(context) {
                                        return `Average: ${context.parsed.y.toFixed(1)}`;
                                      },
                                    },
                                  },
                                  annotation: {
                                    annotations: {
                                      line55: {
                                        type: 'line',
                                        yMin: 55,
                                        yMax: 55,
                                        borderColor: 'red',
                                        borderWidth: 2,
                                        borderDash: [5, 5],
                                        label: {
                                          display: true,
                                          content: '55%',
                                          position: 'end',
                                          backgroundColor: 'red',
                                          color: 'white',
                                          font: {
                                            size: 12,
                                            weight: 'bold'
                                          }
                                        }
                                      }
                                    }
                                  },
                                },
                                scales: {
                                  y: {
                                    beginAtZero: true,
                                    max: 100,
                                    title: {
                                      display: true,
                                      text: 'Average Score',
                                    },
                                  },
                                  x: {
                                    title: {
                                      display: true,
                                      text: 'Subject',
                                    },
                                    ticks: {
                                      maxRotation: 45,
                                      minRotation: 0,
                                    },
                                  },
                                },
                              }}
                            />
                            </div>
                          </div>
                        )}

                        {/* Monthly Performance Line Chart */}
                        {performanceData.scores_by_month && Object.keys(performanceData.scores_by_month).length > 0 && (
                          <div className="chart-container">
                            <h4 className="chart-title">Performance by Month</h4>
                            <div className="chart-wrapper">
                              <Line
                              data={{
                                labels: Object.keys(performanceData.scores_by_month).sort((a, b) => {
                                  // Sort by year first, then by month order
                                  const monthOrder = { 'Jrb1': 1, 'Robo': 2, 'Jrb2': 3, 'Nusu': 4, 'Muh': 5 };
                                  const getYear = (str) => parseInt(str.split(' ').pop()) || 0;
                                  const getMonth = (str) => str.split(' ')[0];
                                  const yearA = getYear(a), yearB = getYear(b);
                                  if (yearA !== yearB) return yearA - yearB;
                                  return (monthOrder[getMonth(a)] || 99) - (monthOrder[getMonth(b)] || 99);
                                }),
                                datasets: Object.keys(performanceData.scores_by_month[Object.keys(performanceData.scores_by_month)[0]] || {}).map((subject, idx) => {
                                  const colors = [
                                    'rgba(75, 192, 192, 1)',
                                    'rgba(54, 162, 235, 1)',
                                    'rgba(255, 206, 86, 1)',
                                    'rgba(255, 99, 132, 1)',
                                    'rgba(153, 102, 255, 1)',
                                  ];
                                  return {
                                    label: subject,
                                    data: Object.keys(performanceData.scores_by_month).sort((a, b) => {
                                      const monthOrder = { 'Jrb1': 1, 'Robo': 2, 'Jrb2': 3, 'Nusu': 4, 'Muh': 5 };
                                      const getYear = (str) => parseInt(str.split(' ').pop()) || 0;
                                      const getMonth = (str) => str.split(' ')[0];
                                      const yearA = getYear(a), yearB = getYear(b);
                                      if (yearA !== yearB) return yearA - yearB;
                                      return (monthOrder[getMonth(a)] || 99) - (monthOrder[getMonth(b)] || 99);
                                    }).map(monthYear => 
                                      performanceData.scores_by_month[monthYear][subject] || 0
                                    ),
                                    borderColor: colors[idx % colors.length],
                                    backgroundColor: colors[idx % colors.length].replace('1)', '0.2)'),
                                    tension: 0.4,
                                    fill: false,
                                    pointRadius: 5,
                                    pointHoverRadius: 7,
                                  };
                                }),
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                layout: {
                                  padding: {
                                    bottom: 20,
                                    top: 10,
                                    left: 10,
                                    right: 10
                                  }
                                },
                                plugins: {
                                  legend: {
                                    display: true,
                                    position: 'top',
                                  },
                                  tooltip: {
                                    callbacks: {
                                      label: function(context) {
                                        return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`;
                                      },
                                    },
                                  },
                                  annotation: {
                                    annotations: {
                                      line55: {
                                        type: 'line',
                                        yMin: 55,
                                        yMax: 55,
                                        borderColor: 'red',
                                        borderWidth: 2,
                                        borderDash: [5, 5],
                                        label: {
                                          display: true,
                                          content: '55%',
                                          position: 'end',
                                          backgroundColor: 'red',
                                          color: 'white',
                                          font: {
                                            size: 12,
                                            weight: 'bold'
                                          }
                                        }
                                      }
                                    }
                                  },
                                },
                                scales: {
                                  y: {
                                    beginAtZero: true,
                                    max: 100,
                                    title: {
                                      display: true,
                                      text: 'Score',
                                    },
                                  },
                                  x: {
                                    title: {
                                      display: true,
                                      text: 'Month & Year',
                                    },
                                    ticks: {
                                      maxRotation: 45,
                                      minRotation: 45,
                                    },
                                  },
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
                  <div className="no-data">No performance data available</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StudentTrack;

