/**
 * Parishes Management Page
 * Allows assigning, viewing, and deleting student parish assignments
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import { useAuth } from '../../context/AuthContext';
import './ParishManagement.css';
import { CSV_BULK_LABELS, CSV_BULK_TITLES } from '../../constants/csvBulkActions';

const ParishManagement = ({ formLevel: formLevelProp }) => {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [parishName, setParishName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState('First Term');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  const fileInputRef = useRef(null);

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
  
  // Use calendar year directly for Form V/VI (no academic year conversion)
  // Form V First Term (Jul-Dec 2025) -> year 2025
  // Form V Second Term (Jan-Jun 2026) -> year 2026
  // Form VI First Term (Jul-Dec 2026) -> year 2026
  // Form VI Second Term (Jan-Jun 2027) -> year 2027
  const apiYear = year ? (typeof year === 'number' ? year : parseInt(year, 10)) : null;

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
    queryKey: ['students', normalizedLevel, stream, apiYear, selectedTerm],
    queryFn: async () => {
      if (!hasValidParams) {
        return [];
      }
      try {
        // For Form V/VI, filter by term to show only students registered for that term
        // For Form I-IV, term is not needed as students stay for the full year
        const isFormVOrVI = normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI';
        
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
              ...(isFormVOrVI && { term: selectedTerm })
            }),
            studentsAPI.getStudents({
              level: normalizedLevel,
              stream: 'NA',
              year: apiYear,
              ...(isFormVOrVI && { term: selectedTerm })
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
            ...(isFormVOrVI && { term: selectedTerm })
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

  // Reset to page 1 when students data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [studentsData]);

  // Paginate students
  const totalPages = Math.ceil(students.length / ITEMS_PER_PAGE);
  const paginatedStudents = students.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Fetch parishes for this class
  const { data: parishesData = {}, isLoading: parishesLoading, error: parishesError } = useQuery({
    queryKey: ['student-parishes', normalizedLevel, stream, apiYear, selectedTerm, students.length],
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
        console.log('[PARISHES] Fetching parishes:', { level: normalizedLevel, stream, year: apiYear, term: selectedTerm, studentsCount: students.length });
        const res = await studentsAPI.getParishes({
          level: normalizedLevel,
          stream: stream,
          year: apiYear,
          term: selectedTerm
        });
        const parishesMap = {};
        const parishes = res.data.parishes || [];
        console.log('[PARISHES] Received', parishes.length, 'parishes from API');

        // Key parishes directly by adm_no.
        const normalizeLevelValue = (value) =>
          String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
        const toYearNumber = (value) => {
          const num = Number(value);
          return Number.isFinite(num) ? num : null;
        };

        const rosterAdmNos = new Set();
        students.forEach((student) => {
          const admNo = String(student.adm_no ?? student.admission_number ?? '').trim();
          if (admNo) rosterAdmNos.add(admNo);
        });

        let mappedCount = 0;
        let skippedCount = 0;
        const mappedAdmNos = new Set();

        parishes.forEach((parish) => {
          const admNo = String(parish.adm_no ?? parish.admission_number ?? '').trim();

          if (!admNo) {
            skippedCount++;
            return;
          }

          // Only keep parishes that belong to the current class scope.
          const levelOk =
            !parish.level || normalizeLevelValue(parish.level) === normalizeLevelValue(normalizedLevel);
          const yearOk =
            parish.year == null || toYearNumber(parish.year) === toYearNumber(apiYear);

          if (!levelOk || !yearOk || !rosterAdmNos.has(admNo)) {
            skippedCount++;
            return;
          }

          if (!parishesMap[admNo]) {
            parishesMap[admNo] = { ...parish, adm_no: admNo };
          }
          mappedAdmNos.add(admNo);
        });

        mappedCount = mappedAdmNos.size;
        console.log('[PARISHES] Mapping complete:', { mappedCount, skippedCount, totalParishes: parishes.length });
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
      queryClient.invalidateQueries(['student-parishes', normalizedLevel, stream, apiYear, selectedTerm]);
      toast.success('Parish assigned successfully!');
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to assign parish');
    },
  });

  // Delete parish mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ adm_no }) => {
      const params = {
        level: normalizedLevel,
        stream: stream,
        year: apiYear,
        adm_no
      };
      return studentsAPI.deleteParish(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['student-parishes', normalizedLevel, stream, apiYear, selectedTerm]);
      toast.success('Parish assignment removed successfully!');
    },
    onError: (error) => {
      console.error('Delete parish error:', error);
      toast.error(error.response?.data?.message || 'Failed to remove parish assignment');
    },
  });

  const openModal = (student) => {
    setSelectedStudent({ ...student });
    const existingParish = parishesData[student.adm_no];
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
      adm_no: selectedStudent.adm_no,
      parish_name: parishName.trim()
    });
  };

  // CSV: escape cell for CSV (quote if contains comma, newline, or quote)
  const csvEscape = (val) => {
    const s = String(val ?? '').trim();
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const parseLine = (line, delimiter = ',') => {
    if (delimiter === '\t') {
      return line.split('\t').map((cell) => String(cell).trim().replace(/^\uFEFF/, ''));
    }

    const out = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (inQuotes) {
        cur += c;
      } else if (c === delimiter) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }

    out.push(cur.trim().replace(/^\uFEFF/, ''));
    return out;
  };

  const normalizeHeader = (h) =>
    String(h ?? '')
      .trim()
      .replace(/\uFEFF/g, '')
      .replace(/\s/g, '')
      .toLowerCase();

  const buildParishCsv = (includeFilledParishes) => {
    const headers = ['AdmNumber', 'first_name', 'middle_name', 'surname', 'Parish'];
    const rows = students.map((s) => {
      const parish = includeFilledParishes ? (getParishName(s.adm_no) || '') : '';
      return [
        csvEscape(s.adm_no),
        csvEscape(s.first_name),
        csvEscape(s.middle_name || ''),
        csvEscape(s.surname),
        csvEscape(parish),
      ].join(',');
    });
    return [headers.join(','), ...rows].join('\r\n');
  };

  const downloadParishCsv = (csv, filenameStem) => {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenameStem}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parishCsvFilenameStem = (kind) => {
    const base = `student_parishes_${kind}_${normalizedLevel}_${stream}_${apiYear}`.replace(/\s+/g, '_');
    const isFormVOrVI = normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI';
    if (isFormVOrVI) {
      return `${base}_${selectedTerm.replace(/\s+/g, '_')}`;
    }
    return base;
  };

  const handleDownloadTemplate = () => {
    downloadParishCsv(buildParishCsv(false), parishCsvFilenameStem('template'));
    toast.success('Parish CSV template downloaded');
  };

  const handleDownloadFilledCSV = () => {
    downloadParishCsv(buildParishCsv(true), parishCsvFilenameStem('filled'));
    toast.success('Filled parish CSV downloaded');
  };

  const handleUploadFilled = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);

    const run = async () => {
      try {
        let text = await file.text();
        text = text.replace(/^\uFEFF/, '');
        const lines = text.split(/\r?\n/).filter((l) => l.trim());

        if (lines.length < 2) {
          toast.error('CSV must have a header row and at least one data row');
          return;
        }

        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') && firstLine.split('\t').length >= 2 ? '\t' : ',';
        const rawHeaderCells = parseLine(firstLine, delimiter);
        const header = rawHeaderCells.map((h) => normalizeHeader(h));

        const admNoIdx = header.findIndex(
          (h) => h === 'admnumber' || h === 'adm_no' || h === 'admno' || h.startsWith('admission')
        );
        const parishIdx = header.findIndex((h) => h === 'parish' || h === 'parish_name' || h === 'parishname');

        if (admNoIdx === -1 || parishIdx === -1) {
          toast.error('Upload rejected: CSV must include columns "AdmNumber" and "Parish"');
          return;
        }

        const payload = [];
        let skipped = 0;
        let skippedNoStudent = 0;

        for (let i = 1; i < lines.length; i++) {
          const cells = parseLine(lines[i], delimiter);
          const admNo = String(cells[admNoIdx] ?? '').trim();
          const parishName = String(cells[parishIdx] ?? '').trim();

          if (!admNo) continue;
          if (!parishName) {
            skipped++;
            continue;
          }

          const student = students.find((s) => String(s.adm_no).trim() === admNo);
          if (!student) {
            skippedNoStudent++;
            continue;
          }

          payload.push({
            adm_no: admNo,
            parish_name: parishName,
          });
        }

        if (payload.length === 0) {
          toast.warning(
            `No parishes to upload. ${skippedNoStudent ? `${skippedNoStudent} row(s) had unknown AdmNumber. ` : ''}${skipped ? `${skipped} row(s) were empty.` : ''}`.trim()
          );
          return;
        }

        const res = await studentsAPI.saveParishesBulk({
          level: normalizedLevel,
          stream: stream,
          year: apiYear,
          parishes: payload,
        });

        const saved = res.data?.saved ?? 0;
        const failed = res.data?.failed ?? 0;

        queryClient.invalidateQueries(['student-parishes', normalizedLevel, stream, apiYear, selectedTerm]);

        if (saved > 0 && failed === 0) {
          toast.success(`Upload complete: ${saved} parish(es) saved.`);
        } else if (failed > 0) {
          toast.warning(`Upload complete with issues: ${saved} saved, ${failed} failed.`);
        } else {
          toast.success('Upload complete');
        }
      } catch (err) {
        console.error('[Parish CSV upload] Failure:', err?.response?.data || err?.message || err);
        toast.error(err?.response?.data?.message || err?.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    };

    setTimeout(run, 0);
  };

  const handleDelete = (student, index) => {
    if (window.confirm(`Are you sure you want to delete the parish assignment for ${student.first_name} ${student.surname}?`)) {
      deleteMutation.mutate({ adm_no: student.adm_no });
    }
  };

  const getParishName = (admNo) => {
    // Safety check: if parishesData is not loaded yet, return null
    if (!parishesData || typeof parishesData !== 'object') {
      return null;
    }
    
    if (!admNo) {
      return null;
    }
    
    // Get parish record for this adm_no
    const parish = parishesData[String(admNo).trim()];
    
    if (!parish) {
      // No parish record exists for this adm_no
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
            <div className="parish-mgmt-card-title">
              <i className="fas fa-place-of-worship" aria-hidden="true"></i>
              <span>Parishes Management - {normalizedLevel} {stream} {apiYear}</span>
            </div>
            <div className="parish-mgmt-card-header-meta">
              <label className="parish-mgmt-term-field">
                <span>Term</span>
                <select
                  className="parish-term-select"
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  aria-label="Academic term"
                >
                  <option value="First Term">First Term (Jul-Dec)</option>
                  <option value="Second Term">Second Term (Jan-Jun)</option>
                </select>
              </label>
              <span className="parish-load-status">
                {parishesLoading ? 'Loading parishes...' : 
                 parishesError ? 'Error loading parishes' :
                 parishesData && typeof parishesData === 'object' && Object.keys(parishesData).length > 0 ? 
                   `${Object.keys(parishesData).length} parish${Object.keys(parishesData).length !== 1 ? 'es' : ''} loaded` :
                   'No parishes loaded'}
              </span>
            </div>
          </div>
          <div className="parish-mgmt-card-body">
            <div className="parish-csv-actions csv-bulk-actions">
              <button
                type="button"
                className="parish-btn small primary"
                onClick={handleDownloadTemplate}
                disabled={students.length === 0 || uploading}
                title={CSV_BULK_TITLES.template}
              >
                <i className="fas fa-download"></i> {CSV_BULK_LABELS.template}
              </button>

              <button
                type="button"
                className="parish-btn small primary"
                onClick={handleDownloadFilledCSV}
                disabled={students.length === 0 || uploading || parishesLoading}
                title={CSV_BULK_TITLES.filled}
              >
                <i className="fas fa-file-csv"></i> {CSV_BULK_LABELS.filled}
              </button>

              <label
                className="parish-btn small primary"
                style={{ cursor: 'pointer', opacity: uploading || students.length === 0 ? 0.6 : 1 }}
                title={CSV_BULK_TITLES.upload}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleUploadFilled}
                  disabled={uploading || students.length === 0}
                  style={{ display: 'none' }}
                />
                <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i> {uploading ? CSV_BULK_LABELS.uploading : CSV_BULK_LABELS.upload}
              </label>
            </div>

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
                    {normalizedLevel} | {stream} | {apiYear}
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
                  {normalizedLevel} | {stream} | {apiYear}
                </p>
              </div>
            ) : (
              <>
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
                    {paginatedStudents.map((student, i) => {
                      const index = (currentPage - 1) * ITEMS_PER_PAGE + i;
                      const parish = getParishName(student.adm_no);
                      
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
                                type="button"
                                className="parish-btn small primary"
                                onClick={() => openModal(student)}
                                title="Assign/Edit Parish"
                              >
                                <i className="fas fa-edit"></i> {parish ? 'Edit' : 'Assign'}
                              </button>
                              {parish && (
                                <button
                                  type="button"
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
              </>
            )}
              {totalPages > 1 && (
                <div className="parish-pagination">
                  <button
                    type="button"
                    className="parish-btn small"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <i className="fas fa-chevron-left"></i> Prev
                  </button>
                  <span className="parish-pagination-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="parish-btn small"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next <i className="fas fa-chevron-right"></i>
                  </button>
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

