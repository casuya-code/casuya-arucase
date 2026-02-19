/**
 * Analytics Landing Page - Form Selection
 * Based on ANALYTICS_PACKAGE_COMPLETE.md specification
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './Analytics.css';

const Analytics = () => {
  const forms = [
    { id: 'FORM I', label: 'FORM ONE', path: '/admin/analytics/FORM I', icon: 'fa-graduation-cap', isAdvanced: false },
    { id: 'FORM II', label: 'FORM TWO', path: '/admin/analytics/FORM II', icon: 'fa-graduation-cap', isAdvanced: false },
    { id: 'FORM III', label: 'FORM THREE', path: '/admin/analytics/FORM III', icon: 'fa-graduation-cap', isAdvanced: false },
    { id: 'FORM IV', label: 'FORM FOUR', path: '/admin/analytics/FORM IV', icon: 'fa-graduation-cap', isAdvanced: false },
    { id: 'FORM V', label: 'FORM FIVE', path: '/admin/analytics/FORM V', icon: 'fa-user-graduate', isAdvanced: true },
    { id: 'FORM VI', label: 'FORM SIX', path: '/admin/analytics/FORM VI', icon: 'fa-user-graduate', isAdvanced: true },
  ];

  return (
    <AdminLayout>
      <div className="analytics-page">
        <div className="excel-card">
          <div className="excel-card-header excel-card-header-centered">
            <i className="fas fa-search"></i> Select Form
          </div>
          <div className="excel-card-body">
            <p className="analytics-instruction-text">
              Select a form to view analytics and tracking
            </p>
            
            {/* All Forms Averages Link - Prominent Button */}
            <div className="all-forms-button-container">
              <Link to="/admin/analytics/all-forms-averages" className="all-forms-button">
                <i className="fas fa-chart-bar"></i>
                <span>View All Forms Averages (FORM I - VI)</span>
              </Link>
            </div>
            
            <div className="form-grid">
              {forms.map((form) => (
                <Link
                  key={form.id}
                  to={form.path}
                  className="form-card"
                  data-form={form.id}
                >
                  <div className="form-icon">
                    <i className={`fas ${form.icon}`}></i>
                  </div>
                  <div className="form-name">{form.label}</div>
                  {form.isAdvanced && (
                    <div className="form-badge">Advanced</div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Analytics;
