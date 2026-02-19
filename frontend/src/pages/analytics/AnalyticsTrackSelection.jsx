/**
 * Analytics Track Selection Page
 * Based on ANALYTICS_PACKAGE_COMPLETE.md specification
 */
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { normalizeFormLabel } from '../../utils/analyticsUtils';
import './AnalyticsTrack.css';

const AnalyticsTrackSelection = () => {
  const { form } = useParams();
  const formCode = normalizeFormLabel(form);
  
  const tracks = [
    {
      id: 'student-track',
      label: 'STUDENT TRACK',
      description: 'Track individual student performance',
      icon: 'fa-user-graduate',
      path: `/admin/analytics/${encodeURIComponent(form)}/student-track`,
    },
    {
      id: 'class-track',
      label: 'CLASS TRACK',
      description: 'Track class-wide performance metrics',
      icon: 'fa-users',
      path: `/admin/analytics/${encodeURIComponent(form)}/class-track`,
    },
    {
      id: 'subject-track',
      label: 'SUBJECT TRACK',
      description: 'Track subject-specific analytics',
      icon: 'fa-book',
      path: `/admin/analytics/${encodeURIComponent(form)}/subject-track`,
    },
    {
      id: 'who-and-when',
      label: 'WHO AND WHEN',
      description: 'Identify students by performance category and timeline',
      icon: 'fa-user-clock',
      path: `/admin/analytics/${encodeURIComponent(form)}/who-and-when`,
    },
    {
      id: 'solutions',
      label: 'SOLUTIONS',
      description: 'View solutions and recommendations',
      icon: 'fa-lightbulb',
      path: `/admin/analytics/${encodeURIComponent(form)}/solutions`,
    },
  ];

  return (
    <AdminLayout>
      <div className="analytics-track-page">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-chart-line"></i> Analytics - {formCode}
            <div className="header-actions">
              <Link to="/admin/analytics" className="excel-btn secondary small">
                <i className="fas fa-arrow-left"></i> Back to Form Selection
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            <p className="track-selection-instruction">
              Select a tracking option for {formCode}
            </p>
            
            <div className="track-grid">
              {tracks.map((track) => (
                <Link
                  key={track.id}
                  to={track.path}
                  className="track-card"
                  data-track={track.id}
                >
                  <div className="track-icon">
                    <i className={`fas ${track.icon}`}></i>
                  </div>
                  <div className="track-name">{track.label}</div>
                  <div className="track-description">{track.description}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AnalyticsTrackSelection;

