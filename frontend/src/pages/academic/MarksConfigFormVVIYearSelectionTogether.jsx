/**
 * Marks Config Year Selection - Form V/VI Together Mode (all streams combined)
 */
import { Link, useParams, Navigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { useFormVVITogetherYearOptions } from '../../hooks/useFormVVIYearOptions';
import { normalizeFormLevel, FORM_V_VI_STREAM_CODES } from '../../utils/academicYearUtils';
import '../../pages/students/YearSelection.css';

const MarksConfigFormVVIYearSelectionTogether = () => {
  const { formLevel } = useParams();
  const { isAdminLike, hasClass } = useAuth();

  const normalizedForm = normalizeFormLevel(
    formLevel ? formLevel.split('-').map((w) => w.toUpperCase()).join(' ') : ''
  );

  const hasAccessToAnyStream =
    isAdminLike() ||
    FORM_V_VI_STREAM_CODES.some((code) => hasClass(`${normalizedForm} ${code}`));

  const { years, helpText } = useFormVVITogetherYearOptions(normalizedForm);

  if (!hasAccessToAnyStream) {
    return <Navigate to="/admin/marks-config" replace />;
  }

  return (
    <AdminLayout>
      <div className="year-selection-page-container">
        <div className="year-selection-card">
          <div className="year-selection-card-header">
            <i className="fas fa-calendar-alt"></i>
            {normalizedForm} All Streams - Choose Academic Year
          </div>
          <div className="year-selection-card-body">
            <p className="form-vvi-year-help">{helpText}</p>
            {years.length === 0 ? (
              <p className="year-selection-empty">No years allocated for this form.</p>
            ) : (
              <div
                className="year-selection-grid"
                style={{ '--year-card-count': years.length }}
              >
                {years.map((yearObj) => (
                  <Link
                    key={`${yearObj.year}-${yearObj.role}-together`}
                    to={`/admin/marks-config/${formLevel}/together/year/${yearObj.year}/terms`}
                    className="year-selection-card-item"
                    aria-label={`${yearObj.displayRange} Configure Marks`}
                    title={yearObj.fullDisplay}
                  >
                    <div className="year-selection-number">{yearObj.year}</div>
                    <div className="year-selection-label">
                      {yearObj.displayLabel || yearObj.displayRange}
                    </div>
                    <div className="year-selection-sublabel">All Streams · Configure Marks</div>
                    {yearObj.badge ? (
                      <span
                        className={`form-vvi-year-badge form-vvi-year-badge--${yearObj.badgeType}`}
                      >
                        {yearObj.badge}
                      </span>
                    ) : null}
                    {yearObj.status && yearObj.status !== 'current' ? (
                      <span
                        className={`form-vvi-year-status form-vvi-year-status--${yearObj.status}`}
                      >
                        {yearObj.status === 'past' ? 'Ended' : 'Upcoming'}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
            <Link to="/admin/marks-config" className="year-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MarksConfigFormVVIYearSelectionTogether;
