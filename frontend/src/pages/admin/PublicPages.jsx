/**
 * Public Pages Management - CRUD for all public website pages
 */
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import MDEditor from '@uiw/react-md-editor';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './PublicWebsite.css';

const PublicPages = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editorHeight, setEditorHeight] = useState(400);
  useEffect(() => {
    const isNarrow = () => window.innerWidth <= 768;
    const update = () => setEditorHeight(isNarrow() ? 280 : 400);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const [editingPage, setEditingPage] = useState(null);
  const [formData, setFormData] = useState({
    page_name: '',
    title: '',
    html_content: '',
  });

  // Available public pages for content management
  const availablePages = [
    { name: 'about', label: 'About', icon: 'fa-info-circle', description: 'About Arusha Catholic Seminary', color: 'blue' },
    { name: 'admissions', label: 'Admissions', icon: 'fa-user-plus', description: 'Admission requirements and process', color: 'green' },
    { name: 'staff', label: 'Staff', icon: 'fa-users', description: 'School staff information', color: 'orange' },
    { name: 'student-life', label: 'Student Life', icon: 'fa-heart', description: 'Student life and activities', color: 'red' },
    { name: 'school-fee', label: 'School Fee', icon: 'fa-money-bill-wave', description: 'Fees structure and payment', color: 'green' },
    { name: 'contact', label: 'Contact', icon: 'fa-envelope', description: 'Contact information and form', color: 'green' },
  ];

  // Fetch all public pages
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['admin-public-pages'],
    queryFn: async () => {
      const res = await adminAPI.getPublicPages();
      return res.data.pages || [];
    },
  });

  // Save page mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return adminAPI.savePublicPage(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-public-pages']);
      toast.success(`Page ${editingPage ? 'updated' : 'created'} successfully!`);
      setShowModal(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save page');
    },
  });

  const resetForm = () => {
    setFormData({
      page_name: '',
      title: '',
      html_content: '',
    });
    setEditingPage(null);
  };

  const handleAdd = (pageName) => {
    const pageInfo = availablePages.find(p => p.name === pageName);
    resetForm();
    setFormData({
      page_name: pageName,
      title: pageInfo?.label || pageName,
      html_content: '',
    });
    setShowModal(true);
  };

  const handleEdit = (page) => {
    setEditingPage(page);
    setFormData({
      page_name: page.page_name,
      title: page.title || '',
      html_content: page.html_content || '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.page_name.trim() || !formData.title.trim() || !formData.html_content.trim()) {
      toast.error('Page name, title, and content are required');
      return;
    }
    
    saveMutation.mutate(formData);
  };

  const getPageInfo = (pageName) => {
    return availablePages.find(p => p.name === pageName) || { label: pageName, icon: 'fa-file', description: '', color: 'blue' };
  };

  const getExistingPage = (pageName) => {
    return pages.find(p => p.page_name === pageName);
  };

  return (
    <AdminLayout>
      <div className="public-website-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-globe"></i>
            Public Pages Management
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading pages...</div>
            ) : (
              <>
                <div className="management-grid">
                  {availablePages.map((pageInfo) => {
                    const existingPage = getExistingPage(pageInfo.name);
                    const colorClass = `card-header-gradient-${pageInfo.color || 'blue'}`;
                    return (
                      <div key={pageInfo.name} className="admin-card admin-public-website-card">
                        <i className="fas fa-check-circle admin-public-website-hover-tick"></i>
                        <div className={`admin-card-header ${colorClass}`}>
                          <h3>
                            <i className={`fas ${pageInfo.icon}`}></i>
                            <span>{pageInfo.label}</span>
                          </h3>
                        </div>
                        <div className="admin-card-body">
                          <p>{pageInfo.description}</p>
                          {existingPage ? (
                            <div style={{ marginBottom: '1rem' }}>
                              <span className="status-badge badge-active">
                                <i className="fas fa-check-circle"></i> Content Exists
                              </span>
                            </div>
                          ) : (
                            <div style={{ marginBottom: '1rem' }}>
                              <span className="status-badge badge-warning">
                                <i className="fas fa-exclamation-triangle"></i> No Content
                              </span>
                            </div>
                          )}
                          <div className="public-page-card-actions">
                            {existingPage ? (
                              <button
                                onClick={() => handleEdit(existingPage)}
                                className={`admin-btn admin-btn-${pageInfo.color || 'primary'}`}
                              >
                                <i className="fas fa-edit"></i> Edit
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAdd(pageInfo.name)}
                                className="admin-btn admin-btn-success"
                              >
                                <i className="fas fa-plus"></i> Create
                              </button>
                            )}
                            <a
                              href={`/${pageInfo.name}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-btn admin-btn-purple"
                            >
                              <i className="fas fa-external-link-alt"></i> View
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Modal for editing/creating pages */}
                {showModal && (
                  <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3>
                          <i className={`fas ${getPageInfo(formData.page_name).icon}`}></i>
                          {editingPage ? 'Edit' : 'Create'} {getPageInfo(formData.page_name).label} Page
                        </h3>
                        <button className="modal-close" onClick={() => setShowModal(false)}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
                        <div className="form-group">
                          <label>Page Name</label>
                          <input
                            type="text"
                            value={formData.page_name}
                            readOnly
                            disabled={!!editingPage}
                            className="excel-input"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Title</label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="excel-input"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Page Content</label>
                          <div className="rich-text-editor-wrapper">
                            <MDEditor
                              value={formData.html_content}
                              onChange={(content) => setFormData({ ...formData, html_content: content || '' })}
                              height={editorHeight}
                              preview="edit"
                              hideToolbar={false}
                              visibleDragBar={false}
                            />
                          </div>
                          <small style={{ color: '#6b7280', marginTop: '0.5rem', display: 'block' }}>
                            Use Markdown syntax to format your content. The content will be displayed on the public page.
                          </small>
                        </div>
                        {formData.html_content && (
                          <div className="form-group">
                            <label>Preview</label>
                            <div 
                              className="content-preview"
                              dangerouslySetInnerHTML={{ __html: formData.html_content }}
                            />
                          </div>
                        )}
                        <div className="form-actions">
                          <button type="submit" className="excel-btn primary" disabled={saveMutation.isLoading}>
                            <i className="fas fa-save"></i> {saveMutation.isLoading ? 'Saving...' : 'Save Page'}
                          </button>
                          <button type="button" className="excel-btn secondary" onClick={() => setShowModal(false)}>
                            <i className="fas fa-times"></i> Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PublicPages;

