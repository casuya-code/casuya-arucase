/**
 * Score Entry Year Selection Page for FORM I-IV
 * Non-admin users only see years allocated to them for this class.
 * Non-admin without access to this class is redirected to score entry.
 */
import { Link, Navigate } from 'react-router-dom';
import { useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import {
  formLevelToPathSlug,
  getCurrentCalendarYear,
  getSchoolYearOptions,
} from '../../utils/academicYearUtils';
import './ScoreEntryYearSelection.css';

const ScoreEntryYearSelection = ({ formLevel }) => {
  const currentYear = getCurrentCalendarYear();
  const { getAllowedYearsForClass, hasClass, isAdminLike } = useAuth();

  if (!isAdminLike() && !hasClass(formLevel)) {
    return <Navigate to="/admin/score-entry" replace />;
  }

  const fullYears = useMemo(() => getSchoolYearOptions(), []);

  // For non-admin: only show years allocated for this class (e.g. FORM I)
  const years = useMemo(() => {
    const allowed = getAllowedYearsForClass(formLevel);
    if (allowed === null) return fullYears; // all years
    if (allowed.length === 0) return [];
    return fullYears.filter((y) => allowed.includes(y));
  }, [fullYears, formLevel, getAllowedYearsForClass]);

  const getBackPath = () => {
    return '/admin/score-entry';
  };

  const getYearDetailPath = (year) =>
    `/admin/score-entry/${formLevelToPathSlug(formLevel)}/year/${year}/streams`;

  return (
    <AdminLayout>
      <div className="score-entry-year-selection-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className={`fas fa-${formLevel === 'FORM I' ? '1' : formLevel === 'FORM II' ? '2' : formLevel === 'FORM III' ? '3' : '4'}`}></i>
            {formLevel} - Choose Year
            <div className="header-actions">
              <Link to={getBackPath()} className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back to Forms
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {years.length === 0 ? (
              <div className="empty-state">
                <p>You do not have access to any years for this class, or no years have been allocated to you. Contact an administrator.</p>
              </div>
            ) : (
            <>
              <div
                className="year-selection-grid"
                style={{ '--year-card-count': years.length }}
              >
                {years.map((year) => (
                  <Link
                    key={`score-${year}`}
                    to={getYearDetailPath(year)}
                    className="year-selection-card-item"
                    aria-label={`${year} Score Entry`}
                    data-current-year={year === currentYear}
                  >
                    {year === currentYear ? (
                      <i className="fas fa-check year-status-icon current"></i>
                    ) : (
                      <i className="fas fa-times year-status-icon non-current"></i>
                    )}
                    <div className="year-selection-number">{year}</div>
                    <div className="year-selection-label">Enter Scores</div>
                  </Link>
                ))}
              </div>
            </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ScoreEntryYearSelection;


