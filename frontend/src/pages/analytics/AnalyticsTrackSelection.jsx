import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { normalizeFormLabel } from '../../utils/analyticsUtils';
import './AnalyticsTrack.css';

const TRACKS = [
  { id: 'student-track', label: 'Student Track', desc: 'Individual student performance', icon: 'fa-user-graduate', color: '#3b82f6' },
  { id: 'class-track', label: 'Class Track', desc: 'Class-wide performance metrics', icon: 'fa-users', color: '#8b5cf6' },
  { id: 'subject-track', label: 'Subject Track', desc: 'Subject-specific analytics', icon: 'fa-book', color: '#f59e0b' },
  { id: 'who-and-when', label: 'Who & When', desc: 'Performance categories & timelines', icon: 'fa-user-clock', color: '#10b981' },
  { id: 'solutions', label: 'Solutions', desc: 'Recommendations & actions', icon: 'fa-lightbulb', color: '#ef4444' },
];

const AnalyticsTrackSelection = () => {
  const { form } = useParams();
  const formCode = normalizeFormLabel(form);

  return (
    <AdminLayout>
      <div className="an-ts-page">
        <div className="an-ts-shell">
          <header className="an-ts-top">
            <div className="an-ts-top-row">
              <div>
                <h1 className="an-ts-title">Analytics</h1>
                <p className="an-ts-sub">{formCode} &mdash; select a tracking option</p>
              </div>
              <Link to="/admin/analytics" className="an-ts-back">
                <i className="fas fa-arrow-left" />
                <span>All Forms</span>
              </Link>
            </div>
          </header>

          <div className="an-ts-grid">
            {TRACKS.map((t) => (
              <Link key={t.id} to={`/admin/analytics/${encodeURIComponent(form)}/${t.id}`} className="an-ts-card">
                <span className="an-ts-icon" style={{ background: `${t.color}14`, color: t.color }}>
                  <i className={`fas ${t.icon}`} />
                </span>
                <span className="an-ts-label">{t.label}</span>
                <span className="an-ts-desc">{t.desc}</span>
                <i className="fas fa-chevron-right an-ts-arrow" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AnalyticsTrackSelection;
