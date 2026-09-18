import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getSchoolYearOptions } from '../../utils/academicYearUtils';
import { useAuth } from '../../context/AuthContext';
import { useGoBack } from '../../hooks/useGoBack';
import './PreFormOneYear.css';
import './preform-one-modern.css';

const PreFormOneResultsYear = () => {
  const { getAllowedPreFormOneModuleYears } = useAuth();
  const allYears = [...getSchoolYearOptions()].reverse();
  const allowedYears = getAllowedPreFormOneModuleYears();
  const years = allowedYears === null
    ? allYears
    : allYears.filter((year) => allowedYears.includes(Number(year)));
  const goBack = useGoBack('/admin');

  return (
    <AdminLayout>
    <div className="pre-form-one-year-page">
      <div className="pre-form-one-year-header">
        <div className="pre-form-one-year-header-left">
          <div className="pre-form-one-year-header-icon">
            <i className="fas fa-clipboard-check" aria-hidden="true"></i>
          </div>
          <div className="pre-form-one-year-header-text">
            <h1 className="pre-form-one-year-lead">Pre-Form One Results</h1>
            <p className="pre-form-one-year-subtitle">
              Select a year to view Pre-Form One interview and continuing results
            </p>
          </div>
        </div>
        <button type="button" onClick={goBack} className="back-button">
          <i className="fas fa-arrow-left" aria-hidden="true"></i>
          Back to Admin
        </button>
      </div>

      {years.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-clipboard-check"></i>
          <h3>No Pre-Form One Years Allocated</h3>
          <p>You have not been allocated any Pre-Form One years for results. Contact an administrator for access.</p>
        </div>
      ) : (
      <div className="years-grid">
        {years.map((year) => (
          <div key={year} className="year-card">
            <div className="year-card-top">
              <div className="year-icon">
                <i className="fas fa-clipboard-check"></i>
              </div>
              <span className="year-badge">{year}</span>
            </div>
            <div className="year-card-body">
              <h3 className="year-card-title">Pre-Form One Results & Reports</h3>
              <p className="year-card-desc">View interview and continuing results, plus generated reports</p>
            </div>
            <div className="year-card-actions">
              <Link 
                to={`/admin/pre-form-one/${year}/interview-results`}
                className="excel-btn primary"
              >
                <i className="fas fa-clipboard-check"></i>
                Interview Results
              </Link>
              <Link 
                to={`/admin/pre-form-one/${year}/continuing-results`}
                className="excel-btn secondary"
              >
                <i className="fas fa-chart-line"></i>
                Continuing Results
              </Link>
              <Link 
                to={`/admin/pre-form-one/${year}/interview-reports`}
                className="excel-btn primary"
              >
                <i className="fas fa-file-invoice"></i>
                Interview Reports
              </Link>
              <Link 
                to={`/admin/pre-form-one/${year}/continuing-reports`}
                className="excel-btn secondary"
              >
                <i className="fas fa-file-alt"></i>
                Continuing Reports
              </Link>
            </div>
          </div>
        ))}
      </div>
      )}

      <div className="back-navigation-bottom">
        <button type="button" onClick={goBack} className="back-button">
          <i className="fas fa-arrow-left"></i>
          Back to Admin
        </button>
      </div>
    </div>
    </AdminLayout>
  );
};

export default PreFormOneResultsYear;
