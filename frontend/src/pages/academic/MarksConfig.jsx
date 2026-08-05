/**
 * Marks Config Landing Page
 * Shows FORM I-VI cards for navigation
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './MarksConfig.css';

const formAccents = {
  'FORM I': '#3b82f6',
  'FORM II': '#10b981',
  'FORM III': '#8b5cf6',
  'FORM IV': '#f59e0b',
  'FORM V': '#ef4444',
  'FORM VI': '#06b6d4',
};

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
      <div className="marks-config-page">
        <div className="marks-config-shell">
          <header className="marks-config-top">
            <div>
              <h1 className="marks-config-top-title">Month Selection & Marks Config</h1>
              <p className="marks-config-top-sub">Select a form to configure monthly assessment weights</p>
            </div>
          </header>

          <div className="marks-config-grid">
            {forms.map((form) => (
              <Link
                key={form.id}
                to={form.path}
                className="marks-config-form-card"
                style={{ '--accent': formAccents[form.id] || '#10b981' }}
                data-form={form.id}
                aria-label={`${form.id} Marks Config`}
              >
                <span className="marks-config-form-icon">
                  <i className={`fas ${form.icon}`} />
                </span>
                <span className="marks-config-form-label">{form.label}</span>
                <span className="marks-config-form-desc">
                  {form.id === 'FORM V' || form.id === 'FORM VI' ? 'Select stream' : 'Select year'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MarksConfig;
