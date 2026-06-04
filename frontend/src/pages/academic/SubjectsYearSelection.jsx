/**
 * Subjects Year Selection Page for FORM I-IV
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import {
  formLevelToPathSlug,
  getCurrentCalendarYear,
  getSchoolYearOptions,
} from '../../utils/academicYearUtils';
import './SubjectsYearSelection.css';

const SubjectsYearSelection = ({ formLevel }) => {
  const currentYear = getCurrentCalendarYear();
  const years = getSchoolYearOptions();

  const getBackPath = () => {
    return '/admin/subjects';
  };

  const getYearDetailPath = (year) =>
    `/admin/subjects/${formLevelToPathSlug(formLevel)}/year/${year}`;

  return (
    <AdminLayout>
      <div className="subjects-year-selection-page-container">
        <div className="subjects-year-selection-card">
          <div className="subjects-year-selection-card-header">
            <i className="fas fa-book"></i>
            <span>{formLevel} - Choose Year</span>
          </div>
          <div className="subjects-year-selection-card-body">
            <div
              className="subjects-year-selection-grid"
              style={{ '--year-card-count': years.length }}
            >
              {years.map((year) => (
                <Link
                  key={`subjects-${year}`}
                  to={getYearDetailPath(year)}
                  className="subjects-year-selection-card-item"
                  aria-label={`${year} Subjects`}
                  data-current-year={year === currentYear}
                >
                  {year === currentYear ? (
                    <i className="fas fa-check subjects-year-status-icon current"></i>
                  ) : (
                    <i className="fas fa-times subjects-year-status-icon non-current"></i>
                  )}
                  <div className="subjects-year-selection-number">{year}</div>
                  <div className="subjects-year-selection-label">Subjects</div>
                </Link>
              ))}
            </div>
            <Link to={getBackPath()} className="subjects-year-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back to Classes</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SubjectsYearSelection;

