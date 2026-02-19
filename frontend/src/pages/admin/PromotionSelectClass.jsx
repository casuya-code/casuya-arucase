/**
 * Promotion Class Selection Page
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import '../comments/CommentsLanding.css';

const PromotionSelectClass = () => {
  const forms = [
    { id: 'FORM I', label: 'FORM I', path: '/admin/promotion/form-i/years', icon: 'fa-1' },
    { id: 'FORM II', label: 'FORM II', path: '/admin/promotion/form-ii/years', icon: 'fa-2' },
    { id: 'FORM III', label: 'FORM III', path: '/admin/promotion/form-iii/years', icon: 'fa-3' },
    { id: 'FORM IV', label: 'FORM IV', path: '/admin/promotion/form-iv/years', icon: 'fa-4' },
    { id: 'FORM V', label: 'FORM V', path: '/admin/promotion/form-v/streams', icon: 'fa-5' },
    { id: 'FORM VI', label: 'FORM VI', path: '/admin/promotion/form-vi/streams', icon: 'fa-6' },
  ];

  return (
    <AdminLayout>
      <div className="comments-landing-page-container">
        <div className="comments-card">
          <div className="comments-card-header">
            <i className="fas fa-graduation-cap"></i>
            <span>Select Class for Promotion</span>
            <div className="header-actions">
              <Link to="/admin/promotion" className="excel-btn secondary small">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="comments-card-body">
            <div className="comments-grid">
              {forms.map((form) => (
                <Link
                  key={form.id}
                  to={form.path}
                  className="comments-form-card"
                  data-form={form.id}
                >
                  <i className={`fas ${form.icon} comments-form-icon`}></i>
                  <div className="comments-form-content">
                    <h3>{form.label}</h3>
                    <p>{form.id === 'FORM V' || form.id === 'FORM VI' ? 'Select stream' : 'Select year'}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PromotionSelectClass;

