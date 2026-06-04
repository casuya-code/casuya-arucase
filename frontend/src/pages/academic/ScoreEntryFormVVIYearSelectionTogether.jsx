/**
 * Score Entry Year Selection - Form V/VI Together Mode
 */
import { Link, useParams, Navigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { useFormVVITogetherYearOptions } from '../../hooks/useFormVVIYearOptions';
import { normalizeFormLevel } from '../../utils/academicYearUtils';
import { FORM_V_VI_STREAM_CODES } from '../../utils/academicYearUtils';
import '../../pages/students/YearSelection.css';
import './ScoreEntryYearSelection.css';

const ScoreEntryFormVVIYearSelectionTogether = () => {
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
    return <Navigate to="/admin/score-entry" replace />;
  }

  return (
    <AdminLayout>
      <div className="score-entry-year-selection-page-container">
        <div className="year-selection-card">
          <div className="year-selection-card-header">
            <i className="fas fa-layer-group"></i>
            <span>{normalizedForm} (All Streams) — Choose Academic Year</span>
            <div className="header-actions">
              <Link to="/admin/score-entry" className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
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
                    key={`${yearObj.year}-together`}
                    to={`/admin/score-entry/${formLevel}/together/year/${yearObj.year}/subjects`}
                    className="year-selection-card-item"
                  >
                    <div className="year-selection-number">{yearObj.year}</div>
                    <div className="year-selection-label">
                      {yearObj.displayLabel || yearObj.displayRange}
                    </div>
                    <div className="year-selection-sublabel">All streams</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ScoreEntryFormVVIYearSelectionTogether;
