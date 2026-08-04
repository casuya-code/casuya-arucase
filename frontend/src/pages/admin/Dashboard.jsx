import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { useAuth } from '../../context/AuthContext';
import { useSound } from '../../utils/useSound';
import api from '../../services/api';
import './Dashboard.css';

const MODULE_GUIDELINES = [
  { module: 'student_registration', icon: 'fa-user-plus', title: 'Student Registration', path: '/admin/students/registration', description: 'Register new students accurately. Enter complete information including names, forms, streams, and registration numbers.' },
  { module: 'student_photo', icon: 'fa-camera', title: 'Student Photo', path: '/admin/students/photos', description: 'Upload clear, passport-size student photos. Ensure proper lighting and professional appearance.' },
  { module: 'student_parishes', icon: 'fa-place-of-worship', title: 'Student Parishes', path: '/admin/students/parishes', description: 'Assign students to their respective parishes. Maintain accurate parish records.' },
  { module: 'subjects', icon: 'fa-book', title: 'Subjects', path: '/admin/subjects', description: 'Manage subject configurations for different form levels.' },
  { module: 'individual_scores', icon: 'fa-graduation-cap', title: 'Individual Subject Score', path: '/admin/score-entry', description: 'Enter student scores accurately for each subject. Double-check marks before saving.' },
  { module: 'subject_teachers', icon: 'fa-chalkboard-teacher', title: 'Subject Teachers', path: '/admin/teachers', description: 'Assign teachers to their subjects and classes.' },
  { module: 'marks_config', icon: 'fa-calendar-alt', title: 'Month Selection & Marks Config', path: '/admin/marks-config', description: 'Configure monthly assessment periods and grading criteria.' },
  { module: 'sala_comments', icon: 'fa-comments', title: 'Sala Comments', path: '/admin/sala', description: 'Provide meaningful feedback on students prayer life and spiritual participation.' },
  { module: 'huduma_comments', icon: 'fa-hands-helping', title: 'Huduma', path: '/admin/huduma', description: 'Evaluate students service to the community.' },
  { module: 'tabia_comments', icon: 'fa-user-check', title: 'Tabia Comments', path: '/admin/tabia', description: 'Assess students behavior and character.' },
  { module: 'michezo_comments', icon: 'fa-running', title: 'Michezo Comments', path: '/admin/michezo', description: 'Comment on students sports and physical activities.' },
  { module: 'mwalimu_taaluma_comments', icon: 'fa-user-graduate', title: 'Mwalimu wa Taaluma Comments', path: '/admin/mwalimu-comments', description: 'Provide brief, specific academic guidance.' },
  { module: 'mkuu_shule_comments', icon: 'fa-crown', title: 'Mkuu wa Shule Comments', path: '/admin/mkuu-comments', description: 'Provide overall assessment and direction.' },
  { module: 'taaluma_comments', icon: 'fa-book-open', title: 'Taaluma Comments', path: '/admin/taaluma', description: 'Provide comprehensive academic feedback.' },
  { module: 'tabia_mwenendo_comments', icon: 'fa-balance-scale', title: 'Tabia na Mwenendo', path: '/admin/tabia-mwenendo', description: 'Evaluate behavior and conduct comprehensively.' },
  { module: 'monthly_results', icon: 'fa-clipboard-list', title: 'Arucase Monthly Results', path: '/admin/results/monthly', description: 'Enter and review monthly academic results.' },
  { module: 'individual_debt', icon: 'fa-money-bill-wave', title: 'Individual Debt', path: '/admin/debts', description: 'Track student fee payments and outstanding balances.' },
  { module: 'individual_report', icon: 'fa-file-alt', title: 'Individual Student Report', path: '/reports/individual', description: 'Generate comprehensive student report cards.' },
  { module: 'bulk_report', icon: 'fa-copy', title: 'Student Bulk Report', path: '/reports/bulk', description: 'Generate reports for entire classes efficiently.' },
  { module: 'news_announcements', icon: 'fa-newspaper', title: 'News & Announcements', path: '/admin/news', description: 'Post important school news and public announcements.' },
  { module: 'fees_announcements', icon: 'fa-money-bill-wave', title: 'Fees Announcements', path: '/admin/fees', description: 'Communicate fee-related information to students and parents.' },
];

const ADMIN_LIKE_ROLES = ['admin', 'superadmin', 'rector', 'vice_rector', 'academic_master'];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { isMuted, toggleMute } = useSound();
  const isAdmin = user?.role && ADMIN_LIKE_ROLES.includes(user.role);

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard/stats');
      return response.data;
    },
    enabled: !!(user?.role && ADMIN_LIKE_ROLES.includes(user.role)),
    refetchOnWindowFocus: false,
    staleTime: 60000,
    retry: (failureCount, err) => err?.response?.status !== 401 && failureCount < 1,
  });

  const stats = dashboardData?.stats || {};
  const userPermissions = useMemo(() => {
    const p = user?.permissions;
    if (!p) return { modules: [] };
    if (typeof p === 'string') {
      try { return JSON.parse(p); } catch { return { modules: [] }; }
    }
    return Array.isArray(p?.modules) ? p : { ...p, modules: p?.modules || [] };
  }, [user?.permissions]);

  const availableGuidelines = useMemo(() => {
    const modules = userPermissions.modules || [];
    if (modules.includes('all')) return MODULE_GUIDELINES;
    const hasRegistrationSplit =
      modules.includes('student_registration') ||
      modules.includes('student_registration_form_i_iv') ||
      modules.includes('student_registration_form_v_vi');
    return MODULE_GUIDELINES.filter((guideline) => {
      if (guideline.module === 'student_registration') return hasRegistrationSplit;
      return modules.includes(guideline.module);
    });
  }, [userPermissions.modules]);

  const totalStudents = useMemo(() => {
    if (!Array.isArray(stats.students_by_year)) return 0;
    return stats.students_by_year.reduce((sum, s) => sum + (s.count || 0), 0);
  }, [stats.students_by_year]);

  const totalForms = useMemo(() => {
    if (!Array.isArray(stats.students_by_year_and_form)) return 0;
    const forms = ['form_i', 'form_ii', 'form_iii', 'form_iv', 'form_v', 'form_vi'];
    return stats.students_by_year_and_form.reduce((sum, row) => {
      return sum + forms.reduce((fSum, f) => fSum + (row[f] || 0), 0);
    }, 0);
  }, [stats.students_by_year_and_form]);

  const yearCount = Array.isArray(stats.students_by_year)
    ? new Set(stats.students_by_year.map((s) => s.year)).size
    : 0;

  const latestYear = useMemo(() => {
    if (!Array.isArray(stats.students_by_year) || stats.students_by_year.length === 0) return null;
    return [...stats.students_by_year].sort((a, b) => b.year - a.year)[0];
  }, [stats.students_by_year]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="dash-load">
          <SkeletonLoader type="text" lines={1} width="40%" height="1.5rem" />
          <div className="dash-load-grid">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLoader key={i} type="card" height="100px" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="dash-error">
          <i className="fas fa-exclamation-circle" />
          <p>Error loading dashboard: {error.message}</p>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="dash-teacher">
          <div className="dash-welcome-strip">
            <div className="dash-welcome-inner">
              <div>
                <h1 className="dash-welcome-name">Karibu, {user?.full_name || user?.username}</h1>
                <p className="dash-welcome-sub">Your workspace for managing student excellence</p>
              </div>
              <button onClick={toggleMute} className="dash-mute" aria-label="Toggle sound">
                <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`} />
              </button>
            </div>
          </div>
          <div className="dash-guides">
            <h2 className="dash-guides-title">
              <i className="fas fa-compass" /> Your Modules
            </h2>
            <div className="dash-guides-grid">
              {availableGuidelines.length > 0 ? (
                availableGuidelines.map((g, i) => (
                  <Link key={i} to={g.path} className="dash-guide-card">
                    <span className="dash-guide-icon"><i className={`fas ${g.icon}`} /></span>
                    <span className="dash-guide-text">
                      <strong>{g.title}</strong>
                      <small>{g.description}</small>
                    </span>
                  </Link>
                ))
              ) : (
                <p className="dash-no-modules">No modules assigned. Contact your administrator.</p>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="dash-admin">
        <div className="dash-shell">
          <header className="dash-top">
            <div>
              <h1 className="dash-top-title">Dashboard</h1>
              <p className="dash-top-sub">
                {user?.full_name || user?.username || 'Administrator'}
                <span className="dash-top-role">{user?.role || 'admin'}</span>
              </p>
            </div>
            <div className="dash-top-actions">
              <button onClick={toggleMute} className="dash-icon-btn" title={isMuted ? 'Unmute' : 'Mute'}>
                <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`} />
              </button>
              <button onClick={logout} className="dash-icon-btn dash-icon-btn--red" title="Logout">
                <i className="fas fa-sign-out-alt" />
              </button>
            </div>
          </header>

          <section className="dash-stats">
            <div className="dash-stat" style={{ '--accent': '#10b981' }}>
              <span className="dash-stat-num">{totalStudents}</span>
              <span className="dash-stat-label">Total Students</span>
              <span className="dash-stat-sub">Across all years</span>
            </div>
            <div className="dash-stat" style={{ '--accent': '#3b82f6' }}>
              <span className="dash-stat-num">{totalForms}</span>
              <span className="dash-stat-label">Form Enrolments</span>
              <span className="dash-stat-sub">Form I – VI</span>
            </div>
            <div className="dash-stat" style={{ '--accent': '#8b5cf6' }}>
              <span className="dash-stat-num">{yearCount}</span>
              <span className="dash-stat-label">Academic Years</span>
              <span className="dash-stat-sub">On record</span>
            </div>
            <div className="dash-stat" style={{ '--accent': '#f59e0b' }}>
              <span className="dash-stat-num">{latestYear ? latestYear.count : 0}</span>
              <span className="dash-stat-label">Latest ({latestYear ? latestYear.year : '—'})</span>
              <span className="dash-stat-sub">{latestYear ? latestYear.term : 'No data'}</span>
            </div>
          </section>

          {Array.isArray(stats.students_by_year) && stats.students_by_year.length > 0 && (
            <section className="dash-card">
              <h2 className="dash-card-title">Yearly Student Distribution</h2>
              <div className="dash-table-wrap">
                <div className="dash-table dash-table--2col">
                  <div className="dash-row dash-row--head">
                    <span>Year</span>
                    <span>Students</span>
                  </div>
                  {stats.students_by_year.map(({ year, term, count }) => (
                    <div key={`${year}-${term}`} className="dash-row">
                      <span className="dash-row-year">{year} <small>{term}</small></span>
                      <span className="dash-row-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {Array.isArray(stats.students_by_year_and_form) && stats.students_by_year_and_form.length > 0 && (() => {
            const rows = stats.students_by_year_and_form;
            const yearColumns = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => a - b);
            const forms = [
              { key: 'form_i', label: 'Form I' },
              { key: 'form_ii', label: 'Form II' },
              { key: 'form_iii', label: 'Form III' },
              { key: 'form_iv', label: 'Form IV' },
              { key: 'form_v', label: 'Form V' },
              { key: 'form_vi', label: 'Form VI' },
            ];
            const getCount = (rowYear, formKey) => {
              return rows.filter((r) => r.year === rowYear).reduce((s, r) => s + (typeof r[formKey] === 'number' ? r[formKey] : 0), 0);
            };
            const yearGrandTotal = (year) =>
              rows.filter((r) => r.year === year).reduce((s, r) => s + (typeof r.total === 'number' ? r.total : 0), 0);
            const allGrand = yearColumns.reduce((s, y) => s + yearGrandTotal(y), 0);

            return (
              <section className="dash-card">
                <h2 className="dash-card-title">Form-wise Distribution</h2>
                <div className="dash-table-wrap">
                  <div className="dash-table dash-table--forms" style={{ '--cols': yearColumns.length }}>
                    <div className="dash-row dash-row--head">
                      <span>Form</span>
                      {yearColumns.map((y) => <span key={y}>{y}</span>)}
                      <span>Total</span>
                    </div>
                    {forms.map(({ key, label }) => (
                      <div key={key} className="dash-row">
                        <span className="dash-row-year">{label}</span>
                        {yearColumns.map((y) => (
                          <span key={`${key}-${y}`} className="dash-row-num">{getCount(y, key)}</span>
                        ))}
                        <span className="dash-row-num dash-row-num--total">
                          {yearColumns.reduce((s, y) => s + getCount(y, key), 0)}
                        </span>
                      </div>
                    ))}
                    <div className="dash-row dash-row--foot">
                      <span className="dash-row-year">Grand Total</span>
                      {yearColumns.map((y) => (
                        <span key={y} className="dash-row-num">{yearGrandTotal(y)}</span>
                      ))}
                      <span className="dash-row-num dash-row-num--total">{allGrand}</span>
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
