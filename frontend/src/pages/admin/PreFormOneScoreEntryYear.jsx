import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getSchoolYearOptions } from '../../utils/academicYearUtils';
import { useAuth } from '../../context/AuthContext';
import { useGoBack } from '../../hooks/useGoBack';
import './PreFormOne.css';
import './preform-one-modern.css';

const PreFormOneScoreEntryYear = () => {
  const { getAllowedPreFormOneYears } = useAuth();
  const allYears = [...getSchoolYearOptions()].reverse();
  const allowedYears = getAllowedPreFormOneYears();
  const years = allowedYears === null
    ? allYears
    : allYears.filter((year) => allowedYears.includes(Number(year)));
  const goBack = useGoBack('/admin');

  return (
    <AdminLayout>
    <div className="pre-form-one-page">
      <div className="pre-form-one-header">
        <h1>Pre-Form One Score Entry</h1>
        <p>Select a year to enter and manage Pre-Form One scores</p>
      </div>

      {years.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-graduation-cap"></i>
          <h3>No Pre-Form One Subjects Allocated</h3>
          <p>You have not been allocated any Pre-Form One subjects for score entry. Contact an administrator to assign subjects.</p>
        </div>
      ) : (
        <div className="years-grid">
          {years.map((year) => (
            <Link 
              key={year} 
              to={`/admin/pre-form-one/${year}/score-entry`}
              className="year-card"
            >
              <div className="year-card-top">
                <div className="year-icon">
                  <i className="fas fa-graduation-cap"></i>
                </div>
                <span className="year-badge">{year}</span>
              </div>
              <div className="year-card-body">
                <h3 className="year-card-title">Pre-Form One Score Entry</h3>
                <p className="year-card-desc">Enter and manage Pre-Form One scores</p>
              </div>
              <div className="year-card-footer">
                <span>Open Score Entry</span>
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

export default PreFormOneScoreEntryYear;
