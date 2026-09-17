import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getSchoolYearOptions } from '../../utils/academicYearUtils';
import { useGoBack } from '../../hooks/useGoBack';
import './PreFormOne.css';
import './preform-one-modern.css';

const PreFormOnePromotionYear = () => {
  const years = [...getSchoolYearOptions()].reverse();
  const goBack = useGoBack('/admin');

  return (
    <AdminLayout>
    <div className="pre-form-one-page">
      <div className="pre-form-one-header">
        <h1>Pre-Form One Promotion</h1>
        <p>Select a year to promote Pre-Form One students to Form One</p>
      </div>

      <div className="years-grid">
        {years.map((year) => (
          <Link 
            key={year} 
            to={`/admin/pre-form-one/${year}/promotion`}
            className="year-card"
          >
            <div className="year-card-top">
              <div className="year-icon">
                <i className="fas fa-graduation-cap"></i>
              </div>
              <span className="year-badge">{year}</span>
            </div>
            <div className="year-card-body">
              <h3 className="year-card-title">Pre-Form One Promotion</h3>
              <p className="year-card-desc">Promote Pre-Form One students to Form One</p>
            </div>
            <div className="year-card-footer">
              <span>Open Promotion</span>
              <i className="fas fa-arrow-right"></i>
            </div>
          </Link>
        ))}
      </div>

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

export default PreFormOnePromotionYear;
