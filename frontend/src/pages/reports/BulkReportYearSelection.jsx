/**
 * Bulk Report - Step 2: Year Selection
 */
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getCurrentCalendarYear, getSchoolYearOptions } from '../../utils/academicYearUtils';
import './BulkReport.css';

const BulkReportYearSelection = () => {
  const { form, stream } = useParams();
  const navigate = useNavigate();
  const currentYear = getCurrentCalendarYear();
  const availableYears = getSchoolYearOptions();

  const handleYearClick = (year) => {
    navigate(`/reports/bulk/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/${encodeURIComponent(year)}/term`);
  };

  return (
    <AdminLayout>
      <div className="bulk-report-page">
        <div className="breadcrumb">
          <Link to="/reports/bulk">Bulk Student Report</Link> &gt; {form}
        </div>

        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-calendar-alt"></i> Bulk Report - {form} - Select Year
          </div>
          <div className="excel-card-body">
            <p className="instruction-text">Select an academic year</p>
            <div className="year-grid">
                  {availableYears.map((year) => (
                    <button
                      type="button"
                      key={`bulk-${year}`}
                      onClick={() => handleYearClick(year)}
                      className="year-card"
                    >
                      {year === currentYear ? (
                        <i className="fas fa-check-circle year-status-icon year-current"></i>
                      ) : (
                        <i className="fas fa-times-circle year-status-icon year-not-current"></i>
                      )}
                      <div className="year-icon">
                        <i className="fas fa-calendar"></i>
                      </div>
                      <div className="year-title">{year}</div>
                      <div className="year-subtitle">Academic Year {year}</div>
                    </button>
                  ))}
                </div>
                <div className="action-buttons mt-20">
                  <Link to="/reports/bulk" className="excel-btn">
                    <i className="fas fa-arrow-left"></i> Back to Form Selection
                  </Link>
                </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BulkReportYearSelection;

