/**
 * Student Parish Management Page
 * Allows assigning, viewing, and deleting student parish assignments
 */
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import { useAuth } from '../../context/AuthContext';
import { requiresSpecialAcademicYearLogic, getApiYearForFormVVI } from '../../utils/academicYearUtils';
import './ParishManagement.css';

const ParishManagement = ({ formLevel: formLevelProp }) => {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [parishName, setParishName] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Extract parameters from URL
  const { year, stream } = params;
  
  // Use prop if provided, otherwise extract from URL params
  const formLevel = formLevelProp || params.formLevel || (() => {
    // Extract from pathname if not in params
    const pathParts = window.location.pathname.split('/');
    const parishIndex = pathParts.indexOf('parishes');
    return parishIndex >= 0 && pathParts[parishIndex + 1] ? pathParts[parishIndex + 1] : '';
  })();

  // Normalize form level from URL param (convert to uppercase: "form-i" -> "FORM I")
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.toUpperCase()).join(' ')
    : '';
  
  // Ensure year is a number from URL (display year, e.g. 2026)
  const yearNum = year ? (typeof year === 'number' ? year : parseInt(year, 10)) : null;
  // For Form V/VI use same API year as Registration: e.g. URL 2026 -> apiYear 2025 for 2025-2026 academic year
  const apiYear = yearNum != null && requiresSpecialAcademicYearLogic(normalizedLevel)
    ? getApiYearForFormVVI(yearNum, normalizedLevel)
    : yearNum;

  // Validate that we have all required parameters
  const hasValidParams = normalizedLevel && stream && apiYear != null && !isNaN(apiYear) && apiYear > 0;

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
  const { data: studentsData = [], isLoading, error: studentsError } = useQuery({
    queryKey: ['students', normalizedLevel, stream, apiYear],
    queryFn: async () => {
      if (!hasValidParams) {
        return [];
      }
      try {
        // For streams A, B, C, D: also fetch students from stream "NA"
        // This treats "NA" as containing students from all streams A-D
        let students = [];
        
        if (['A', 'B', 'C', 'D'].includes(stream.toUpperCase())) {
          // Fetch students from both the specific stream AND "NA" stream
          const [streamRes, naRes] = await Promise.all([
            studentsAPI.getStudents({
              level: normalizedLevel,
              stream: stream,
              year: apiYear,
            }),
            studentsAPI.getStudents({
              level: normalizedLevel,
              stream: 'NA',
              year: apiYear,
            })
          ]);
          
          const streamStudents = streamRes.data.students || [];
          const naStudents = naRes.data.students || [];
          
          // Combine and remove duplicates (by adm_no, level, stream, year)
          const allStudents = [...streamStudents, ...naStudents];
          const uniqueStudents = allStudents.filter((student, index, self) =>
            index === self.findIndex(s => 
              s.adm_no === student.adm_no && 
              s.level === student.level && 
              s.stream === student.stream && 
              s.year === student.year
            )
          );
          
          students = uniqueStudents;
        } else {
          // For other streams (including "NA"), fetch normally
          const res = await studentsAPI.getStudents({
            level: normalizedLevel,
            stream: stream,
            year: apiYear,
          });
          students = res.data.students || [];
        }
        
        // Sort students by name: first_name, then middle_name, then surname (A-Z)
        return sortStudentsByName(students);
      } catch (error) {
        console.error('ParishManagement: Error fetching students', error);
        throw error;
      }
    },
    enabled: Boolean(hasValidParams) && isAuthenticated(),
  });
  
  const students = studentsData;

  // Fetch parishes for this class
  const { data: parishesData = {}, isLoading: parishesLoading, error: parishesError } = useQuery({
    queryKey: ['student-parishes', normalizedLevel, stream, apiYear, students.length],
    queryFn: async () => {
      if (!hasValidParams || !normalizedLevel) {
        console.log('[PARISHES] Invalid params, returning empty');
        return {};
      }
      
      if (students.length === 0) {
        console.log('[PARISHES] No students loaded yet, returning empty');
        return {};
      }
      
      try {
        console.log('[PARISHES] Fetching parishes:', { level: normalizedLevel, stream, year: apiYear, studentsCount: students.length });
        const res = await studentsAPI.getParishes({
          level: normalizedLevel,
          stream: stream,
          year: apiYear
        });
        const parishesMap = {};
        const parishes = res.data.parishes || [];
        console.log('[PARISHES] Received', parishes.length, 'parishes from API');
        
        // When viewing streams A, B, C, D: parishes include both that stream and "NA"
        // We need to map them to the combined student list
        // Create a map of student adm_no to their index in the sorted students array
        const studentIndexMap = new Map();
        students.forEach((student, index) => {
          const key = `${student.adm_no}-${student.level}-${student.stream}-${student.year}`;
          studentIndexMap.set(key, index);
        });
        
        // Map parishes by finding the student's position in the combined sorted list
        // The student_index in parishes refers to the position in the sorted list for that specific stream
        // We need to fetch the students for each stream separately, sort them, then map
        
        // Group students by stream
        const studentsByStream = {};
        students.forEach(student => {
          if (!studentsByStream[student.stream]) {
            studentsByStream[student.stream] = [];
          }
          studentsByStream[student.stream].push(student);
        });
        
        console.log('[PARISHES] Students by stream:', Object.keys(studentsByStream).map(s => `${s}: ${studentsByStream[s].length}`).join(', '));
        
        // Sort each stream's students (same way as database)
        Object.keys(studentsByStream).forEach(streamKey => {
          studentsByStream[streamKey] = sortStudentsByName(studentsByStream[streamKey]);
        });
        
        // Map parishes
        let mappedCount = 0;
        let skippedCount = 0;
        const skippedReasons = { invalidIndex: 0, noStudents: 0, indexOutOfRange: 0, studentNotFound: 0 };
        
        parishes.forEach((parish, idx) => {
          const parishStream = parish.stream;
          const parishIndex = parseInt(parish.student_index, 10);
          
          if (isNaN(parishIndex) || parishIndex < 0) {
            skippedCount++;
            skippedReasons.invalidIndex++;
            return;
          }
          
          // Get sorted students for this stream
          let sortedStreamStudents = studentsByStream[parishStream] || [];
          
          // Handle stream normalization: NA <-> A are equivalent for FORM I-IV
          // If parish is from "NA" stream but we have no "NA" students, 
          // try mapping to the current stream's students (A, B, C, or D)
          // This handles cases where students were migrated from "NA" to specific streams
          if (parishStream === 'NA' && sortedStreamStudents.length === 0 && ['A', 'B', 'C', 'D'].includes(stream.toUpperCase())) {
            sortedStreamStudents = studentsByStream[stream] || [];
          }
          
          // Also handle reverse: if parish is from "A" stream but we have "NA" students
          // (This can happen if parishes were created with stream "A" but students are stored as "NA")
          if (parishStream === 'A' && sortedStreamStudents.length === 0 && studentsByStream['NA'] && studentsByStream['NA'].length > 0) {
            sortedStreamStudents = studentsByStream['NA'] || [];
          }
          
          // If still no students found, skip this parish
          if (sortedStreamStudents.length === 0) {
            skippedCount++;
            skippedReasons.noStudents++;
            return;
          }
          
          // Get the student at the parish's index in that stream's sorted list
          if (parishIndex < sortedStreamStudents.length) {
            const studentAtParishIndex = sortedStreamStudents[parishIndex];
            
            // Find this student's position in the combined sorted students list
            const combinedIndex = students.findIndex(s => 
              s.adm_no === studentAtParishIndex.adm_no && 
              s.level === studentAtParishIndex.level && 
              s.stream === studentAtParishIndex.stream && 
              s.year === studentAtParishIndex.year
            );
            
            if (combinedIndex >= 0) {
              parishesMap[combinedIndex] = {
                ...parish,
                student_index: combinedIndex
              };
              mappedCount++;
            } else {
              skippedCount++;
              skippedReasons.studentNotFound++;
            }
          } else {
            skippedCount++;
            skippedReasons.indexOutOfRange++;
          }
        });
        
        console.log('[PARISHES] Skipped reasons:', JSON.stringify(skippedReasons, null, 2));
        console.log('[PARISHES] Mapping complete:', { 
          mappedCount, 
          skippedCount, 
          parishesMapSize: Object.keys(parishesMap).length,
          totalParishes: parishes.length,
          studentsByStreamKeys: Object.keys(studentsByStream),
          studentsByStreamCounts: Object.keys(studentsByStream).map(k => `${k}: ${studentsByStream[k].length}`)
        });
        return parishesMap;
      } catch (error) {
        console.error('[PARISHES] Error fetching parishes', error);
        return {};
      }
    },
    enabled: Boolean(hasValidParams && normalizedLevel && students.length > 0) && isAuthenticated(),
  });


  // Save parish mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return studentsAPI.saveParish(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['student-parishes', normalizedLevel, stream, apiYear]);
      toast.success('Parish assigned successfully!');
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to assign parish');
    },
  });

  // Delete parish mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ studentIndex }) => {
      const params = {
        level: normalizedLevel,
        stream: stream,
        year: apiYear,
        student_index: parseInt(studentIndex, 10) // Ensure it's a number
      };
      return studentsAPI.deleteParish(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['student-parishes', normalizedLevel, stream, apiYear]);
      toast.success('Parish assignment removed successfully!');
    },
    onError: (error) => {
      console.error('Delete parish error:', error);
      toast.error(error.response?.data?.message || 'Failed to remove parish assignment');
    },
  });

  const openModal = (student, index) => {
    setSelectedStudent({ ...student, index });
    const existingParish = parishesData[index];
    setParishName(existingParish?.parish_name || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
    setParishName('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!parishName.trim()) {
      toast.error('Parish name is required');
      return;
    }

    saveMutation.mutate({
      level: normalizedLevel,
      stream: stream,
      year: apiYear,
      student_index: selectedStudent.index,
      parish_name: parishName.trim()
    });
  };

  const handleDelete = (student, index) => {
    if (window.confirm(`Are you sure you want to delete the parish assignment for ${student.first_name} ${student.surname}?`)) {
      deleteMutation.mutate({ studentIndex: index });
    }
  };

  const getParishName = (studentIndex) => {
    // Safety check: if parishesData is not loaded yet, return null
    if (!parishesData || typeof parishesData !== 'object') {
      return null;
    }
    
    // Ensure studentIndex is a number
    const index = parseInt(studentIndex, 10);
    if (isNaN(index) || index < 0) {
      return null;
    }
    
    // Get parish record for this student index
    const parish = parishesData[index];
    
    if (!parish) {
      // No parish record exists for this student index
      return null;
    }
    
    // Get parish name from the record
    const parishName = parish.parish_name;
    
    // Return null if parish_name is empty, null, or undefined
    // This handles cases where parish record exists but name was cleared
    if (!parishName || !parishName.trim()) {
      return null;
    }
    
    return parishName.trim();
  };

  // On 401, show message and redirect to login (auth interceptor will clear token)
  useEffect(() => {
    if (studentsError?.response?.status === 401) {
      toast.error(studentsError?.expirationMessage || 'Your session has expired. Please log in again.');
      navigate('/login', { replace: true });
    }
  }, [studentsError, navigate]);

  const getBackPath = () => {
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/students/parishes/${formLevel}/stream/${stream}/years`;
    } else {
      return `/admin/students/parishes/${formLevel}/year/${year}/streams`;
    }
  };

  return (
    <AdminLayout>
      <div className="parish-mgmt-page-container">
        <div className="parish-mgmt-card">
          <div className="parish-mgmt-card-header">
            <i className="fas fa-place-of-worship"></i>
            <span>Student Parishes Management - {normalizedLevel} {stream} {yearNum}</span>
            <span style={{ marginLeft: '15px', fontSize: '14px', opacity: 0.8 }}>
              {parishesLoading ? '(Loading parishes...)' : 
               parishesError ? '(Error loading parishes)' :
               parishesData && typeof parishesData === 'object' && Object.keys(parishesData).length > 0 ? 
                 `(${Object.keys(parishesData).length} parish${Object.keys(parishesData).length !== 1 ? 'es' : ''} loaded)` :
                 '(No parishes loaded)'}
            </span>
          </div>
          <div className="parish-mgmt-card-body">
            {studentsError ? (
              <div className="empty-state">
                <i className="fas fa-exclamation-triangle empty-icon"></i>
                <h3>
                  {studentsError.response?.status === 401
                    ? 'Session expired'
                    : 'Error Loading Students'}
                </h3>
                <p>
                  {studentsError.response?.status === 401
                    ? (studentsError.expirationMessage || 'Your session has expired. Please log in again.')
                    : (studentsError.message || 'Failed to load students. Please try again.')}
                </p>
                {studentsError.response?.status !== 401 && (
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                    Debug: {normalizedLevel} | {stream} | {yearNum}
                  </p>
                )}
              </div>
            ) : isLoading ? (
              <div className="loading-state">Loading students...</div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-users empty-icon"></i>
                <h3>No Students Found</h3>
                <p>No students registered for this class yet.</p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                  Debug: {normalizedLevel} | {stream} | {yearNum}
                </p>
              </div>
            ) : (
              <div className="parish-mgmt-table-container">
                <table className="parish-mgmt-table">
                  <thead>
                    <tr>
                      <th>S/N</th>
                      <th>Adm No</th>
                      <th>First Name</th>
                      <th>Middle Name</th>
                      <th>Surname</th>
                      <th>Sex</th>
                      <th>Parish</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => {
                      // Get parish name for this student (using array index which should match student_index)
                      const parish = getParishName(index);
                      
                      return (
                        <tr key={`${student.adm_no}-${student.level}-${student.stream}-${student.year}`}>
                          <td>{index + 1}</td>
                          <td>{student.adm_no}</td>
                          <td>{student.first_name}</td>
                          <td>{student.middle_name || '-'}</td>
                          <td>{student.surname}</td>
                          <td>{student.sex}</td>
                          <td>
                            {parish ? (
                              <span className="parish-badge">{parish}</span>
                            ) : (
                              <span className="no-parish">Not assigned</span>
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="parish-btn small primary"
                                onClick={() => openModal(student, index)}
                                title="Assign/Edit Parish"
                              >
                                <i className="fas fa-edit"></i> {parish ? 'Edit' : 'Assign'}
                              </button>
                              {parish && (
                                <button
                                  className="parish-btn small danger"
                                  onClick={() => handleDelete(student, index)}
                                  title="Delete Parish"
                                >
                                  <i className="fas fa-trash"></i> Delete
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
            )}
          </div>
        </div>

        {/* Back Button */}
        <Link to={getBackPath()} className="parish-mgmt-back-btn">
          <i className="fas fa-arrow-left"></i> Back
        </Link>

        {/* Parish Assignment Modal */}
        {showModal && selectedStudent && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Assign Parish for {selectedStudent.first_name} {selectedStudent.surname}</h3>
                <button type="button" className="close-btn" onClick={closeModal} aria-label="Close">
                  &times;
                </button>
              </div>
              <form onSubmit={handleSave} className="modal-body">
                <div className="form-group">
                  <label>Student Name</label>
                  <input
                    type="text"
                    value={`${selectedStudent.first_name} ${selectedStudent.middle_name || ''} ${selectedStudent.surname}`.trim()}
                    disabled
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Parish Name <span className="required">*</span></label>
                  <input
                    type="text"
                    value={parishName}
                    onChange={(e) => setParishName(e.target.value)}
                    placeholder="Enter parish name"
                    className="form-control"
                    required
                    autoFocus
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={saveMutation.isLoading}>
                    {saveMutation.isLoading ? 'Saving...' : 'Save Parish'}
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

export default ParishManagement;

