/**
 * Comments Landing Page Component
 * Reusable component for all comment modules
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './CommentsLanding.css';

const CommentsLanding = ({ moduleName, moduleLabel, icon }) => {
  const forms = [
    { id: 'FORM I', label: 'FORM I', path: `/admin/${moduleName}/form-i/years`, icon: 'fa-1' },
    { id: 'FORM II', label: 'FORM II', path: `/admin/${moduleName}/form-ii/years`, icon: 'fa-2' },
    { id: 'FORM III', label: 'FORM III', path: `/admin/${moduleName}/form-iii/years`, icon: 'fa-3' },
    { id: 'FORM IV', label: 'FORM IV', path: `/admin/${moduleName}/form-iv/years`, icon: 'fa-4' },
    { id: 'FORM V', label: 'FORM V', path: `/admin/${moduleName}/form-v/streams`, icon: 'fa-5' },
    { id: 'FORM VI', label: 'FORM VI', path: `/admin/${moduleName}/form-vi/streams`, icon: 'fa-6' },
  ];

  return (
    <AdminLayout>
      <div className="comments-landing-page-container">
        <div className="comments-card">
          <div className="comments-card-header">
            <i className={`fas ${icon}`}></i>
            <span>{moduleLabel}</span>
          </div>
          <div className="comments-card-body">
            <div className="comments-grid">
              {forms.map((form) => (
                <Link
                  key={form.id}
                  to={form.path}
                  className="comments-form-card"
                  data-form={form.id}
                  aria-label={`${form.id} ${moduleLabel}`}
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

export default CommentsLanding;

