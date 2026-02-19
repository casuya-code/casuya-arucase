import AdminLayout from '../../components/layout/AdminLayout';

const Announcements = () => {
  return (
    <AdminLayout>
      <div style={{ padding: '2rem' }}>
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-bullhorn"></i>
            Manage Announcements
          </div>
          <div className="excel-card-body">
            <p style={{ marginBottom: '1.5rem', color: '#656d76' }}>
              Create, edit, and delete public announcements
            </p>
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              <i className="fas fa-bullhorn" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
              <h3>Announcement Management</h3>
              <p>Announcement management interface coming soon.</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Announcements;

