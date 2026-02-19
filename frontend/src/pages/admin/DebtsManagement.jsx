/**
 * Individual Debt Management Page
 * Track and manage student debt records with CSV import/export
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import './DebtsManagement.css';

const DebtsManagement = ({ formLevel }) => {
  const { year, stream } = useParams();
  const queryClient = useQueryClient();
  
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Normalize form level to uppercase (consistent with backend and other components)
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').toUpperCase()
    : '';
  
  const normalizedStream = stream || 'NA';

  // Helper function to sort students by name: first_name, then middle_name, then surname (A-Z)
  const sortStudentsByName = (students) => {
    return [...students].sort((a, b) => {
      // Sort by first_name first
      const firstNameA = String(a.first_name || '').toLowerCase().trim();
      const firstNameB = String(b.first_name || '').toLowerCase().trim();
      const firstNameCompare = firstNameA.localeCompare(firstNameB, undefined, { sensitivity: 'base' });
      if (firstNameCompare !== 0) return firstNameCompare;
      
      // If first names are equal, sort by middle_name
      const middleNameA = String(a.middle_name || '').toLowerCase().trim();
      const middleNameB = String(b.middle_name || '').toLowerCase().trim();
      const middleNameCompare = middleNameA.localeCompare(middleNameB, undefined, { sensitivity: 'base' });
      if (middleNameCompare !== 0) return middleNameCompare;
      
      // If middle names are equal, sort by surname
      const surnameA = String(a.surname || '').toLowerCase().trim();
      const surnameB = String(b.surname || '').toLowerCase().trim();
      return surnameA.localeCompare(surnameB, undefined, { sensitivity: 'base' });
    });
  };

  // Fetch students for this class - sorted by name: first_name, then middle_name, then surname (A-Z)
  const { data: studentsData = [], isLoading: studentsLoading, error: studentsError } = useQuery({
    queryKey: ['students', normalizedLevel, normalizedStream, year],
    queryFn: async () => {
      const res = await studentsAPI.getStudents({
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
      });
      const students = res.data.students || [];
      // Sort students by name: first_name, then middle_name, then surname (A-Z)
      return sortStudentsByName(students);
    },
  });
  
  const students = studentsData;

  // Fetch existing debt records
  const { data: existingDebt = {}, isLoading: debtLoading, error: debtError } = useQuery({
    queryKey: ['debt', normalizedLevel, normalizedStream, year],
    queryFn: async () => {
      console.log('[DebtsManagement] Fetching debt:', {
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
      });
      try {
        const res = await studentsAPI.getDebt({
          level: normalizedLevel,
          stream: normalizedStream,
          year: year,
        });
        console.log('[DebtsManagement] Received debt:', res.data.debt);
        return res.data.debt || {};
      } catch (error) {
        // Log error for debugging
        console.error('[DebtsManagement] Error in queryFn:', error);
        // Re-throw to let React Query handle it properly
        // React Query will catch this and set the error state
        throw error;
      }
    },
    enabled: students.length > 0,
    retry: (failureCount, error) => {
      // Don't retry on 404 (no debt records found is expected)
      if (error?.response?.status === 404) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    onError: (error) => {
      // Handle error gracefully - React Query will set error state
      // Only log non-404 errors (404 means no debt records exist, which is fine)
      if (error?.response?.status !== 404) {
        console.error('[DebtsManagement] Query error:', error);
      }
    },
  });

  // Log errors
  useEffect(() => {
    if (debtError) {
      // Only log non-404 errors (404 is expected when no debt records exist)
      if (debtError?.response?.status !== 404) {
        console.error('[DebtsManagement] Error fetching debt:', debtError);
      }
    }
  }, [debtError]);

  // Save debt mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return studentsAPI.saveDebt({
        level: normalizedLevel,
        stream: normalizedStream,
        year: parseInt(year),
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['debt', normalizedLevel, normalizedStream, year]);
      toast.success('Debt record updated successfully!');
      setEditingIndex(null);
      setEditForm({});
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save debt record');
    },
  });

  // Delete debt mutation
  const deleteMutation = useMutation({
    mutationFn: async (studentIndex) => {
      return studentsAPI.deleteDebt({
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
        student_index: studentIndex,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['debt', normalizedLevel, normalizedStream, year]);
      toast.success('Debt record deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete debt record');
    },
  });

  const handleEdit = (studentIndex) => {
    const debt = existingDebt[studentIndex] || {};
    setEditingIndex(studentIndex);
    setEditForm({
      student_index: studentIndex,
      amount: debt.amount || 0,
      description: debt.description || '',
    });
  };

  const handleSave = (studentIndex) => {
    if (editForm.amount < 0) {
      toast.error('Amount must be non-negative');
      return;
    }
    saveMutation.mutate(editForm);
  };

  const handleDelete = (studentIndex) => {
    if (window.confirm('Are you sure you want to delete this debt record?')) {
      deleteMutation.mutate(studentIndex);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm({});
  };

  const formatAmount = (amount) => {
    if (!amount || amount === 0) return 'No debt';
    return new Intl.NumberFormat('en-TZ').format(amount);
  };

  const getBackPath = () => {
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/debts/${formLevel}/stream/${stream}/years`;
    } else {
      return `/admin/debts/${formLevel}/years`;
    }
  };

  // Calculate student index (position in sorted list)
  // Students are sorted by name: first_name, then middle_name, then surname (A-Z)
  const getStudentIndex = (student) => {
    const sortedStudents = sortStudentsByName(students);
    return sortedStudents.findIndex(s => s.adm_no === student.adm_no).toString();
  };

  return (
    <AdminLayout>
      <div className="debts-mgmt-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-money-bill-wave"></i>
            Student Debt - {normalizedLevel} {normalizedStream} {year}
            <div className="header-actions">
              <Link to={getBackPath()} className="excel-btn secondary small">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {studentsLoading || debtLoading ? (
              <div className="loading-state">Loading...</div>
            ) : studentsError ? (
              <div className="empty-state">
                <i className="fas fa-exclamation-triangle empty-icon"></i>
                <h3>Error Loading Students</h3>
                <p>{studentsError.response?.data?.message || studentsError.message || 'Failed to load students. Please try again.'}</p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                  Debug: Level={normalizedLevel} | Stream={normalizedStream} | Year={year}
                </p>
              </div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-money-bill-wave empty-icon"></i>
                <h3>No Students Found</h3>
                <p>No students have been registered for this class yet.</p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                  Debug: Level={normalizedLevel} | Stream={normalizedStream} | Year={year}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="table-container">
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th>S/N</th>
                        <th>Adm No</th>
                        <th>First Name</th>
                        <th>Middle Name</th>
                        <th>Surname</th>
                        <th>Sex</th>
                        <th>Year</th>
                        <th>Debt Amount (TZS)</th>
                        <th>Description</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => {
                        const studentIndex = getStudentIndex(student);
                        const debt = existingDebt[studentIndex];
                        const isEditing = editingIndex === studentIndex;
                        
                        return (
                          <tr key={student.adm_no}>
                            <td>{index + 1}</td>
                            <td>{student.adm_no}</td>
                            <td>{student.first_name}</td>
                            <td>{student.middle_name || '-'}</td>
                            <td>{student.surname}</td>
                            <td>{student.sex}</td>
                            <td>{student.year}</td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editForm.amount || 0}
                                  onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                                  className="debt-input"
                                />
                              ) : (
                                <span className={debt?.amount > 0 ? 'debt-amount' : 'text-muted'}>
                                  {debt?.amount > 0 ? formatAmount(debt.amount) : 'No debt'}
                                </span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.description || ''}
                                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                  className="debt-input"
                                  placeholder="Description"
                                />
                              ) : (
                                <span className={debt?.description ? 'debt-text' : 'text-muted'}>
                                  {debt?.description || '-'}
                                </span>
                              )}
                            </td>
                            <td className="actions-col">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSave(studentIndex)}
                                    className="action-btn save-btn"
                                    disabled={saveMutation.isLoading}
                                  >
                                    <i className="fas fa-save"></i>
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className="action-btn cancel-btn"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(studentIndex)}
                                    className="action-btn edit-btn"
                                  >
                                    <i className="fas fa-edit"></i> Edit
                                  </button>
                                  {debt?.amount > 0 && (
                                    <button
                                      onClick={() => handleDelete(studentIndex)}
                                      className="action-btn delete-btn"
                                    >
                                      <i className="fas fa-trash"></i> Delete
                                    </button>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="mobile-students-list">
                  {students.map((student, index) => {
                    const studentIndex = getStudentIndex(student);
                    const debt = existingDebt[studentIndex];
                    const isEditing = editingIndex === studentIndex;
                    
                    return (
                      <div key={student.adm_no} className="mobile-student-card">
                        <div className="mobile-student-card-header">
                          <div className="student-info">
                            <div className="student-name">
                              {index + 1}. {student.first_name} {student.middle_name || ''} {student.surname}
                            </div>
                            <div className="student-adm">Adm No: {student.adm_no}</div>
                          </div>
                        </div>
                        <div className="mobile-student-card-body">
                          <div className="mobile-student-field">
                            <span className="mobile-student-field-label">Sex</span>
                            <span className="mobile-student-field-value">{student.sex}</span>
                          </div>
                          <div className="mobile-student-field">
                            <span className="mobile-student-field-label">Year</span>
                            <span className="mobile-student-field-value">{student.year}</span>
                          </div>
                          <div className="mobile-student-field">
                            <span className="mobile-student-field-label">Debt Amount</span>
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editForm.amount || 0}
                                onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                                className="debt-input"
                                style={{ maxWidth: '150px', textAlign: 'right' }}
                              />
                            ) : (
                              <span className={debt?.amount > 0 ? 'mobile-student-field-value debt-amount' : 'mobile-student-field-value text-muted'}>
                                {debt?.amount > 0 ? formatAmount(debt.amount) : 'No debt'}
                              </span>
                            )}
                          </div>
                          <div className="mobile-student-field">
                            <span className="mobile-student-field-label">Description</span>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editForm.description || ''}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                className="debt-input"
                                placeholder="Description"
                                style={{ maxWidth: '200px' }}
                              />
                            ) : (
                              <span className={debt?.description ? 'mobile-student-field-value debt-text' : 'mobile-student-field-value text-muted'}>
                                {debt?.description || '-'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mobile-student-actions">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSave(studentIndex)}
                                className="action-btn save-btn"
                                disabled={saveMutation.isLoading}
                              >
                                <i className="fas fa-save"></i> Save
                              </button>
                              <button
                                onClick={handleCancel}
                                className="action-btn cancel-btn"
                              >
                                <i className="fas fa-times"></i> Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(studentIndex)}
                                className="action-btn edit-btn"
                              >
                                <i className="fas fa-edit"></i> Edit
                              </button>
                              {debt?.amount > 0 && (
                                <button
                                  onClick={() => handleDelete(studentIndex)}
                                  className="action-btn delete-btn"
                                >
                                  <i className="fas fa-trash"></i> Delete
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="csv-section">
                  <h3><i className="fas fa-file-csv"></i> CSV Bulk Operations</h3>
                  <p className="csv-help">
                    Download template CSV, fill in debt amounts and descriptions, then upload to bulk update all student debt records.
                  </p>
                  <div className="csv-actions">
                    <button className="excel-btn primary">
                      <i className="fas fa-download"></i> Download Template CSV
                    </button>
                    <button className="excel-btn success">
                      <i className="fas fa-upload"></i> Upload CSV
                    </button>
                    <button className="excel-btn secondary">
                      <i className="fas fa-download"></i> Download Filled CSV
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DebtsManagement;

