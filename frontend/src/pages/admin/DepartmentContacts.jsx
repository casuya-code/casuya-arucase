/**
 * Department Contacts Management Page
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './PublicWebsite.css';

const DepartmentContacts = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    admissions_email: '',
    academics_email: '',
    bursar_email: '',
    alumni_email: '',
    parents_email: '',
  });

  // Fetch department contacts
  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['admin-department-contacts'],
    queryFn: async () => {
      const res = await adminAPI.getDepartmentContacts();
      return res.data.contacts || {};
    },
  });

  // Initialize form data when contacts load
  useEffect(() => {
    if (contactsData) {
      setFormData({
        admissions_email: contactsData.admissions_email || '',
        academics_email: contactsData.academics_email || '',
        bursar_email: contactsData.bursar_email || '',
        alumni_email: contactsData.alumni_email || '',
        parents_email: contactsData.parents_email || '',
      });
    }
  }, [contactsData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return adminAPI.updateDepartmentContacts(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-department-contacts']);
      toast.success('Department contacts updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update department contacts');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <AdminLayout>
      <div className="public-website-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-building"></i>
            Department Contacts Management
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading department contacts...</div>
            ) : (
              <form onSubmit={handleSubmit} className="department-contacts-form">
                <div className="form-section">
                  <h3>Department Email Addresses</h3>
                  <p className="section-description">
                    Configure email addresses for different departments. These will be displayed on relevant public pages.
                  </p>
                  
                  <div className="form-group">
                    <label>Admissions Email</label>
                    <input
                      type="email"
                      value={formData.admissions_email}
                      onChange={(e) => setFormData({ ...formData, admissions_email: e.target.value })}
                      className="excel-input"
                      placeholder="admissions@school.edu"
                    />
                  </div>

                  <div className="form-group">
                    <label>Academics Email</label>
                    <input
                      type="email"
                      value={formData.academics_email}
                      onChange={(e) => setFormData({ ...formData, academics_email: e.target.value })}
                      className="excel-input"
                      placeholder="academics@school.edu"
                    />
                  </div>

                  <div className="form-group">
                    <label>Bursar Email</label>
                    <input
                      type="email"
                      value={formData.bursar_email}
                      onChange={(e) => setFormData({ ...formData, bursar_email: e.target.value })}
                      className="excel-input"
                      placeholder="bursar@school.edu"
                    />
                  </div>

                  <div className="form-group">
                    <label>Alumni Email</label>
                    <input
                      type="email"
                      value={formData.alumni_email}
                      onChange={(e) => setFormData({ ...formData, alumni_email: e.target.value })}
                      className="excel-input"
                      placeholder="alumni@school.edu"
                    />
                  </div>

                  <div className="form-group">
                    <label>Parents Email</label>
                    <input
                      type="email"
                      value={formData.parents_email}
                      onChange={(e) => setFormData({ ...formData, parents_email: e.target.value })}
                      className="excel-input"
                      placeholder="parents@school.edu"
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="excel-btn primary" disabled={saveMutation.isLoading}>
                      <i className="fas fa-save"></i> {saveMutation.isLoading ? 'Saving...' : 'Save Department Contacts'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DepartmentContacts;
