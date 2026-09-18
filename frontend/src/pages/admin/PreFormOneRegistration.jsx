import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { preFormOneService } from '../../services/preFormOneService';
import AdminLayout from '../../components/layout/AdminLayout';
import { useGoBack } from '../../hooks/useGoBack';
import { CSV_BULK_LABELS, CSV_BULK_TITLES } from '../../constants/csvBulkActions';
import './PreFormOneRegistration.css';
import './preform-one-modern.css';

const PreFormOneRegistration = () => {
  const { year } = useParams();
  const goBack = useGoBack('/admin/pre-form-one');
  const [students, setStudents] = useState([]);
  const [currentStudent, setCurrentStudent] = useState({
    serialNumber: '',
    firstName: '',
    middleName: '',
    surname: '',
    sex: '',
    year: year
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteMarkedModal, setShowDeleteMarkedModal] = useState(false);
  const [isDeletingMarked, setIsDeletingMarked] = useState(false);
  const selectAllRef = React.useRef(null);

  // Load students from database on component mount
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true);
        const response = await preFormOneService.getStudents(year);
        
        // Ensure we always set an array
        const studentsData = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
        
        setStudents(studentsData);
      } catch (error) {
        // Handle error gracefully - set empty array
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [year]);

  // Reset to page 1 when students list changes (e.g. after add/delete/CSV upload)
  useEffect(() => {
    setCurrentPage(1);
  }, [students]);

  // Sort students by admission number for stable display
  const sortedStudents = useMemo(() => {
    const list = Array.isArray(students) ? students : [];
    return [...list].sort((a, b) => {
      const aVal = parseInt(String(a?.admission_number || '').replace('789ABC', '')) || 0;
      const bVal = parseInt(String(b?.admission_number || '').replace('789ABC', '')) || 0;
      return aVal - bVal;
    });
  }, [students]);

  // Summary stats
  const stats = useMemo(() => {
    const total = students.length;
    const male = students.filter(s => s && s.sex?.toLowerCase() === 'male').length;
    const female = students.filter(s => s && s.sex?.toLowerCase() === 'female').length;
    const parishAssigned = students.filter(s => s && s.parish && s.parish.trim()).length;
    return { total, male, female, parishAssigned };
  }, [students]);

  // Generate automatic admission number
  const generateAdmissionNumber = (serialNumber) => {
    const prefix = '789ABC';
    const timestamp = Date.now().toString(36); // Base36 timestamp for uniqueness
    const random = Math.random().toString(36).substring(2, 5); // 3 random chars
    return `${prefix}${serialNumber}-${timestamp}-${random}`;
  };

  // Handle single student input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentStudent(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate student data
  const validateStudentData = (student) => {
    const errors = [];

    if (!student.serialNumber) {
      errors.push('Serial Number is required');
    }

    if (!student.firstName) {
      errors.push('First Name is required');
    }

    if (!student.surname) {
      errors.push('Surname is required');
    }

    if (!student.sex) {
      errors.push('Sex is required');
    }

    return errors;
  };

  // Handle student update
  const handleUpdateStudent = async () => {
    
    // Validate form data
    const validationErrors = validateStudentData(currentStudent);
    
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    try {
      setLoading(true);
      
      if (!currentStudent.id) {
        toast.error('Student ID missing for update');
        return;
      }

      const studentData = {
        serial_number: currentStudent.serialNumber,
        first_name: currentStudent.firstName,
        middle_name: currentStudent.middleName,
        surname: currentStudent.surname,
        sex: currentStudent.sex,
        parish: currentStudent.parish || ''
      };

      const updatedStudent = await preFormOneService.updateStudent(currentStudent.id, studentData);

      // Check if the response indicates success
      if (updatedStudent && updatedStudent.success) {
        // Update local state with the updated student
        setStudents(prev => {
          const newStudents = prev.map(s => s.id === currentStudent.id ? updatedStudent.data : s);
          return newStudents;
        });
        
        // Clear form
        setCurrentStudent({
          serialNumber: '',
          firstName: '',
          middleName: '',
          surname: '',
          sex: '',
          year: year
        });
        
        toast.success(`${updatedStudent.data.first_name} ${updatedStudent.data.surname} updated successfully!`);
      } else {
        // Handle specific error messages from backend
        toast.error(updatedStudent.message || 'Error updating student. Please try again.');
      }
    } catch (error) {
      toast.error('Error updating student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle student deletion
  const handleDeleteStudent = async (student) => {
    
    if (!student.id) {
      toast.error('Cannot delete student - missing ID');
      return;
    }
    
    if (!window.confirm(`Delete student ${student.admission_number}?`)) {
      return;
    }

    try {
      setLoading(true);
      
      const deleteResult = await preFormOneService.deleteStudent(student.id);
      // Check if the response indicates success
      if (deleteResult && deleteResult.success) {
        
        // Update local state by removing the deleted student
        setStudents(prev => {
          const newStudents = prev.filter(s => s.id !== student.id);
          return newStudents;
        });
        
        toast.success('Student deleted successfully!');
      } else {
        // Handle specific error messages from backend
        const errorMessage = deleteResult?.message || 'Error deleting student. Please try again.';
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error deleting student. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Bulk delete: toggle whether a student is marked for deletion
  const toggleSelectStudent = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Bulk delete: select/deselect all students on the current page
  const toggleSelectAllOnPage = () => {
    const pageIds = paginatedStudents.map(s => s.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      pageIds.forEach(id => {
        if (allSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setShowDeleteMarkedModal(false);
  };

  // Bulk delete: permanently delete all marked students
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error('No students selected for deletion');
      return;
    }

    setIsDeletingMarked(true);
    try {
      const result = await preFormOneService.bulkDeleteStudents(ids);
      if (result && result.success) {
        const deletedIds = new Set((result.data || []).map(s => s.id));
        setStudents(prev => prev.filter(s => !deletedIds.has(s.id)));
        toast.success(`${result.deletedCount || ids.length} student${(result.deletedCount || ids.length) === 1 ? '' : 's'} deleted successfully!`);
      } else {
        toast.error(result?.message || 'Error deleting students. Please try again.');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error deleting students. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsDeletingMarked(false);
      setShowDeleteMarkedModal(false);
      setSelectedIds(new Set());
    }
  };

  // Handle single student registration
  const handleSingleRegistration = async () => {
    // Validate form data
    const validationErrors = validateStudentData(currentStudent);
    
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    try {
      setLoading(true);
      const admissionNumber = generateAdmissionNumber(currentStudent.serialNumber);
      
      const studentData = {
        admission_number: admissionNumber,
        serial_number: currentStudent.serialNumber,
        first_name: currentStudent.firstName,
        middle_name: currentStudent.middleName,
        surname: currentStudent.surname,
        sex: currentStudent.sex,
        parish: '', // Initialize parish as empty string
        year: parseInt(year)
      };

      const createdStudent = await preFormOneService.createStudent(studentData);
      
      // Check if the response indicates success
      if (createdStudent && createdStudent.success) {
        // Update local state with the new student
        setStudents(prev => {
          const newStudents = [...prev, createdStudent.data];
          return newStudents;
        });
        
        toast.success(`${createdStudent.data.first_name} ${createdStudent.data.surname} registered successfully!`);
      } else {
        // Handle specific error messages from backend
        toast.error(createdStudent.message || 'Error registering student. Please try again.');
      }
    } catch (error) {
      toast.error('Error registering student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV file upload
  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target.result;
      processCsvData(csvText);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Process CSV data
  const processCsvData = async (csvText) => {
    if (!csvText.trim()) {
      toast.error('Please enter CSV data');
      return;
    }

    try {
      setLoading(true);
      const lines = csvText.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const dataLines = lines.slice(1);

      const studentsToCreate = dataLines.map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const student = {
          admission_number: generateAdmissionNumber(values[0] || `SN${students.length + index + 1}`),
          serial_number: values[0] || `SN${students.length + index + 1}`,
          first_name: values[1] || '',
          middle_name: values[2] || '',
          surname: values[3] || '',
          sex: values[4] || '',
          parish: '', // Initialize parish as empty
          year: parseInt(year)
        };

        // Map headers to values dynamically
        headers.forEach((header, i) => {
          const field = header.toLowerCase().replace(/\s+/g, '');
          if (field === 'serialnumber' || field === 's/n') student.serial_number = values[i] || '';
          else if (field === 'firstname') student.first_name = values[i] || '';
          else if (field === 'middlename') student.middle_name = values[i] || '';
          else if (field === 'surname') student.surname = values[i] || '';
          else if (field === 'sex') student.sex = values[i] || '';
        });
        
                return student;
      }).filter(student => student.serial_number && student.first_name && student.surname && student.sex);
      
      if (studentsToCreate.length === 0) {
        toast.error('No valid student data found in CSV');
        return;
      }

      const result = await preFormOneService.createBulkStudents(studentsToCreate, year);
      
      // Update local state with the new students
      setStudents(prev => {
        const newStudents = [...prev, ...(result.students || [])];
        return newStudents;
      });
      
      toast.success(`${result.students?.length || 0} students registered successfully from CSV!`);
    } catch (error) {
      toast.error('Error processing CSV data. Please check file format and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Export data to CSV
  const exportToCsv = async () => {
    try {
      setLoading(true);
      await preFormOneService.exportStudents(year);
    } catch (error) {
      toast.error('Error exporting students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Download CSV template
  const downloadCsvTemplate = () => {
    const templateHeaders = ['S/N', 'FirstName', 'MiddleName', 'Surname', 'Sex'];
    const templateData = [
      templateHeaders.join(','),
      'SN001,John,Doe,Smith,Male',
      'SN002,Jane,Marie,Johnson,Female'
    ].join('\n');

    const blob = new Blob([templateData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `preform-one-template-${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(sortedStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = sortedStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reflect "some but not all" rows selected on the current page
  useEffect(() => {
    const pageIds = paginatedStudents.map(s => s.id);
    const someSelected = pageIds.some(id => selectedIds.has(id));
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [paginatedStudents, selectedIds]);

  return (
    <AdminLayout>
    <div className="preform-one-registration-route registration-form-page-container registration-page-container">
      {/* Page Header */}
      <div className="registration-page-header">
        <div className="registration-page-header-left">
          <div className="registration-page-header-icon">
            <i className="fas fa-user-plus"></i>
          </div>
          <div className="registration-page-header-text">
            <h1>Pre-Form One Registration</h1>
            <p>Register and manage Pre-Form One students for the {year} intake</p>
          </div>
        </div>
        <button type="button" onClick={goBack} className="back-button">
          <i className="fas fa-arrow-left"></i>
          Back to Modules
        </button>
      </div>

      {/* Summary Stats */}
      <div className="registration-stats-grid">
        <div className="registration-stat-card">
          <div className="registration-stat-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="registration-stat-meta">
            <span className="registration-stat-value">{stats.total}</span>
            <span className="registration-stat-label">Registered Students</span>
          </div>
        </div>
        <div className="registration-stat-card">
          <div className="registration-stat-icon">
            <i className="fas fa-mars"></i>
          </div>
          <div className="registration-stat-meta">
            <span className="registration-stat-value">{stats.male}</span>
            <span className="registration-stat-label">Male</span>
          </div>
        </div>
        <div className="registration-stat-card">
          <div className="registration-stat-icon">
            <i className="fas fa-venus"></i>
          </div>
          <div className="registration-stat-meta">
            <span className="registration-stat-value">{stats.female}</span>
            <span className="registration-stat-label">Female</span>
          </div>
        </div>
        <div className="registration-stat-card">
          <div className="registration-stat-icon">
            <i className="fas fa-church"></i>
          </div>
          <div className="registration-stat-meta">
            <span className="registration-stat-value">{stats.parishAssigned}</span>
            <span className="registration-stat-label">Parish Assigned</span>
          </div>
        </div>
      </div>

      {/* Registration Form Card */}
      <div className="registration-form-card">
        <div className="registration-form-card-header">
          <i className="fas fa-user-plus"></i>
          <span>Pre-Form One Registration - {year}</span>
        </div>
        <div className="registration-form-card-body">
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            if (currentStudent.id) {
              handleUpdateStudent();
            } else {
              handleSingleRegistration();
            }
          }} className="registration-form">
            <div className="registration-form-grid">
              <div className="form-field">
                <div className="form-group">
                  <label htmlFor="serialNumber">
                    Serial Number (S/N) <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    id="serialNumber"
                    name="serialNumber"
                    value={currentStudent.serialNumber}
                    onChange={handleInputChange}
                    placeholder="Enter serial number"
                    className="form-input"
                    required
                  />
                </div>
              </div>
              
              <div className="form-field">
                <div className="form-group">
                  <label htmlFor="firstName">
                    First Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={currentStudent.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    className="form-input"
                    required
                  />
                </div>
              </div>
              
              <div className="form-field">
                <div className="form-group">
                  <label htmlFor="middleName">Middle Name</label>
                  <input
                    type="text"
                    id="middleName"
                    name="middleName"
                    value={currentStudent.middleName}
                    onChange={handleInputChange}
                    placeholder="Enter middle name"
                    className="form-input"
                  />
                </div>
              </div>
              
              <div className="form-field">
                <div className="form-group">
                  <label htmlFor="surname">
                    Surname <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    id="surname"
                    name="surname"
                    value={currentStudent.surname}
                    onChange={handleInputChange}
                    placeholder="Enter surname"
                    className="form-input"
                    required
                  />
                </div>
              </div>
              
              <div className="form-field">
                <div className="form-group">
                  <label htmlFor="sex">
                    Sex <span className="req">*</span>
                  </label>
                  <select
                    id="sex"
                    name="sex"
                    value={currentStudent.sex}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select Sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              
              </div>

            <div className="registration-form-actions">
              <button
                type="submit"
                className="excel-btn primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span className="btn-text">Processing...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    <span className="btn-text">
                      {currentStudent.id ? 'Update' : 'Register'}
                    </span>
                  </>
                )}
              </button>

              {currentStudent.id && (
                <button
                  type="button"
                  onClick={() => setCurrentStudent({
                    serialNumber: '',
                    firstName: '',
                    middleName: '',
                    surname: '',
                    sex: '',
                    parish: '',
                    year: year
                  })}
                  className="excel-btn secondary"
                  disabled={loading}
                >
                  <i className="fas fa-times"></i>
                  <span className="btn-text">Cancel</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Registered Students Card */}
      <div className="registered-students-card">
        <div className="registered-students-card-header">
          <div className="registered-students-card-header-left">
            <i className="fas fa-table"></i>
            <span>Registered Students</span>
          </div>
          <span className="registered-students-count">{students.length} total</span>
        </div>
        <div className="registered-students-card-body">
          {loading ? (
            <div className="loading-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-user-slash"></i>
              <p>No students registered yet</p>
            </div>
          ) : (
            <div className="students-table-container">
              {selectedIds.size > 0 && (
                <div className="bulk-actions-bar">
                  <span className="bulk-actions-count">
                    <i className="fas fa-check-square"></i>
                    {selectedIds.size} student{selectedIds.size === 1 ? '' : 's'} marked
                  </span>
                  <div className="bulk-actions-buttons">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={clearSelection}
                      disabled={isDeletingMarked}
                    >
                      <i className="fas fa-times"></i>
                      Clear
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => setShowDeleteMarkedModal(true)}
                      disabled={isDeletingMarked}
                    >
                      <i className="fas fa-trash"></i>
                      Delete marked
                    </button>
                  </div>
                </div>
              )}
              <table className="students-table">
                <thead>
                  <tr>
                    <th className="select-col">
                      <input
                        type="checkbox"
                        ref={selectAllRef}
                        checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedIds.has(s.id))}
                        onChange={toggleSelectAllOnPage}
                        title="Select all on this page"
                      />
                    </th>
                    <th>#</th>
                    <th>Admission No</th>
                    <th>Serial No</th>
                    <th>Name</th>
                    <th>Sex</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((student, index) => (
                    <tr key={student.id || `student-${index}`} className={selectedIds.has(student.id) ? 'row-selected' : ''}>
                      <td className="select-col">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(student.id)}
                          onChange={() => toggleSelectStudent(student.id)}
                          title={`Mark ${student.admission_number || 'student'} for deletion`}
                        />
                      </td>
                      <td>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                      <td>{student.admission_number || 'N/A'}</td>
                      <td>{student.serial_number || 'N/A'}</td>
                      <td>{`${student.first_name || ''} ${student.middle_name || ''} ${student.surname || ''}`.trim() || 'N/A'}</td>
                      <td>
                        <span className={`sex-badge ${student.sex?.toLowerCase() || 'unknown'}`}>
                          {student.sex || 'Unknown'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            onClick={() => {
                              // Populate form with student data for editing
                              setCurrentStudent({
                                serialNumber: student.serial_number,
                                firstName: student.first_name,
                                middleName: student.middle_name,
                                surname: student.surname,
                                sex: student.sex,
                                parish: student.parish,
                                year: year,
                                id: student.id // Store ID for update
                              });
                            }}
                            className="excel-btn primary small"
                            title="Edit student"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            onClick={() => handleDeleteStudent(student)}
                            className="excel-btn secondary small"
                            title="Delete student"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    className="excel-btn secondary small"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <i className="fas fa-chevron-left"></i>
                    Prev
                  </button>
                  <span className="pagination-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="excel-btn secondary small"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Upload Card */}
      <div className="bulk-upload-card">
        <div className="bulk-upload-card-header">
          <i className="fas fa-file-csv"></i>
          <span>Bulk Operations</span>
        </div>
        <div className="bulk-upload-card-body">
          <div className="bulk-upload-content">
            <div className="bulk-upload-actions csv-bulk-actions">
              <button 
                type="button"
                className="excel-btn primary" 
                onClick={downloadCsvTemplate}
                disabled={loading}
                title={CSV_BULK_TITLES.template}
              >
                <i className="fas fa-download"></i>
                <span className="btn-text">{CSV_BULK_LABELS.template}</span>
              </button>
              <button 
                type="button"
                className="excel-btn secondary" 
                onClick={exportToCsv}
                disabled={loading || students.length === 0}
                title={CSV_BULK_TITLES.filled}
              >
                <i className="fas fa-file-export"></i>
                <span className="btn-text">{CSV_BULK_LABELS.filled}</span>
              </button>
              <div className="file-upload-wrapper">
                <input
                  type="file"
                  id="csv-file"
                  accept=".csv"
                  className="file-input"
                  onChange={handleCsvUpload}
                  disabled={loading}
                />
                <label htmlFor="csv-file" className={`file-label ${loading ? 'disabled' : ''}`} title={CSV_BULK_TITLES.upload}>
                  <span>
                    <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>{' '}
                    {loading ? CSV_BULK_LABELS.uploading : CSV_BULK_LABELS.upload}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="back-navigation-bottom">
        <button type="button" onClick={goBack} className="back-button">
          <i className="fas fa-arrow-left"></i>
          Back to Modules
        </button>
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteMarkedModal && (
        <div className="modal-overlay" onClick={isDeletingMarked ? null : clearSelection}>
          <div className="modal-content modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Marked Students</h3>
              <button type="button" className="modal-close" onClick={clearSelection}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="clear-warning">
                <p className="modal-warning-icon">
                  <i className="fas fa-exclamation-triangle"></i>
                </p>
                <p>
                  This action permanently deletes <strong>{selectedIds.size} student{selectedIds.size === 1 ? '' : 's'}</strong> and ALL their associated Pre-Form One data (scores, results, etc.).
                </p>
                <p>
                  If a selected student was already promoted to another class (Form One, etc.), only their Pre-Form One record is removed here. Their record in the promoted class is not affected.
                </p>
              </div>
            </div>
            <div className="modal-footer clear-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={clearSelection}
                disabled={isDeletingMarked}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleBulkDelete}
                disabled={isDeletingMarked}
              >
                {isDeletingMarked ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash"></i>
                    Delete permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  );
};

export default PreFormOneRegistration;
