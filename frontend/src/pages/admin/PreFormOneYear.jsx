import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { useGoBack } from '../../hooks/useGoBack';
import './PreFormOneYear.css';
import './preform-one-modern.css';

const PreFormOneYear = () => {
  const { year } = useParams();
  const { getAllowedPreFormOneModuleYears } = useAuth();
  const allowedYears = getAllowedPreFormOneModuleYears();
  const yearAllowed = allowedYears === null || allowedYears.includes(Number(year));
  const goBack = useGoBack('/admin/pre-form-one');

  const navigationItems = [
    {
      title: 'Registration',
      description: 'Manage student registrations',
      icon: 'fa-user-plus',
      path: `/admin/pre-form-one/${year}/registration`,
    },
    {
      title: 'Parishes',
      description: 'Manage student parish information',
      icon: 'fa-place-of-worship',
      path: `/admin/pre-form-one/${year}/parishes`,
    },
    {
      title: 'Interview Subjects',
      description: 'Manage interview subjects',
      icon: 'fa-book',
      path: `/admin/pre-form-one/${year}/interview-subjects`,
    },
    {
      title: 'Continuing Subjects',
      description: 'Manage continuing subjects',
      icon: 'fa-book-open',
      path: `/admin/pre-form-one/${year}/continuing-subjects`,
    },
    {
      title: 'Score Entry',
      description: 'Enter and manage scores',
      icon: 'fa-edit',
      path: `/admin/pre-form-one/${year}/score-entry`,
    },
    {
      title: 'Interview Results',
      description: 'View interview results',
      icon: 'fa-clipboard-check',
      path: `/admin/pre-form-one/${year}/interview-results`,
    },
    {
      title: 'Continuing Results',
      description: 'View continuing results',
      icon: 'fa-chart-line',
      path: `/admin/pre-form-one/${year}/continuing-results`,
    },
    {
      title: 'Interview Reports',
      description: 'Generate interview reports',
      icon: 'fa-file-alt',
      path: `/admin/pre-form-one/${year}/interview-reports`,
    },
    {
      title: 'Continuing Reports',
      description: 'Generate continuing reports',
      icon: 'fa-file-invoice',
      path: `/admin/pre-form-one/${year}/continuing-reports`,
    },
    {
      title: 'Promotion',
      description: 'Promote students to Form One',
      icon: 'fa-graduation-cap',
      path: `/admin/pre-form-one/${year}/promotion`,
    },
  ];

  return (
    <AdminLayout>
    <div className="pre-form-one-year-page">
      <div className="pre-form-one-year-header">
        <div className="pre-form-one-year-header-left">
          <div className="pre-form-one-year-header-icon">
            <i className="fas fa-graduation-cap" aria-hidden="true"></i>
          </div>
          <div className="pre-form-one-year-header-text">
            <h1 className="pre-form-one-year-lead">Pre-Form One Modules</h1>
            <p className="pre-form-one-year-subtitle">
              Select a module to manage Pre-Form One activities for the {year} intake
            </p>
          </div>
        </div>
        <button type="button" onClick={goBack} className="back-button">
          <i className="fas fa-arrow-left" aria-hidden="true"></i>
          Back to Years
        </button>
      </div>

      {yearAllowed ? (
      <>
      <div className="pre-form-one-year-section-heading">
        <span className="pre-form-one-year-section-title">Available Modules</span>
        <span className="pre-form-one-year-module-count">{navigationItems.length} modules</span>
      </div>

      <div className="navigation-grid">
        {navigationItems.map((item, index) => (
          <Link 
            key={index}
            to={item.path}
            className="navigation-card"
            aria-label={`${item.title}: ${item.description}`}
          >
            <div className="navigation-card-body">
              <div className="navigation-icon">
                <i className={`fas ${item.icon}`}></i>
              </div>
              <div className="navigation-copy">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <span className="navigation-index">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
            <div className="navigation-card-footer">
              <span>Open Module</span>
              <i className="fas fa-arrow-right"></i>
            </div>
          </Link>
        ))}
      </div>
      </>
      ) : (
        <div className="empty-state">
          <i className="fas fa-lock"></i>
          <h3>Year Not Allocated</h3>
          <p>You do not have access to Pre-Form One modules for the year {year}. Contact an administrator.</p>
        </div>
      )}

      <div className="back-navigation-bottom">
        <button type="button" onClick={goBack} className="back-button">
          <i className="fas fa-arrow-left"></i>
          Back to Years
        </button>
      </div>
    </div>
    </AdminLayout>
  );
};

export default PreFormOneYear;
