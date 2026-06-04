/**
 * Teachers Year Selection Page for FORM I-IV
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import {
  formLevelToPathSlug,
  getCurrentCalendarYear,
  getSchoolYearOptions,
} from '../../utils/academicYearUtils';
import './SubjectsYearSelection.css';

const TeachersYearSelection = ({ formLevel }) => {
  const currentYear = getCurrentCalendarYear();
  const years = getSchoolYearOptions();

  const getBackPath = () => {
    return '/admin/teachers';
  };

  const getYearDetailPath = (year) =>
    `/admin/teachers/${formLevelToPathSlug(formLevel)}/year/${year}`;

  return (
    <AdminLayout>
      <div className="subjects-year-selection-page-container">
        <div className="subjects-year-selection-card">
          <div className="subjects-year-selection-card-header">
            <i className={`fas fa-${formLevel === 'FORM I' ? '1' : formLevel === 'FORM II' ? '2' : formLevel === 'FORM III' ? '3' : '4'}`}></i>
            {formLevel} - Choose Year
          </div>
          <div className="subjects-year-selection-card-body">
            <div
              className="subjects-year-selection-grid"
              style={{ '--year-card-count': years.length }}
            >
              {years.map((year) => (
                <Link
                  key={`teachers-${year}`}
                  to={getYearDetailPath(year)}
                  className="subjects-year-selection-card-item"
                  aria-label={`${year} Teachers`}
                  data-current-year={year === currentYear}
                >
                  {year === currentYear ? (
                    <i className="fas fa-check subjects-year-status-icon current"></i>
                  ) : (
                    <i className="fas fa-times subjects-year-status-icon non-current"></i>
                  )}
                  <div className="subjects-year-selection-number">{year}</div>
                  <div className="subjects-year-selection-label">Teachers</div>
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

export default TeachersYearSelection;


