/**
 * Parish Year Selection Page for FORM I-IV
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
import './ParishYearSelection.css';

const ParishYearSelection = ({ formLevel }) => {
  const currentYear = getCurrentCalendarYear();
  const { getAllowedYearsForClass } = useAuth();
  const fullYears = useMemo(() => getSchoolYearOptions(), []);

  const years = useMemo(() => {
    const allowed = getAllowedYearsForClass(formLevel, { moduleId: 'student_parishes' });
    if (allowed === null) return fullYears;
    if (allowed.length === 0) return [];
    return fullYears.filter((y) => allowed.includes(y));
  }, [fullYears, formLevel, getAllowedYearsForClass]);

  const getBackPath = () => {
    return '/admin/students/parishes';
  };

  const getYearDetailPath = (year) =>
    `/admin/students/parishes/${formLevelToPathSlug(formLevel)}/year/${year}/streams`;

  return (
    <AdminLayout>
      <div className="parish-year-selection-page-container">
        <div className="parish-year-selection-card">
          <div className="parish-year-selection-card-header">
            <i className="fas fa-place-of-worship"></i>
            <span>{formLevel} - Years</span>
          </div>
          <div className="parish-year-selection-card-body">
            {years.length === 0 ? (
              <p className="parish-year-selection-empty">You do not have access to any years for this class. Contact an administrator.</p>
            ) : (
            <div
              className="parish-year-selection-grid"
              style={{ '--year-card-count': years.length }}
            >
              {years.map((year) => (
                <Link
                  key={`parish-${year}`}
                  to={getYearDetailPath(year)}
                  className="parish-year-selection-card-item"
                  aria-label={`${year} Student Parishes`}
                  data-current-year={year === currentYear}
                >
                  <div className="parish-year-selection-number">{year}</div>
                  <div className="parish-year-selection-label">Student Parishes</div>
                </Link>
              ))}
            </div>
            )}
            <Link to={getBackPath()} className="parish-year-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back to Classes</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ParishYearSelection;

