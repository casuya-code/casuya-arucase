/**
 * Marks Config Landing Page
 * Shows FORM I-VI cards for navigation
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './MarksConfig.css';

const MarksConfig = () => {
  const forms = [
    { id: 'FORM I', label: 'FORM I', path: '/admin/marks-config/form-i/years', icon: 'fa-1' },
    { id: 'FORM II', label: 'FORM II', path: '/admin/marks-config/form-ii/years', icon: 'fa-2' },
    { id: 'FORM III', label: 'FORM III', path: '/admin/marks-config/form-iii/years', icon: 'fa-3' },
    { id: 'FORM IV', label: 'FORM IV', path: '/admin/marks-config/form-iv/years', icon: 'fa-4' },
    { id: 'FORM V', label: 'FORM V', path: '/admin/marks-config/form-v/streams', icon: 'fa-5' },
    { id: 'FORM VI', label: 'FORM VI', path: '/admin/marks-config/form-vi/streams', icon: 'fa-6' },
  ];

  return (
    <AdminLayout>
      <div className="marks-config-page-container">
        <div className="marks-config-card">
          <div className="marks-config-card-header">
            <i className="fas fa-calendar-alt"></i>
            <span>Month Selection & Marks Config</span>
          </div>
          <div className="marks-config-card-body">
            <div className="marks-config-grid">
              {forms.map((form) => (
                <Link
                  key={form.id}
                  to={form.path}
                  className="marks-config-form-card"
                  data-form={form.id}
                  aria-label={`${form.id} Marks Config`}
                >
                  <i className={`fas ${form.icon} marks-config-form-icon`}></i>
                  <div className="marks-config-form-content">
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

export default MarksConfig;
