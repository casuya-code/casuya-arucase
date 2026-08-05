/**
 * Student Promotion Dashboard
 */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './Promotion.css';

const Promotion = () => {
  // Fetch promotion sessions
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['promotion-sessions'],
    queryFn: async () => {
      const res = await adminAPI.getPromotionDashboard();
      return res.data.sessions || [];
    },
  });

  // Memoize computed stats to prevent recalculation on every render
  const totalPromoted = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.promoted_count || 0), 0),
    [sessions]
  );

  return (
    <AdminLayout>
      <div className="promotion-page">
        <div className="promotion-shell">
          <header className="promotion-top">
            <div>
              <h1 className="promotion-top-title">
                <i className="fas fa-graduation-cap promotion-top-icon" aria-hidden></i>
                Student Promotion Dashboard
              </h1>
              <p className="promotion-top-sub">Promote students to the next class and view promotion history</p>
            </div>
            <div className="promotion-top-actions">
              <Link to="/admin/promotion/select-class" className="excel-btn primary">
                <i className="fas fa-user-graduate"></i> Promote Students
              </Link>
            </div>
          </header>

          <div className="promotion-stats">
            <div className="stat-card" style={{ '--accent': '#3b82f6' }}>
              <span className="stat-icon">
                <i className="fas fa-history"></i>
              </span>
              <div className="stat-content">
                <h3>{sessions.length}</h3>
                <p>Total Sessions</p>
              </div>
            </div>
            <div className="stat-card" style={{ '--accent': '#10b981' }}>
              <span className="stat-icon">
                <i className="fas fa-users"></i>
              </span>
              <div className="stat-content">
                <h3>{totalPromoted}</h3>
                <p>Students Promoted</p>
              </div>
            </div>
          </div>

          <div className="excel-card" style={{ '--accent': '#8b5cf6' }}>
            <div className="excel-card-header">
              <i className="fas fa-list-alt"></i> Recent Promotion Sessions
              <span className="excel-card-count">{sessions.length}</span>
            </div>
            <div className="excel-card-body">
              {isLoading ? (
                <div className="promotion-loading">
                  <i className="fas fa-spinner fa-spin"></i> Loading promotion history…
                </div>
              ) : sessions.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-graduation-cap empty-icon"></i>
                  <p>No promotion sessions yet</p>
                  <Link to="/admin/promotion/select-class" className="excel-btn primary">
                    <i className="fas fa-user-graduate"></i> Start First Promotion
                  </Link>
                </div>
              ) : (
                <div className="sessions-table-container">
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Total Students</th>
                        <th>Promoted</th>
                        <th>Excluded</th>
                        <th>Created By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id}>
                          <td>{new Date(session.created_at).toLocaleDateString()}</td>
                          <td>
                            {session.from_level} {session.from_stream} {session.from_year}
                          </td>
                          <td>
                            {session.to_level} {session.to_stream} {session.to_year}
                          </td>
                          <td>{session.total_students}</td>
                          <td className="success-text">{session.promoted_count}</td>
                          <td className="warning-text">{session.excluded_count}</td>
                          <td>{session.created_by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Promotion;
