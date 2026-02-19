/**
 * Student Dashboard - View Monthly Results
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import PublicLayout from '../../components/layout/PublicLayout';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { publicAPI } from '../../services/public';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [viewMode, setViewMode] = useState('select'); // 'select' or 'results'

  useEffect(() => {
    // Get student data from sessionStorage
    const stored = sessionStorage.getItem('studentData');
    if (!stored) {
      toast.error('Please login first');
      navigate('/student-login');
      return;
    }
    setStudentData(JSON.parse(stored));
  }, [navigate]);

  // Get available months and terms
  const { data: monthsData, isLoading: monthsLoading } = useQuery({
    queryKey: ['student-months', studentData?.adm_no, studentData?.year],
    queryFn: async () => {
      const res = await publicAPI.getStudentMonths(studentData.adm_no, studentData.year);
      return {
        months: res.data.months || [],
        terms: res.data.terms || []
      };
    },
    enabled: !!studentData,
  });

  // Get results for selected month
  const { data: resultsData, isLoading: resultsLoading } = useQuery({
    queryKey: ['student-results', studentData?.adm_no, selectedMonth, studentData?.year],
    queryFn: async () => {
      const res = await publicAPI.getStudentResults(studentData.adm_no, selectedMonth, studentData.year);
      return res.data;
    },
    enabled: !!studentData && !!selectedMonth,
  });

  // Get student photo
  const { data: photoData } = useQuery({
    queryKey: ['student-photo', studentData?.adm_no, studentData?.level, studentData?.stream, studentData?.year],
    queryFn: async () => {
      const res = await publicAPI.getStudentPhoto(
        studentData.adm_no,
        studentData.level,
        studentData.stream,
        studentData.year
      );
      return res.data;
    },
    enabled: !!studentData && !!studentData.level && !!studentData.stream && !!studentData.year,
  });

  // Helper function to get photo URL
  const getPhotoUrl = (filename) => {
    if (!filename) return null;
    // In development, use relative URL (Vite proxy handles it)
    if (import.meta.env.DEV) {
      return `/static/uploads/photos/${filename}`;
    }
    // Production: use VITE_API_URL if available
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      const baseUrl = apiUrl.replace('/api', '');
      return `${baseUrl}/static/uploads/photos/${filename}`;
    }
    return `/static/uploads/photos/${filename}`;
  };

  const handleLogout = () => {
    sessionStorage.removeItem('studentData');
    navigate('/student-login');
  };

  const handleViewResults = (month) => {
    setSelectedMonth(month);
    setViewMode('results');
  };

  const handleBackToMonths = () => {
    setViewMode('select');
    setSelectedMonth(null);
  };

  if (!studentData) {
    return (
      <PublicLayout>
        <div className="student-dashboard">
          <div className="dashboard-container">
            <SkeletonLoader type="card" height="80px" className="mb-3" />
            <SkeletonLoader type="text" lines={2} className="mb-3" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonLoader key={i} type="card" height="100px" />
              ))}
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="student-dashboard">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <div className="student-info">
              <div className="student-avatar">
                {photoData?.photo?.photo_filename && (
                  <img 
                    src={getPhotoUrl(photoData.photo.photo_filename)} 
                    alt={studentData.name}
                    className="student-photo"
                    width={64}
                    height={64}
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      e.target.style.display = 'none';
                      const icon = e.target.parentElement.querySelector('.avatar-icon');
                      if (icon) icon.style.display = 'flex';
                    }}
                    onLoad={(e) => {
                      // Hide icon when photo loads successfully
                      e.target.style.display = 'block';
                      const icon = e.target.parentElement.querySelector('.avatar-icon');
                      if (icon) icon.style.display = 'none';
                    }}
                  />
                )}
                <i className="fas fa-user-circle avatar-icon" style={{ display: photoData?.photo?.photo_filename ? 'none' : 'flex' }}></i>
              </div>
              <div className="student-details">
                <h2>Welcome, {studentData.name}</h2>
                <div className="student-meta">
                  <span><i className="fas fa-graduation-cap"></i> {studentData.level}</span>
                  <span><i className="fas fa-layer-group"></i> Stream {studentData.stream}</span>
                  <span><i className="fas fa-calendar"></i> Year {studentData.year}</span>
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-button">
              <i className="fas fa-power-off"></i> Logout
            </button>
          </div>

          {viewMode === 'select' ? (
            <div className="months-selection">
              <div className="section-header">
                <div className="section-title-group centered">
                  <div className="section-icon-wrapper">
                    <i className="fas fa-calendar-check"></i>
                  </div>
                  <div>
                    <h3>View Monthly Results</h3>
                    <p className="section-description">
                      Select a month to view your results and recommendations
                    </p>
                  </div>
                </div>
              </div>

              {monthsLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonLoader key={i} type="card" height="100px" />
                  ))}
                </div>
              ) : !monthsData || ((!monthsData.months || monthsData.months.length === 0) && (!monthsData.terms || monthsData.terms.length === 0)) ? (
                <div className="empty-state">
                  <i className="fas fa-calendar-times"></i>
                  <h4>No Results Available</h4>
                  <p>No monthly results or assessments found for your account. Please contact the school administration.</p>
                </div>
              ) : (
                <>
                  {/* Monthly Results */}
                  {monthsData.months && monthsData.months.length > 0 && (
                    <div className="section-group">
                      <div className="section-subtitle">
                        <i className="fas fa-file-chart-line"></i>
                        <span>Monthly Academic Results</span>
                      </div>
                      <div className="months-grid">
                        {monthsData.months.map((monthData, index) => (
                          <div 
                            key={`month-${index}`} 
                            className="month-card"
                            onClick={() => handleViewResults(monthData.month)}
                          >
                            <div className="month-icon">
                              <i className="fas fa-calendar-check"></i>
                            </div>
                            <div className="month-info">
                              <h4>{monthData.month}</h4>
                              <p><i className="fas fa-calendar-days"></i> Year {monthData.year}</p>
                            </div>
                            <div className="month-action">
                              <i className="fas fa-arrow-right"></i>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </>
              )}
            </div>
          ) : (
            <div className="results-view">
              <button onClick={handleBackToMonths} className="back-button">
                <i className="fas fa-arrow-left"></i> Back to Months
              </button>

              <div className="results-header">
                <div className="results-title-group centered">
                  <div className="results-icon-wrapper">
                    <i className="fas fa-trophy"></i>
                  </div>
                  <div>
                    <h3>Results for {selectedMonth} {studentData.year}</h3>
                    <p className="results-subtitle">Your academic performance overview</p>
                  </div>
                </div>
              </div>

              {resultsLoading ? (
                <div className="results-skeleton">
                  <SkeletonLoader type="text" lines={2} className="mb-3" />
                  <SkeletonLoader type="table" />
                </div>
              ) : resultsData ? (
                <>
                  {/* Summary Card */}
                  <div className="summary-card">
                    <div className="summary-item">
                      <div className="summary-icon">
                        <i className="fas fa-star"></i>
                      </div>
                      <div className="summary-content">
                        <span className="summary-label">Overall Total</span>
                        <span className="summary-value">{resultsData.summary?.totalScore?.toFixed(1) || '0.0'}</span>
                      </div>
                    </div>
                    <div className="summary-item">
                      <div className="summary-icon">
                        <i className="fas fa-percent"></i>
                      </div>
                      <div className="summary-content">
                        <span className="summary-label">Overall Average</span>
                        <span className="summary-value">{resultsData.summary?.average?.toFixed(1) || '0.0'}%</span>
                      </div>
                    </div>
                    <div className="summary-item">
                      <div className="summary-icon">
                        <i className="fas fa-award"></i>
                      </div>
                      <div className="summary-content">
                        <span className="summary-label">Overall Grade</span>
                        <span className="summary-value">
                          {resultsData.summary?.grade ? (
                            <span className={`grade-badge grade-${resultsData.summary.grade}`}>
                              {resultsData.summary.grade}
                            </span>
                          ) : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="summary-item">
                      <div className="summary-icon">
                        <i className="fas fa-trophy"></i>
                      </div>
                      <div className="summary-content">
                        <span className="summary-label">Overall Position</span>
                        <span className="summary-value">
                          {resultsData.summary?.position ? (
                            <>
                              {resultsData.summary.position}
                              {resultsData.summary.position === 1 ? 'st' : 
                               resultsData.summary.position === 2 ? 'nd' : 
                               resultsData.summary.position === 3 ? 'rd' : 'th'}
                              {resultsData.summary?.totalStudents && ` / ${resultsData.summary.totalStudents}`}
                            </>
                          ) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Results Table */}
                  {resultsData.results && resultsData.results.length > 0 ? (
                    <>
                      <div className="results-table-container">
                        <table className="results-table">
                          <thead>
                            <tr>
                              <th>Subject</th>
                              <th>Total</th>
                              <th>Grade</th>
                              <th>Rank</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultsData.results.map((result, index) => (
                              <tr key={index}>
                                <td>{result.subject_code}</td>
                                <td>{parseFloat(result.total || 0).toFixed(1)}</td>
                                <td>
                                  <span className={`grade-badge grade-${result.grade}`}>
                                    {result.grade}
                                  </span>
                                </td>
                                <td>{result.rank || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                    </>
                  ) : (
                    <div className="empty-state">
                      <i className="fas fa-info-circle"></i>
                      <p>No results found for this month</p>
                    </div>
                  )}

                </>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-exclamation-circle"></i>
                  <p>Unable to load results. Please try again later.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default StudentDashboard;

