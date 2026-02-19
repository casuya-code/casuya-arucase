/**
 * Teachers Management Page
 * Allows assigning teachers to subjects
 */
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import api from '../../services/api';
import { requiresSpecialAcademicYearLogic, getApiYearForFormVVI } from '../../utils/academicYearUtils';
import './TeachersManagement.css';

const TeachersManagement = ({ formLevel, stream: streamProp }) => {
  const { year, stream: streamParam } = useParams();
  // For FORM I-IV, stream comes from prop; for FORM V-VI, it comes from URL params
  const stream = streamParam || streamProp || 'A';
  const queryClient = useQueryClient();
  
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({
    teacher_name: '',
    teacher_signature: '',
  });

  // Normalize form level (convert to uppercase: "form-i" -> "FORM I")
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.toUpperCase()).join(' ')
    : '';
  
  // Normalize stream: use 'A' as default for Form I-IV (previously 'NA')
  // Note: All "NA" stream values have been normalized to "A" in the database
  const normalizedStream = stream || 'A';

  // For Form V-VI, convert display year to API year (academic year start year)
  // Example: If user selects 2026, query for 2025 (academic year start)
  const apiYear = (() => {
    if (requiresSpecialAcademicYearLogic(normalizedLevel)) {
      const yearNum = parseInt(year, 10);
      if (!isNaN(yearNum)) {
        return getApiYearForFormVVI(yearNum, normalizedLevel);
      }
    }
    return year;
  })();

  // Fetch subjects for this class
  // For Form V-VI, use apiYear (academic year start) instead of display year
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects', normalizedLevel, normalizedStream, apiYear],
    queryFn: async () => {
      const res = await studentsAPI.getSubjects({
        level: normalizedLevel,
        stream: normalizedStream,
        year: apiYear,
      });
      return res.data.subjects || [];
    },
  });

  // Fetch teachers for this class
  // For Form V-VI, use apiYear (academic year start) instead of display year
  const { data: teachers = {}, isLoading: teachersLoading, error: teachersError } = useQuery({
    queryKey: ['teachers', normalizedLevel, normalizedStream, apiYear],
    queryFn: async () => {
      try {
        const res = await studentsAPI.getTeachers({
          level: normalizedLevel,
          stream: normalizedStream,
          year: apiYear,
        });
        
        return res.data?.teachers || {};
      } catch (error) {
        console.error('TeachersManagement: Error fetching teachers', error);
        throw error;
      }
    },
    enabled: !!normalizedLevel && !!normalizedStream && !!apiYear,
    retry: false,
  });

  // Save teacher mutation
  // For Form V-VI, use apiYear (academic year start) instead of display year
  const saveMutation = useMutation({
    mutationFn: async ({ subjectCode, data }) => {
      const yearToUse = requiresSpecialAcademicYearLogic(normalizedLevel) 
        ? parseInt(apiYear, 10) 
        : parseInt(year, 10);
      
      return api.post('/students/teachers', {
        level: normalizedLevel,
        stream: normalizedStream,
        year: yearToUse,
        subject_code: subjectCode,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers', normalizedLevel, normalizedStream, apiYear]);
      toast.success('Teacher assigned successfully!');
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to assign teacher');
    },
  });

  // Delete teacher mutation
  // For Form V-VI, use apiYear (academic year start) instead of display year
  const deleteMutation = useMutation({
    mutationFn: async (subjectCode) => {
      const yearToUse = requiresSpecialAcademicYearLogic(normalizedLevel) 
        ? parseInt(apiYear, 10) 
        : parseInt(year, 10);
      
      // Use studentsAPI.deleteTeacher which properly handles URL encoding
      return studentsAPI.deleteTeacher({
        level: normalizedLevel,
        stream: normalizedStream,
        year: yearToUse,
        subject_code: subjectCode
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers', normalizedLevel, normalizedStream, apiYear]);
      toast.success('Teacher assignment removed successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to remove teacher assignment');
    },
  });

  const openModal = (subject) => {
    setEditingSubject(subject);
    // Try both subject_code and abbreviation to find teacher
    const subjectCode = subject.subject_code || subject.subject_abbreviation;
    const subjectAbbr = subject.subject_abbreviation;
    const teacher = teachers[subjectCode] || teachers[subjectAbbr];
    
    setFormData({
      teacher_name: teacher?.teacher_name || '',
      teacher_signature: teacher?.teacher_signature || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSubject(null);
    setFormData({
      teacher_name: '',
      teacher_signature: '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.teacher_name) {
      toast.error('Please enter teacher name');
      return;
    }

    const subjectCode = editingSubject.subject_code || editingSubject.subject_abbreviation;
    saveMutation.mutate({ subjectCode, data: formData });
  };

  const handleDelete = (subject) => {
    // Try both subject_code and abbreviation to find teacher
    const subjectCode = subject.subject_code || subject.subject_abbreviation;
    const subjectAbbr = subject.subject_abbreviation;
    const teacher = teachers[subjectCode] || teachers[subjectAbbr];
    
    if (!teacher || !teacher.teacher_name) {
      toast.warning('No teacher assigned to this subject');
      return;
    }

    // Determine which key actually has the teacher in the teachers object
    // This is the key that was returned from the API, so it matches what's in the database
    let codeToDelete = subjectCode;
    if (teachers[subjectAbbr] && !teachers[subjectCode]) {
      codeToDelete = subjectAbbr;
    } else if (teachers[subjectCode]) {
      codeToDelete = subjectCode;
    }
    
    console.log('TeachersManagement: Deleting teacher', {
      subjectName: subject.subject_name,
      subjectCode: subject.subject_code,
      subjectAbbr: subject.subject_abbreviation,
      codeToDelete: codeToDelete,
      teachersKeys: Object.keys(teachers),
      teacherFound: !!teacher
    });
    
    if (window.confirm(`Remove teacher assignment for "${subject.subject_name}"?`)) {
      deleteMutation.mutate(codeToDelete);
    }
  };

  const getBackPath = () => {
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/teachers/${formLevel}/stream/${stream}/years`;
    } else {
      return `/admin/teachers/${formLevel}/years`;
    }
  };

  return (
    <AdminLayout>
      <div className="subject-teachers-mgmt-page-container">
        <div className="subject-teachers-mgmt-card">
          <div className="subject-teachers-mgmt-card-header">
            <Link to={getBackPath()} className="subject-teachers-mgmt-back-btn-top" title="Back">
              <i className="fas fa-arrow-left"></i>
            </Link>
            <i className="fas fa-chalkboard-teacher"></i>
            <span>Subject Teachers Management</span>
          </div>
          <div className="subject-teachers-mgmt-card-body">
            {teachersError && (
              <div className="error-state" style={{ padding: '20px', background: '#ffebee', color: '#c62828', marginBottom: '20px', borderRadius: '4px' }}>
                <i className="fas fa-exclamation-triangle"></i>
                <strong>Error loading teachers:</strong> {teachersError.message || 'Failed to fetch teachers'}
                <div style={{ fontSize: '12px', marginTop: '10px', fontFamily: 'monospace' }}>
                  Debug: Level={normalizedLevel} | Stream={normalizedStream} | DisplayYear={year} | ApiYear={apiYear}
                </div>
              </div>
            )}
            {subjectsLoading || teachersLoading ? (
              <div className="loading-state">Loading...</div>
            ) : subjects.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-book"></i>
                <h3>No Subjects Found</h3>
                <p>No subjects have been added for this class yet. Please add subjects first.</p>
                <Link to="/admin/subjects" className="excel-btn primary">
                  <i className="fas fa-plus"></i> Add Subjects
                </Link>
              </div>
            ) : (
              <>
                {Object.keys(teachers).length === 0 && !teachersLoading && (
                  <div className="info-state" style={{ padding: '15px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', marginBottom: '20px' }}>
                    <i className="fas fa-info-circle" style={{ color: '#856404', marginRight: '10px' }}></i>
                    <strong style={{ color: '#856404' }}>No Teachers Assigned Yet</strong>
                    <p style={{ margin: '10px 0 0 0', color: '#856404', fontSize: '14px' }}>
                      You have {subjects.length} subject{subjects.length !== 1 ? 's' : ''} for {normalizedLevel} {normalizedStream} {year}. 
                      Click the <i className="fas fa-edit"></i> edit button next to any subject below to assign a teacher.
                    </p>
                  </div>
                )}
                <div className="subject-teachers-mgmt-table-container">
                  <table className="subject-teachers-mgmt-table">
                  <thead>
                    <tr>
                      <th>S/N</th>
                      <th>Subject Name</th>
                      <th>Subject Code</th>
                      <th>Subject Abbreviation</th>
                      <th>Year</th>
                      <th>Teacher's Name</th>
                      <th>Teacher Signature</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject, index) => {
                      // Try both subject_code and abbreviation to find teacher
                      const subjectCode = subject.subject_code || subject.subject_abbreviation;
                      const subjectAbbr = subject.subject_abbreviation;
                      // Check teacher by both code and abbreviation
                      const teacher = teachers[subjectCode] || teachers[subjectAbbr] || 
                                     (subjectCode && teachers[subjectCode]) ||
                                     (subjectAbbr && teachers[subjectAbbr]);
                      
                      return (
                        <tr key={`${subjectCode}-${subject.level}-${subject.stream}-${subject.year}`}>
                          <td>{index + 1}</td>
                          <td>{subject.subject_name}</td>
                          <td>
                            <span className="subject-code">{subject.subject_code}</span>
                          </td>
                          <td>
                            <span className="subject-abbreviation">{subject.subject_abbreviation || '-'}</span>
                          </td>
                          <td>{subject.year}</td>
                          <td>
                            {teacher?.teacher_name ? (
                              <span className="teacher-name">{teacher.teacher_name}</span>
                            ) : (
                              <span className="no-teacher">Not Assigned</span>
                            )}
                          </td>
                          <td>
                            {teacher?.teacher_signature ? (
                              <span className="teacher-signature">{teacher.teacher_signature}</span>
                            ) : (
                              <span className="no-signature">No Signature</span>
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                type="button"
                                className="excel-btn small"
                                onClick={() => openModal(subject)}
                                aria-label="Edit teacher"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              {teacher?.teacher_name && (
                                <button
                                  type="button"
                                  className="excel-btn small danger"
                                  onClick={() => handleDelete(subject)}
                                  aria-label="Delete teacher"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        </div>

        {/* Back Button */}
        <Link to={getBackPath()} className="subject-teachers-mgmt-back-btn">
          <i className="fas fa-arrow-left"></i>
          <span>Back</span>
        </Link>

        {/* Add/Edit Teacher Modal */}
        {showModal && editingSubject && (
          <div className="subject-teachers-mgmt-modal-overlay" onClick={closeModal}>
            <div className="subject-teachers-mgmt-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="subject-teachers-mgmt-modal-header">
                <h3>Assign Teacher</h3>
                <button className="subject-teachers-mgmt-modal-close" onClick={closeModal}>&times;</button>
              </div>
              <form onSubmit={handleSubmit} className="subject-teachers-mgmt-modal-body">
                <div className="subject-teachers-mgmt-form-group">
                  <label htmlFor="subject_name">Subject</label>
                  <input
                    type="text"
                    id="subject_name"
                    value={editingSubject.subject_name}
                    readOnly
                    className="form-control"
                  />
                </div>
                
                <div className="subject-teachers-mgmt-form-group">
                  <label htmlFor="teacher_name">Teacher's Name <span className="req">*</span></label>
                  <input
                    type="text"
                    id="teacher_name"
                    value={formData.teacher_name}
                    onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                    placeholder="Enter teacher's full name"
                    required
                    className="form-control"
                  />
                </div>
                
                <div className="subject-teachers-mgmt-form-group">
                  <label htmlFor="teacher_signature">Teacher Signature</label>
                  <input
                    type="text"
                    id="teacher_signature"
                    value={formData.teacher_signature}
                    onChange={(e) => setFormData({ ...formData, teacher_signature: e.target.value })}
                    placeholder="Enter teacher's signature"
                    className="form-control"
                  />
                </div>
                
                <div className="subject-teachers-mgmt-modal-footer">
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={saveMutation.isLoading}>
                    {saveMutation.isLoading ? 'Saving...' : 'Save Teacher'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TeachersManagement;


