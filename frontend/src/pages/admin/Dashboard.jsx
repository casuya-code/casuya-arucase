import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role && ['admin', 'superadmin', 'rector', 'vice_rector', 'academic_master'].includes(user.role);

  // Fetch dashboard statistics (only when user is set to avoid 401 on auth redirect)
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard/stats');
      return response.data;
    },
    enabled: !!user, // Don't fetch until authenticated (avoids 401 in console when redirecting)
    refetchOnWindowFocus: false,
    staleTime: 60000, // Cache for 1 minute
    retry: (failureCount, err) => err?.response?.status !== 401 && failureCount < 1,
  });

  const stats = dashboardData?.stats || {};
  const userPermissions = (() => {
    const p = user?.permissions;
    if (!p) return { modules: [] };
    if (typeof p === 'string') {
      try { return JSON.parse(p); } catch { return { modules: [] }; }
    }
    return Array.isArray(p?.modules) ? p : { ...p, modules: p?.modules || [] };
  })();

  // Module guidelines for non-admin users
  const moduleGuidelines = [
    { module: 'student_registration', icon: 'fa-user-plus', title: 'Student Registration', description: 'Register new students accurately. Enter complete information including names, forms, streams, and registration numbers. Verify all data before saving.' },
    { module: 'student_photo', icon: 'fa-camera', title: 'Student Photo', description: 'Upload clear, passport-size student photos. Ensure proper lighting and professional appearance. Photos are used in reports and official documents.' },
    { module: 'student_parishes', icon: 'fa-place-of-worship', title: 'Student Parishes', description: 'Assign students to their respective parishes. Maintain accurate parish records for spiritual guidance and communication with home parishes.' },
    { module: 'subjects', icon: 'fa-book', title: 'Subjects', description: 'Manage subject configurations for different form levels. Ensure all required subjects are properly set up for academic tracking and reporting.' },
    { module: 'individual_scores', icon: 'fa-graduation-cap', title: 'Individual Subject Score', description: 'Enter student scores accurately for each subject. Double-check marks before saving. These scores directly affect student reports and academic standing.' },
    { module: 'subject_teachers', icon: 'fa-chalkboard-teacher', title: 'Subject Teachers', description: 'Assign teachers to their subjects and classes. Maintain current teaching assignments to ensure proper responsibility tracking.' },
    { module: 'marks_config', icon: 'fa-calendar-alt', title: 'Month Selection & Marks Config', description: 'Configure monthly assessment periods and grading criteria. Set up marking schemes to maintain consistent evaluation standards across all forms.' },
    { module: 'sala_comments', icon: 'fa-comments', title: 'Sala Comments', description: 'Provide meaningful feedback on students\' prayer life and spiritual participation. Be constructive, encouraging, and specific in your observations.' },
    { module: 'huduma_comments', icon: 'fa-hands-helping', title: 'Huduma', description: 'Evaluate students\' service to the community. Comment on their willingness to help, teamwork, and contribution to school activities.' },
    { module: 'tabia_comments', icon: 'fa-user-check', title: 'Tabia Comments', description: 'Assess students\' behavior and character. Provide honest, fair comments that help students grow morally and socially.' },
    { module: 'michezo_comments', icon: 'fa-running', title: 'Michezo Comments', description: 'Comment on students\' sports and physical activities participation. Recognize athletic achievements and encourage active, healthy lifestyles.' },
    { module: 'mwalimu_taaluma_comments', icon: 'fa-user-graduate', title: 'Mwalimu wa Taaluma Comments', description: 'As the academic teacher, provide brief, specific academic guidance. Focus on study habits, class participation, and areas for improvement.' },
    { module: 'mkuu_shule_comments', icon: 'fa-crown', title: 'Mkuu wa Shule Comments', description: 'As headmaster, provide overall assessment and direction. Offer balanced, authoritative guidance that considers all aspects of student development.' },
    { module: 'taaluma_comments', icon: 'fa-book-open', title: 'Taaluma Comments', description: 'Provide comprehensive academic feedback. Comment on intellectual growth, academic strengths, and areas requiring focused attention.' },
    { module: 'tabia_mwenendo_comments', icon: 'fa-balance-scale', title: 'Tabia na Mwenendo', description: 'Evaluate behavior and conduct comprehensively. Use the rating system consistently: A (Excellent), B (Good), C (Satisfactory), D (Needs Improvement).' },
    { module: 'monthly_results', icon: 'fa-clipboard-list', title: 'Arucase Monthly Results', description: 'Enter and review monthly academic results. Ensure all assessments are recorded promptly and accurately for timely student progress tracking.' },
    { module: 'individual_debt', icon: 'fa-money-bill-wave', title: 'Individual Debt', description: 'Track student fee payments and outstanding balances. Handle financial information with confidentiality and sensitivity.' },
    { module: 'individual_report', icon: 'fa-file-alt', title: 'Individual Student Report', description: 'Generate comprehensive student report cards. Review all information before printing. Reports represent the school\'s official assessment.' },
    { module: 'bulk_report', icon: 'fa-copy', title: 'Student Bulk Report', description: 'Generate reports for entire classes efficiently. Verify that all student data is complete before bulk generation to avoid incomplete reports.' },
    { module: 'news_announcements', icon: 'fa-newspaper', title: 'News & Announcements', description: 'Post important school news and public announcements. Write clearly and professionally as these are visible to parents and the public.' },
    { module: 'fees_announcements', icon: 'fa-money-bill-wave', title: 'Fees Announcements', description: 'Communicate fee-related information to students and parents. Be clear about amounts, deadlines, and payment methods.' },
  ];

  // Filter guidelines based on user permissions
  const availableGuidelines = moduleGuidelines.filter(guideline => 
    userPermissions.modules?.includes(guideline.module)
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="dashboard-loading">
          <SkeletonLoader type="text" lines={1} width="50%" height="2rem" className="mb-3" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonLoader key={i} type="card" height="90px" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="dashboard-error">
          <i className="fas fa-exclamation-triangle"></i>
          <p>Error loading dashboard: {error.message}</p>
        </div>
      </AdminLayout>
    );
  }

  // Non-Admin Dashboard (Teachers, etc.)
  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="teacher-dashboard-container">
          <div className="sky-background">
            <div className="welcome-overlay">
              <h1 className="welcome-title">Welcome, {user?.full_name || user?.username}!</h1>
              <p className="welcome-subtitle">Your dedicated workspace for managing student excellence</p>
            </div>
          </div>
          
          <div className="guidelines-section">
            <h2 className="guidelines-header">
              <i className="fas fa-compass" aria-hidden="true"></i> Your Responsibilities & Guidelines
            </h2>
            <p className="guidelines-intro">
              Click on any sidebar menu item to perform your assigned duties. Here are helpful guidelines for each module:
            </p>
            
            <div className="guidelines-grid">
              {availableGuidelines.length > 0 ? (
                availableGuidelines.map((guideline, index) => (
                  <div key={index} className="guideline-card">
                    <div className="guideline-icon">
                      <i className={`fas ${guideline.icon}`} aria-hidden="true"></i>
                    </div>
                    <h3>{guideline.title}</h3>
                    <p>{guideline.description}</p>
                  </div>
                ))
              ) : (
                <div className="guideline-card">
                  <div className="guideline-icon">
                    <i className="fas fa-info-circle" aria-hidden="true"></i>
                  </div>
                  <h3>No Modules Assigned</h3>
                  <p>Contact your administrator to assign modules to your account.</p>
                </div>
              )}
            </div>
            
            <div className="guidelines-footer">
              <p>
                <i className="fas fa-lightbulb"></i> <strong>Reminder:</strong> Always save your work regularly and verify data accuracy before submission. For assistance, contact the system administrator.
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Admin Dashboard
  return (
    <AdminLayout>
      <div className="dashboard-layout">
        {/* Welcome Section */}
        <div className="welcome-header">
          <div className="welcome-header-content">
            <div className="welcome-text">
              <h2>
                <i className="fas fa-graduation-cap" aria-hidden="true"></i> Welcome
              </h2>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="dashboard-main-grid">
          {/* Left Column: Statistics */}
          <div className="dashboard-left-column">
            {/* Student Statistics Section */}
            <div className="dashboard-section">
              <h3 className="section-title">
                <i className="fas fa-users" aria-hidden="true"></i> Student Statistics
              </h3>
              {/* Per-year cards: 2025=56, 2026=55, ... */}
              {(stats.students_by_year && stats.students_by_year.length > 0) && (
                <div className="stats-year-row">
                  <div className="stats-grid stats-grid-years">
                    {stats.students_by_year.map(({ year, count }) => (
                      <div key={year} className="stat-card stat-card-year">
                        <div className="stat-number stat-number-year">{year}</div>
                        <div className="stat-number stat-number-year-value">{count}</div>
                        <div className="stat-label">Students</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="stats-grid stats-grid-students">
                <div className="stat-card stat-card-primary stat-card-featured">
                  <div className="stat-card-header">
                    <div className="stat-icon stat-icon-primary">
                      <i className="fas fa-users" aria-hidden="true"></i>
                    </div>
                    <div className="stat-trend">
                      <i className="fas fa-chart-line" aria-hidden="true"></i>
                    </div>
                  </div>
                  <div className="stat-number stat-number-primary">{stats.total_students || 0}</div>
                  <div className="stat-label">Total Students</div>
                  <div className="stat-description">Across all forms</div>
                </div>
                
                {['I', 'II', 'III', 'IV', 'V', 'VI'].map((form) => {
                  const formKey = `form_${form.toLowerCase()}_students`;
                  const count = stats[formKey] || 0;
                  const percentage = stats.total_students > 0 
                    ? ((count / stats.total_students) * 100).toFixed(1) 
                    : 0;
                  
                  return (
                    <div key={form} className="stat-card stat-card-student">
                      <div className="stat-icon">
                        <i className="fas fa-user-graduate" aria-hidden="true"></i>
                      </div>
                      <div className="stat-number">{count}</div>
                      <div className="stat-label">Form {form}</div>
                      {stats.total_students > 0 && (
                        <div className="stat-progress">
                          <div 
                            className="stat-progress-bar" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Academic Statistics Section */}
            <div className="dashboard-section">
              <h3 className="section-title">
                <i className="fas fa-book" aria-hidden="true"></i> Academic Statistics
              </h3>
              <div className="stats-grid stats-grid-academic">
                <div className="stat-card stat-card-academic">
                  <div className="stat-icon stat-icon-academic">
                    <i className="fas fa-book-open" aria-hidden="true"></i>
                  </div>
                  <div className="stat-number">{stats.total_subjects || 0}</div>
                  <div className="stat-label">Total Subjects</div>
                </div>
                
                <div className="stat-card stat-card-academic">
                  <div className="stat-icon stat-icon-academic">
                    <i className="fas fa-camera" aria-hidden="true"></i>
                  </div>
                  <div className="stat-number">{stats.total_photos || 0}</div>
                  <div className="stat-label">Photos Uploaded</div>
                  {stats.total_students > 0 && (
                    <div className="stat-description">
                      {((stats.total_photos / stats.total_students) * 100).toFixed(1)}% coverage
                    </div>
                  )}
                </div>
                
                <div className="stat-card stat-card-academic">
                  <div className="stat-icon stat-icon-academic">
                    <i className="fas fa-chart-line" aria-hidden="true"></i>
                  </div>
                  <div className="stat-number">{stats.individual_scores_count || 0}</div>
                  <div className="stat-label">Individual Scores</div>
                </div>
                
                <div className="stat-card stat-card-academic">
                  <div className="stat-icon stat-icon-academic">
                    <i className="fas fa-comments" aria-hidden="true"></i>
                  </div>
                  <div className="stat-number">{stats.comments_count || 0}</div>
                  <div className="stat-label">Comments Entered</div>
                </div>
                
                <div className="stat-card stat-card-academic">
                  <div className="stat-icon stat-icon-academic">
                    <i className="fas fa-money-bill-wave" aria-hidden="true"></i>
                  </div>
                  <div className="stat-number">{stats.debt_records || 0}</div>
                  <div className="stat-label">Debt Records</div>
                </div>
                
                <div className="stat-card stat-card-academic">
                  <div className="stat-icon stat-icon-academic">
                    <i className="fas fa-place-of-worship" aria-hidden="true"></i>
                  </div>
                  <div className="stat-number">{stats.parishes_assigned || 0}</div>
                  <div className="stat-label">Parish Assigned</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
