/**
 * Photo Year Selection Page for FORM I-IV
 * Non-admin users only see years allocated to them for this class.
 */
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import {
  formLevelToPathSlug,
  getCurrentCalendarYear,
  getSchoolYearOptions,
} from '../../utils/academicYearUtils';
import './PhotoYearSelection.css';

const PhotoYearSelection = ({ formLevel }) => {
  const currentYear = getCurrentCalendarYear();
  const { getAllowedYearsForClass } = useAuth();
  const fullYears = useMemo(() => getSchoolYearOptions(), []);

  const years = useMemo(() => {
    const allowed = getAllowedYearsForClass(formLevel);
    if (allowed === null) return fullYears;
    if (allowed.length === 0) return [];
    return fullYears.filter((y) => allowed.includes(y));
  }, [fullYears, formLevel, getAllowedYearsForClass]);

  const getBackPath = () => {
    return '/admin/students/photos';
  };

  const getYearDetailPath = (year) =>
    `/admin/students/photos/${formLevelToPathSlug(formLevel)}/year/${year}/streams`;

  return (
    <AdminLayout>
      <div className="photo-year-selection-page-container">
        <div className="photo-year-selection-card">
          <div className="photo-year-selection-card-header">
            <i className="fas fa-camera"></i>
            <span>{formLevel} - Years</span>
          </div>
          <div className="photo-year-selection-card-body">
            {years.length === 0 ? (
              <p className="photo-year-selection-empty">You do not have access to any years for this class. Contact an administrator.</p>
            ) : (
            <div
              className="photo-year-selection-grid"
              style={{ '--year-card-count': years.length }}
            >
              {years.map((year) => (
                <Link
                  key={`photo-${year}`}
                  to={getYearDetailPath(year)}
                  className="photo-year-selection-card-item"
                  aria-label={`${year} Student Photos`}
                  data-current-year={year === currentYear}
                >
                  <div className="photo-year-selection-number">{year}</div>
                  <div className="photo-year-selection-label">Student Photos</div>
                </Link>
              ))}
            </div>
            )}
            <Link to={getBackPath()} className="photo-year-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back to Classes</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PhotoYearSelection;

