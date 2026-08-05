/**
 * Comments Landing Page Component
 * Reusable component for all comment modules
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './CommentsLanding.css';

const CommentsLanding = ({ moduleName, moduleLabel, icon }) => {
  const forms = [
    { id: 'FORM I', label: 'Form I', path: `/admin/${moduleName}/form-i/years`, icon: 'fa-1', accent: '#3b82f6' },
    { id: 'FORM II', label: 'Form II', path: `/admin/${moduleName}/form-ii/years`, icon: 'fa-2', accent: '#10b981' },
    { id: 'FORM III', label: 'Form III', path: `/admin/${moduleName}/form-iii/years`, icon: 'fa-3', accent: '#8b5cf6' },
    { id: 'FORM IV', label: 'Form IV', path: `/admin/${moduleName}/form-iv/years`, icon: 'fa-4', accent: '#f59e0b' },
    { id: 'FORM V', label: 'Form V', path: `/admin/${moduleName}/form-v/streams`, icon: 'fa-5', accent: '#ef4444' },
    { id: 'FORM VI', label: 'Form VI', path: `/admin/${moduleName}/form-vi/streams`, icon: 'fa-6', accent: '#06b6d4' },
  ];

  return (
    <AdminLayout>
      <div className="comments-landing-page">
        <div className="comments-landing-shell">
          <header className="comments-landing-top">
            <div>
              <h1 className="comments-landing-title">
                <i className={`fas ${icon} comments-landing-title-icon`} aria-hidden></i>
                {moduleLabel}
              </h1>
              <p className="comments-landing-sub">Select a form to view or manage {moduleLabel.toLowerCase()}</p>
            </div>
          </header>

          <div className="comments-grid">
            {forms.map((form) => (
              <Link
                key={form.id}
                to={form.path}
                className="comments-form-card"
                style={{ '--accent': form.accent }}
                aria-label={`${form.id} ${moduleLabel}`}
              >
                <span className="comments-form-icon">
                  <i className={`fas ${form.icon}`}></i>
                </span>
                <div className="comments-form-content">
                  <h3>{form.label}</h3>
                  <p>{form.id === 'FORM V' || form.id === 'FORM VI' ? 'Select stream' : 'Select year'}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CommentsLanding;
