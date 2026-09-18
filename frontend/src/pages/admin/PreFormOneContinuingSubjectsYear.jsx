import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getSchoolYearOptions } from '../../utils/academicYearUtils';
import { useAuth } from '../../context/AuthContext';
import { useGoBack } from '../../hooks/useGoBack';
import './PreFormOne.css';
import './preform-one-modern.css';

const PreFormOneContinuingSubjectsYear = () => {
  const { getAllowedPreFormOneModuleYears } = useAuth();
  const allYears = [...getSchoolYearOptions()].reverse();
  const allowedYears = getAllowedPreFormOneModuleYears();
  const years = allowedYears === null
    ? allYears
    : allYears.filter((year) => allowedYears.includes(Number(year)));
  const goBack = useGoBack('/admin');

  return (
    <AdminLayout>
    <div className="pre-form-one-page">
      <div className="pre-form-one-header">
        <h1>Pre-Form One Continuing Subjects</h1>
        <p>Select a year to manage continuing subjects</p>
      </div>

      {years.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-book-open"></i>
          <h3>No Pre-Form One Years Allocated</h3>
          <p>You have not been allocated any Pre-Form One years for continuing subjects. Contact an administrator for access.</p>
        </div>
      ) : (
      <div className="years-grid">
        {years.map((year) => (
          <Link 
            key={year} 
            to={`/admin/pre-form-one/${year}/continuing-subjects`}
            className="year-card"
          >
            <div className="year-card-top">
              <div className="year-icon">
                <i className="fas fa-book-open"></i>
              </div>
              <span className="year-badge">{year}</span>
            </div>
            <div className="year-card-body">
              <h3 className="year-card-title">Continuing Subjects</h3>
              <p className="year-card-desc">Manage continuing subjects for {year}</p>
            </div>
            <div className="year-card-footer">
              <span>Open Subjects</span>
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

export default PreFormOneContinuingSubjectsYear;
