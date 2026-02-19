/**
 * Fees Announcements Management Page
 * Manage up to 10 announcements per class
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import './FeesManagement.css';

const FeesManagement = ({ formLevel }) => {
  const { year, stream, term } = useParams();
  const queryClient = useQueryClient();
  
  const [announcements, setAnnouncements] = useState({});

  // Normalize form level
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : '';
  
  const normalizedStream = stream || 'NA';
  // Decode URL-encoded term parameter (e.g., "Term%20II" -> "Term II")
  const decodedTerm = term ? decodeURIComponent(term) : null;
  const normalizedTerm = decodedTerm || 'Term I';

  // Fetch existing announcements
  const { data: existingAnnouncements = {}, isLoading, error } = useQuery({
    queryKey: ['fees-announcements', normalizedLevel, normalizedStream, year, normalizedTerm],
    queryFn: async () => {
      try {
        console.log('[FeesManagement] Fetching announcements:', {
          level: normalizedLevel,
          stream: normalizedStream,
          year: year,
          term: normalizedTerm,
        });
        const res = await studentsAPI.getFeesAnnouncements({
          level: normalizedLevel,
          stream: normalizedStream,
          year: year,
          term: normalizedTerm,
        });
        console.log('[FeesManagement] Received announcements:', res.data.announcements);
        return res.data.announcements || {};
      } catch (error) {
        // Log error for debugging
        console.error('[FeesManagement] Error in queryFn:', error);
        // Re-throw to let React Query handle it properly
        // React Query will catch this and set the error state
        throw error;
      }
    },
    enabled: !!normalizedLevel && !!normalizedStream && !!year && !!normalizedTerm && !!localStorage.getItem('token'),
    retry: (failureCount, error) => {
      // Don't retry on 401 (authentication) or 404 (not found) errors
      if (error?.response?.status === 401 || error?.response?.status === 404) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    onError: (error) => {
      // Handle error gracefully - React Query will set error state
      // Only log non-401 errors (401 means authentication required, which is handled by interceptor)
      if (error?.response?.status !== 401) {
        console.error('[FeesManagement] Query error:', error);
      }
    },
  });

  // Log errors
  useEffect(() => {
    if (error) {
      // Only log non-401 errors (401 is expected when not authenticated)
      if (error?.response?.status !== 401) {
        console.error('[FeesManagement] Error fetching announcements:', error);
      }
    }
  }, [error]);

  // Initialize announcements from existing data
  useEffect(() => {
    // Always set announcements, even if empty (to clear previous term's data)
    setAnnouncements(existingAnnouncements || {});
  }, [existingAnnouncements, normalizedTerm]);

  // Save announcements mutation
  const saveMutation = useMutation({
    mutationFn: async (announcementsData) => {
      return studentsAPI.saveFeesAnnouncements({
        level: normalizedLevel,
        stream: normalizedStream,
        year: parseInt(year),
        term: normalizedTerm,
        announcements: announcementsData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fees-announcements', normalizedLevel, normalizedStream, year, normalizedTerm]);
      toast.success('Fees announcements updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save announcements');
    },
  });

  const handleChange = (index, value) => {
    setAnnouncements({ ...announcements, [index]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(announcements);
  };

  const getBackPath = () => {
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/fees/${formLevel}/stream/${stream}/year/${year}/terms`;
    } else {
      return `/admin/fees/${formLevel}/year/${year}/stream/${stream}/terms`;
    }
  };

  const getOtherTermPath = () => {
    const otherTerm = normalizedTerm === 'Term I' ? 'Term II' : 'Term I';
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/fees/${formLevel}/stream/${stream}/year/${year}/term/${otherTerm}`;
    } else {
      return `/admin/fees/${formLevel}/year/${year}/stream/${stream}/term/${otherTerm}`;
    }
  };

  return (
    <AdminLayout>
      <div className="fees-mgmt-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-money-bill-wave"></i>
            Fees Announcements - {normalizedLevel} {normalizedStream} {year} - {normalizedTerm}
            <div className="header-actions">
              <Link to={getOtherTermPath()} className="excel-btn secondary small">
                <i className="fas fa-exchange-alt"></i> Switch to {normalizedTerm === 'Term I' ? 'Term II' : 'Term I'}
              </Link>
              <Link to={getBackPath()} className="excel-btn secondary small">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : (
              <>
                <p className="fees-description">Enter fees announcements and information for students (up to 10 announcements)</p>
                
                <form onSubmit={handleSubmit} className="fees-form">
                  <div className="table-container">
                    <table className="excel-table announcements-table">
                      <thead>
                        <tr>
                          <th className="table-serial-number">S/N</th>
                          <th>MATANGAZO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((index) => (
                          <tr key={index}>
                            <td className="table-center">{index}</td>
                            <td>
                              <textarea
                                name={`announcement_${index}`}
                                className="announcement-input"
                                placeholder="Enter fees announcement or information..."
                                rows="2"
                                value={announcements[index.toString()] || ''}
                                onChange={(e) => {
                                  e.target.style.height = 'auto';
                                  e.target.style.height = e.target.scrollHeight + 'px';
                                  handleChange(index.toString(), e.target.value);
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="fees-actions">
                    <button type="submit" className="excel-btn primary" disabled={saveMutation.isLoading}>
                      <i className="fas fa-save"></i> {saveMutation.isLoading ? 'Saving...' : 'Save Announcements'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default FeesManagement;

