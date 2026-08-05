/**
 * News & Announcements Management Page
 */
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './News.css';

const News = () => {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const defaultFormData = useMemo(() => ({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0],
    priority: 'normal',
    type: 'General Announcement',
  }), []);

  const [formData, setFormData] = useState(defaultFormData);

  // Fetch announcements
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await adminAPI.getAnnouncements();
      return res.data.announcements || [];
    },
  });

  // Generate announcement ID
  const { data: generatedId } = useQuery({
    queryKey: ['announcement-id'],
    queryFn: async () => {
      const res = await adminAPI.generateAnnouncementId();
      return res.data.id;
    },
    enabled: showAddForm,
  });

  // Save announcement mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return adminAPI.saveAnnouncement({
        ...data,
        id: generatedId || `ann_${Date.now()}`,
        active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements']);
      toast.success('Announcement published successfully!');
      setShowAddForm(false);
      setFormData(defaultFormData);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save announcement');
    },
  });

  // Delete announcement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return adminAPI.deleteAnnouncement(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements']);
      toast.success('Announcement deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete announcement');
    },
  });

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    saveMutation.mutate(formData);
  }, [formData, saveMutation]);

  const handleDelete = useCallback((id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  const getPriorityClass = useCallback((priority) => {
    const p = priority?.toLowerCase() || 'normal';
    if (p === 'high') return 'priority-high';
    if (p === 'low') return 'priority-low';
    return 'priority-normal';
  }, []);

  const priorityLabel = useCallback((priority) => {
    const p = priority?.toLowerCase() || 'normal';
    if (p === 'high') return 'High';
    if (p === 'low') return 'Low';
    return 'Normal';
  }, []);

  return (
    <AdminLayout>
      <div className="news-page">
        <div className="news-shell">
          <header className="news-top">
            <div>
              <h1 className="news-top-title">News &amp; Announcements</h1>
              <p className="news-top-sub">Publish and manage announcements shown on the website</p>
            </div>
            <div className="news-top-actions">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="excel-btn primary"
              >
                <i className="fas fa-plus"></i> {showAddForm ? 'Cancel' : 'Add New'}
              </button>
            </div>
          </header>

          {isLoading ? (
            <div className="news-loading">
              <i className="fas fa-spinner fa-spin"></i> Loading announcements…
            </div>
          ) : (
            <>
              {showAddForm && (
                <div className="excel-card" style={{ '--accent': '#3b82f6' }}>
                  <div className="excel-card-header">
                    <i className="fas fa-bullhorn"></i> Add New Announcement
                  </div>
                  <div className="excel-card-body">
                    <form onSubmit={handleSubmit}>
                      <div className="form-row">
                        <div className="form-group form-group--wide">
                          <label>Title *</label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="excel-input"
                            placeholder="e.g. Mid-term examinations schedule"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Priority *</label>
                          <select
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            className="excel-input"
                            required
                          >
                            <option value="High">High</option>
                            <option value="normal">Normal</option>
                            <option value="Low">Low</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Date *</label>
                          <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="excel-input"
                            required
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Content *</label>
                        <textarea
                          value={formData.content}
                          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                          className="excel-input"
                          rows="4"
                          required
                        />
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="excel-btn primary" disabled={saveMutation.isLoading}>
                          <i className="fas fa-save"></i> {saveMutation.isLoading ? 'Publishing…' : 'Publish Announcement'}
                        </button>
                        <button type="button" onClick={() => setShowAddForm(false)} className="excel-btn secondary">
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="excel-card">
                <div className="excel-card-header">
                  <i className="fas fa-newspaper"></i> Latest News and Announcements
                  <span className="excel-card-count">{announcements.length}</span>
                </div>
                <div className="excel-card-body">
                  <div className="announcements-table-container">
                    <table className="excel-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Content</th>
                          <th>Date</th>
                          <th>Priority</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {announcements.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="empty-table-message">
                              No announcements yet. Add your first announcement.
                            </td>
                          </tr>
                        ) : (
                          announcements.map((item) => (
                            <tr key={item.id}>
                              <td className="news-id">{item.id}</td>
                              <td><strong>{item.title}</strong></td>
                              <td className="news-content">{item.content}</td>
                              <td className="news-date">{item.date}</td>
                              <td>
                                <span className={`priority-badge ${getPriorityClass(item.priority)}`}>
                                  {priorityLabel(item.priority)}
                                </span>
                              </td>
                              <td>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="excel-btn danger small"
                                >
                                  <i className="fas fa-trash"></i> Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default News;
