/**
 * Teachers Management Landing Page
 * Shows FORM I-VI cards for navigation
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './Teachers.css';

const Teachers = () => {
  const forms = [
    { id: 'FORM I', label: 'Form I', path: '/admin/teachers/form-i/years', icon: 'fa-1', accent: '#3b82f6' },
    { id: 'FORM II', label: 'Form II', path: '/admin/teachers/form-ii/years', icon: 'fa-2', accent: '#10b981' },
    { id: 'FORM III', label: 'Form III', path: '/admin/teachers/form-iii/years', icon: 'fa-3', accent: '#8b5cf6' },
    { id: 'FORM IV', label: 'Form IV', path: '/admin/teachers/form-iv/years', icon: 'fa-4', accent: '#f59e0b' },
    { id: 'FORM V', label: 'Form V', path: '/admin/teachers/form-v/streams', icon: 'fa-5', accent: '#ef4444' },
    { id: 'FORM VI', label: 'Form VI', path: '/admin/teachers/form-vi/streams', icon: 'fa-6', accent: '#06b6d4' },
  ];

  return (
    <AdminLayout>
      <div className="teachers-page">
        <div className="teachers-shell">
          <header className="teachers-top">
            <div>
              <h1 className="teachers-top-title">Subject Teachers</h1>
              <p className="teachers-top-sub">Select a form level to manage teacher assignments</p>
            </div>
          </header>

          <div className="teachers-grid">
            {forms.map((form) => (
              <Link
                key={form.id}
                to={form.path}
                className="teachers-form-card"
                style={{ '--accent': form.accent }}
                aria-label={`${form.label} Subject Teachers`}
              >
                <span className="teachers-form-icon">
                  <i className={`fas ${form.icon}`} />
                </span>
                <span className="teachers-form-label">{form.label}</span>
                <span className="teachers-form-desc">Subject Teachers</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Teachers;
