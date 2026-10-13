/**
 * Pre-Form One Comments — year selection.
 *
 * One step of the PRE-* comment modules (Sala, Taaluma, Tabia, Huduma, Michezo,
 * Mwalimu, Mkuu, Tabia na Mwenendo). Pre-Form One has no stream/term, so a year
 * is the only selector before the management grid.
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getSchoolYearOptions } from '../../utils/academicYearUtils';
import { useAuth } from '../../context/AuthContext';
import { useGoBack } from '../../hooks/useGoBack';
import './PreFormOneYear.css';
import './preform-one-modern.css';

const PreFormOneCommentsYear = ({ moduleConfig }) => {
  const { getAllowedPreFormOneModuleYears } = useAuth();
  const allYears = [...getSchoolYearOptions()].reverse();
  const allowedYears = getAllowedPreFormOneModuleYears();
  const years =
    allowedYears === null
      ? allYears
      : allYears.filter((year) => allowedYears.includes(Number(year)));
  const goBack = useGoBack('/admin');

  const { basePath = '/admin', label = 'PRE-Comments', moduleLabel = 'Comments', icon = 'fa-comments' } =
    moduleConfig || {};

  return (
    <AdminLayout>
      <div className="pre-form-one-year-page">
        <div className="pre-form-one-year-header">
          <div className="pre-form-one-year-header-left">
            <div className="pre-form-one-year-header-icon">
              <i className={`fas ${icon}`} aria-hidden="true"></i>
            </div>
            <div className="pre-form-one-year-header-text">
              <h1 className="pre-form-one-year-lead">{label}</h1>
              <p className="pre-form-one-year-subtitle">
                Select a year to enter {moduleLabel.toLowerCase()} for Pre-Form One students
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
            <i className={`fas ${icon}`}></i>
            <h3>No Pre-Form One Years Allocated</h3>
            <p>
              You have not been allocated any Pre-Form One years for this module. Contact an
              administrator for access.
            </p>
          </div>
        ) : (
          <div className="years-grid">
            {years.map((year) => (
              <Link
                key={year}
                to={`${basePath}/${year}`}
                className="year-card"
              >
                <div className="year-card-top">
                  <div className="year-icon">
                    <i className={`fas ${icon}`}></i>
                  </div>
                  <span className="year-badge">{year}</span>
                </div>
                <div className="year-card-body">
                  <h3 className="year-card-title">{label}</h3>
                  <p className="year-card-desc">
                    Enter {moduleLabel.toLowerCase()} for {year} Pre-Form One students
                  </p>
                </div>
                <div className="year-card-footer">
                  <span>Open</span>
                  <i className="fas fa-arrow-right"></i>
                </div>
              </Link>
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

export default PreFormOneCommentsYear;
