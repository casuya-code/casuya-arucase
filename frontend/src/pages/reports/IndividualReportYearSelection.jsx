/**
 * Individual Student Report - Step 2: Year Selection
 */
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getCurrentCalendarYear, getSchoolYearOptions } from '../../utils/academicYearUtils';
import './IndividualReport.css';

const IndividualReportYearSelection = () => {
  const { form, stream } = useParams();
  const navigate = useNavigate();
  const currentYear = getCurrentCalendarYear();
  const availableYears = getSchoolYearOptions();

  const handleYearClick = (year) => {
    navigate(`/reports/individual/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/${encodeURIComponent(year)}/term`);
  };

  return (
    <AdminLayout>
      <div className="individual-report-page">
        <div className="individual-report-shell">
          <div className="individual-report-breadcrumb">
            <Link to="/reports/individual">Individual Student Report</Link>
            <span className="bc-sep">&rsaquo;</span>
            <Link to="/reports/individual">{form}</Link>
            <span className="bc-sep">&rsaquo;</span>
            <span className="bc-current">Year</span>
          </div>

          <div className="individual-report-card" style={{ '--accent': '#3b82f6' }}>
            <div className="individual-report-card-header">
              <i className="fas fa-calendar-alt" /> Select Academic Year
            </div>
            <div className="individual-report-card-body">
              <div className="individual-report-year-grid">
                {availableYears.map((year) => (
                  <button
                    type="button"
                    key={`individual-${year}`}
                    onClick={() => handleYearClick(year)}
                    className="individual-report-year-card"
                    style={{ '--accent': year === currentYear ? '#10b981' : '#999' }}
                  >
                    <i className={`fas ${year === currentYear ? 'fa-check-circle' : 'fa-circle'} individual-report-year-status ${year === currentYear ? 'current' : 'past'}`} />
                    <div className="individual-report-year-icon">
                      <i className="fas fa-calendar" />
                    </div>
                    <div className="individual-report-year-label">{year}</div>
                    <div className="individual-report-year-sub">Academic Year {year}</div>
                  </button>
                ))}
              </div>
              <div className="individual-report-actions">
                <Link to="/reports/individual" className="individual-report-btn individual-report-btn--secondary">
                  <i className="fas fa-arrow-left" /> Back to Forms
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default IndividualReportYearSelection;
