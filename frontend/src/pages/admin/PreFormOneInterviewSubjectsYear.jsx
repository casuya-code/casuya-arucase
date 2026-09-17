import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getSchoolYearOptions } from '../../utils/academicYearUtils';
import { useGoBack } from '../../hooks/useGoBack';
import './PreFormOne.css';
import './preform-one-modern.css';

const PreFormOneInterviewSubjectsYear = () => {
  const years = [...getSchoolYearOptions()].reverse();
  const goBack = useGoBack('/admin');

  return (
    <AdminLayout>
    <div className="pre-form-one-page">
      <div className="pre-form-one-header">
        <h1>Pre-Form One Interview Subjects</h1>
        <p>Select a year to manage interview subjects</p>
      </div>

      <div className="years-grid">
        {years.map((year) => (
          <Link 
            key={year} 
            to={`/admin/pre-form-one/${year}/interview-subjects`}
            className="year-card"
          >
            <div className="year-card-top">
              <div className="year-icon">
                <i className="fas fa-book"></i>
              </div>
              <span className="year-badge">{year}</span>
            </div>
            <div className="year-card-body">
              <h3 className="year-card-title">Interview Subjects</h3>
              <p className="year-card-desc">Manage interview subjects for {year}</p>
            </div>
            <div className="year-card-footer">
              <span>Open Subjects</span>
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

export default PreFormOneInterviewSubjectsYear;
