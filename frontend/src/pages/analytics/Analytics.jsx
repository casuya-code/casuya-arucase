import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './Analytics.css';

const FORMS = [
  { id: 'FORM I', label: 'Form I', path: '/admin/analytics/FORM I' },
  { id: 'FORM II', label: 'Form II', path: '/admin/analytics/FORM II' },
  { id: 'FORM III', label: 'Form III', path: '/admin/analytics/FORM III' },
  { id: 'FORM IV', label: 'Form IV', path: '/admin/analytics/FORM IV' },
  { id: 'FORM V', label: 'Form V', path: '/admin/analytics/FORM V', advanced: true },
  { id: 'FORM VI', label: 'Form VI', path: '/admin/analytics/FORM VI', advanced: true },
];

const Analytics = () => (
  <AdminLayout>
    <div className="an-page">
      <div className="an-shell">
        <header className="an-top">
          <h1 className="an-top-title">Analytics</h1>
          <p className="an-top-sub">Select a form to view performance tracking</p>
        </header>

        <Link to="/admin/analytics/all-forms-averages" className="an-all-btn">
          <i className="fas fa-chart-bar" />
          <span>All Forms Averages</span>
          <i className="fas fa-arrow-right an-all-btn-arrow" />
        </Link>

        <div className="an-grid">
          {FORMS.map((f) => (
            <Link key={f.id} to={f.path} className="an-card">
              <span className="an-card-icon">
                <i className={`fas ${f.advanced ? 'fa-user-graduate' : 'fa-graduation-cap'}`} />
              </span>
              <span className="an-card-label">{f.label}</span>
              {f.advanced && <span className="an-card-badge">A-Level</span>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  </AdminLayout>
);

export default Analytics;
