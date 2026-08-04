/**
 * Monthly Results Landing Page
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './MonthlyResults.css';

const MonthlyResults = () => {
  const forms = [
    { id: 'FORM I', label: 'Form I', path: '/admin/results/monthly/form-i/years', accent: '#3b82f6' },
    { id: 'FORM II', label: 'Form II', path: '/admin/results/monthly/form-ii/years', accent: '#10b981' },
    { id: 'FORM III', label: 'Form III', path: '/admin/results/monthly/form-iii/years', accent: '#8b5cf6' },
    { id: 'FORM IV', label: 'Form IV', path: '/admin/results/monthly/form-iv/years', accent: '#f59e0b' },
    { id: 'FORM V', label: 'Form V', path: '/admin/results/monthly/form-v/streams', accent: '#ef4444' },
    { id: 'FORM VI', label: 'Form VI', path: '/admin/results/monthly/form-vi/streams', accent: '#06b6d4' },
    { id: 'FORM V COMBINED', label: 'Form V Combined', path: '/admin/results/monthly/form-v/streams?combined=1', accent: '#ec4899' },
    { id: 'FORM VI COMBINED', label: 'Form VI Combined', path: '/admin/results/monthly/form-vi/streams?combined=1', accent: '#14b8a6' },
  ];

  return (
    <AdminLayout>
      <div className="monthly-page">
        <div className="monthly-shell">
          <header className="monthly-top">
            <div>
              <h1 className="monthly-top-title">Monthly Results</h1>
              <p className="monthly-top-sub">Select a form to view or manage monthly test results</p>
            </div>
          </header>

          <div className="monthly-grid">
            {forms.map((form) => (
              <Link
                key={form.id}
                to={form.path}
                className="monthly-form-card"
                style={{ '--accent': form.accent }}
              >
                <span className="monthly-form-icon">
                  <i className="fas fa-clipboard-list" />
                </span>
                <span className="monthly-form-label">{form.label}</span>
                <span className="monthly-form-desc">Monthly Results</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MonthlyResults;

