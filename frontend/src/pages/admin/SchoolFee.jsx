/**
 * School Fee Page Management
 * Manage the public School Fee page content
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import Loading from '../../components/common/Loading';
import './PublicWebsite.css';

const SchoolFee = () => {
  const queryClient = useQueryClient();
  const [htmlContent, setHtmlContent] = useState('');
  const [title, setTitle] = useState('School Fee');

  // Fetch existing page content
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['public-page', 'school-fee'],
    queryFn: async () => {
      try {
        const res = await adminAPI.getPublicPage('school-fee');
        return res.data;
      } catch (error) {
        // Page doesn't exist yet, return null
        return null;
      }
    },
    retry: false,
  });

  // Update local state when data loads
  useEffect(() => {
    if (pageData?.page) {
      setHtmlContent(pageData.page.html_content || pageData.page.content || '');
      setTitle(pageData.page.title || 'School Fee');
    }
  }, [pageData]);

  // Save page content
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return await adminAPI.savePublicPage({
        page_name: 'school-fee',
        title: data.title,
        html_content: data.html_content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['public-page', 'school-fee']);
      alert('School Fee page content saved successfully!');
    },
    onError: (error) => {
      alert('Error saving page: ' + (error.response?.data?.message || error.message));
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      title,
      html_content: htmlContent,
    });
  };

  const handlePreview = () => {
    window.open('/school-fee', '_blank');
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <Loading message="Loading School Fee page..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="public-website-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-money-bill-wave"></i>
            School Fee Page Management
            <div className="header-actions">
              <Link to="/admin" className="excel-btn secondary small">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            <p style={{ marginBottom: '2rem', color: '#656d76', textAlign: 'center' }}>
              Manage the public School Fee page content that appears on the website
            </p>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Page Title:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="excel-input"
                placeholder="School Fee"
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Page Content (HTML):
              </label>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="excel-input"
                rows={20}
                placeholder="Enter HTML content for the School Fee page..."
                style={{ fontFamily: 'monospace', fontSize: '14px' }}
              />
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#656d76' }}>
                You can use HTML tags to format the content. For example: &lt;h1&gt;Heading&lt;/h1&gt;, &lt;p&gt;Paragraph&lt;/p&gt;, &lt;ul&gt;&lt;li&gt;List item&lt;/li&gt;&lt;/ul&gt;
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handlePreview}
                className="excel-btn secondary"
                type="button"
              >
                <i className="fas fa-eye"></i> Preview
              </button>
              <button
                onClick={handleSave}
                className="excel-btn primary"
                disabled={saveMutation.isLoading}
                type="button"
              >
                <i className="fas fa-save"></i> {saveMutation.isLoading ? 'Saving...' : 'Save Page'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SchoolFee;

