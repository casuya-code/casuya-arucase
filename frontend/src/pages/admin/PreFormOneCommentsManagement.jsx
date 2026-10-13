/**
 * Pre-Form One Comments — management grid (PRE-Sala, PRE-Taaluma, …).
 *
 * Generic textarea grid for the free-text Pre-Form One comment modules. Keyed by
 * student_id + year (no stream/term). Auto-saves on blur/debounce; Taaluma,
 * Mwalimu wa Taaluma and Mkuu wa Shule can auto-fill from O-Level class grades.
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import preFormOneService from '../../services/preFormOneService';
import './../comments/CommentsManagement.css';
import { CSV_BULK_LABELS, CSV_BULK_TITLES } from '../../constants/csvBulkActions';
import './preform-one-modern.css';

const TAALUMA_GRADE_COMMENTS = {
  A: 'Hongera kwa mafanikio haya; amepata wastani mzuri sana. Tunahitaji aendelee na nidhamu na bidii ili kudumisha kiwango hiki.',
  B: 'Mwanafunzi mahiri; akizingatia zaidi usahihi na kina cha majibu, kiwango cha juu kipo karibu. Tunasisitiza usimamizi mzuri nyumbani na ufuatiliaji wa karibu. Ahimizwe kusoma.',
  C: 'Ana msingi mzuri; anahitaji kufanya mazoezi zaidi na kudhibiti muda wake wa kusoma ili kuboresha matokeo. Tunasisitiza usimamizi mzuri nyumbani na ufuatiliaji wa karibu. Ahimizwe kusoma.',
  D: 'Anahitaji msaada wa ziada; inashauriwa afuate masomo kwa makini, aulizie mwalimu pale anapokwama, na afanye marudio ya masomo nyumbani. Mabadiliko ya haraka yanahitajika. Asipofikisha wastani, atashauriwa kutafuta shule nyingine.',
  F: 'Matokeo yanalazimu mabadiliko ya haraka; mzazi/mlezi ashirikiane na uongozi wa Seminari ili kupanga mkakati wa kusaidia mwanafunzi huyu kwa pamoja. Asipofikisha wastani, atashauriwa kutafuta shule nyingine.',
};

const MWALIMU_GRADE_COMMENTS = {
  A: 'Amefanya vizuri',
  B: 'Amefanya vizuri',
  C: 'Ufaulu wa wastani',
  D: 'Ufaulu dhaifu. Aongeze bidii katika masomo',
  F: 'Amefeli',
};

const MKUU_GRADE_COMMENTS = {
  A: 'Pongezi kwa matokeo haya mazuri; dumu katika kiwango hiki.',
  B: 'Amefanya vizuri, akazane kufikia kiwango cha juu zaidi.',
  C: 'Uwezo upo, ongeza umakini ili kupata matokeo bora zaidi.',
  D: 'Asikate tamaa; akiongeza juhudi atafanya vyema zaidi.',
  F: 'Ni lazima azingatie maelekezo ya walimu ili kufaulu.',
};

function getGradeComment(commentType, grade) {
  const g = String(grade || '').toUpperCase();
  if (!g) return '';
  if (commentType === 'taaluma') return TAALUMA_GRADE_COMMENTS[g] || '';
  if (commentType === 'mwalimu_taaluma') return MWALIMU_GRADE_COMMENTS[g] || '';
  if (commentType === 'mkuu_shule') return MKUU_GRADE_COMMENTS[g] || '';
  return '';
}

const PreFormOneCommentsManagement = ({ moduleConfig }) => {
  const { year } = useParams();
  const queryClient = useQueryClient();

  const {
    commentType,
    moduleLabel = 'Comments',
    label = moduleLabel,
    icon = 'fa-comments',
    basePath = '/admin',
    supportsAutoFill = false,
  } = moduleConfig || {};

  const [comments, setComments] = useState({});
  const [saveTimeouts, setSaveTimeouts] = useState({});
  const [savingStates, setSavingStates] = useState({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const autoFillDoneRef = useRef(false);

  // Students for the year
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['pre-form-one-students', year],
    queryFn: async () => {
      const res = await preFormOneService.getStudents(year);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return list;
    },
  });

  // Existing comments for this type
  const { data: existingComments = {}, isLoading: commentsLoading } = useQuery({
    queryKey: ['pre-form-one-comments', year, commentType],
    queryFn: async () => {
      const res = await preFormOneService.getComments(year, commentType);
      return res?.comments || {};
    },
    enabled: students.length > 0,
  });

  // O-Level class grades for auto-fill
  const { data: classGradesData = {}, isLoading: gradesLoading } = useQuery({
    queryKey: ['pre-form-one-class-grades', year],
    queryFn: async () => {
      const res = await preFormOneService.getClassGrades(year);
      return { grades: res?.grades || {}, averages: res?.averages || {} };
    },
    enabled: supportsAutoFill && students.length > 0,
    retry: false,
  });
  const classGrades = classGradesData.grades || {};
  const classAverages = classGradesData.averages || {};

  useEffect(() => {
    // Guard on a non-empty payload: existingComments defaults to a fresh {}
    // while the query is pending, and setting state to a new object on every
    // render would re-run this effect forever (starving timers in tests).
    if (Object.keys(existingComments).length > 0) {
      setComments(existingComments);
    }
    autoFillDoneRef.current = false;
  }, [existingComments]);

  const saveCommentMutation = useMutation({
    mutationFn: ({ studentId, commentText }) =>
      preFormOneService.saveComment(year, {
        student_id: studentId,
        comment_type: commentType,
        comment_text: commentText,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries(['pre-form-one-comments', year, commentType]);
      setSavingStates((prev) => ({ ...prev, [variables.studentId]: 'saved' }));
      setTimeout(() => {
        setSavingStates((prev) => {
          const next = { ...prev };
          delete next[variables.studentId];
          return next;
        });
      }, 2000);
    },
    onError: (error, variables) => {
      if (error.response?.status === 401) {
        setSavingStates((prev) => {
          const next = { ...prev };
          delete next[variables.studentId];
          return next;
        });
        return;
      }
      setSavingStates((prev) => ({ ...prev, [variables.studentId]: 'error' }));
      toast.error(error.response?.data?.message || 'Failed to save comment');
    },
  });

  const saveBulkMutation = useMutation({
    mutationFn: (payload) => preFormOneService.saveCommentsBulk(year, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['pre-form-one-comments', year, commentType]);
    },
  });

  const handleCommentChange = (studentId, value) => {
    setComments((prev) => ({ ...prev, [studentId]: value }));

    if (saveTimeouts[studentId]) clearTimeout(saveTimeouts[studentId]);

    const timeout = setTimeout(() => {
      saveCommentMutation.mutate({ studentId, commentText: value });
    }, 3000);
    setSaveTimeouts((prev) => ({ ...prev, [studentId]: timeout }));
  };

  const handleCommentBlur = (studentId, value) => {
    if (saveTimeouts[studentId]) {
      clearTimeout(saveTimeouts[studentId]);
      setSaveTimeouts((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    }
    setSavingStates((prev) => ({ ...prev, [studentId]: 'saving' }));
    saveCommentMutation.mutate({ studentId, commentText: value });
  };

  // Auto-fill from grades when the module supports it and comments are empty.
  useEffect(() => {
    if (!supportsAutoFill) return;
    if (autoFillDoneRef.current) return;
    if (studentsLoading || commentsLoading || gradesLoading) return;
    if (students.length === 0 || Object.keys(classGrades).length === 0) return;

    const next = { ...existingComments };
    const toSave = [];
    students.forEach((student) => {
      const sid = String(student.id);
      const grade = classGrades[sid];
      const existing = (existingComments[sid] || '').trim();
      if (grade && !existing) {
        const text = getGradeComment(commentType, grade, classAverages[sid]);
        if (text) {
          next[sid] = text;
          toSave.push({ student_id: Number(student.id), comment_text: text });
        }
      }
    });

    autoFillDoneRef.current = true;

    if (toSave.length > 0) {
      setComments(next);
      saveBulkMutation.mutate({ comment_type: commentType, comments: toSave });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportsAutoFill, students, existingComments, classGrades, classAverages, studentsLoading, commentsLoading, gradesLoading, commentType]);

  const handleAutoFillComments = () => {
    if (Object.keys(classGrades).length === 0) {
      toast.warning('Class grades not available. Please calculate continuing results first.');
      return;
    }
    const next = {};
    const toSave = [];
    students.forEach((student) => {
      const sid = String(student.id);
      const grade = classGrades[sid];
      if (grade) {
        const text = getGradeComment(commentType, grade, classAverages[sid]);
        if (text) {
          next[sid] = text;
          toSave.push({ student_id: Number(student.id), comment_text: text });
        }
      }
    });
    setComments(next);
    if (toSave.length > 0) {
      saveBulkMutation.mutate({ comment_type: commentType, comments: toSave });
      toast.success('Comments auto-filled and saved based on grades');
    } else {
      toast.warning('No grades available to auto-fill from.');
    }
  };

  // ---- CSV template / upload (AdmNumber + Comment) ----
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

  const findStudentByAdmNo = (admNoStr) => {
    const a = String(admNoStr ?? '').trim();
    if (!a) return null;
    const byExact = students.find((s) => String(s.admission_number).trim() === a);
    if (byExact) return byExact;
    const aNum = Number(a);
    if (!Number.isNaN(aNum)) {
      return students.find((s) => Number(s.admission_number) === aNum);
    }
    return null;
  };

  const handleDownloadTemplate = () => {
    const headers = ['AdmNumber', 'first_name', 'middle_name', 'surname', 'Comment'];
    const rows = students.map((s) =>
      [
        csvEscape(s.admission_number),
        csvEscape(s.first_name),
        csvEscape(s.middle_name),
        csvEscape(s.surname),
        csvEscape(comments[String(s.id)] ?? ''),
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleConfig?.path || commentType}_comments_template_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV template downloaded');
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
        const header = rawHeaderCells.map((h) =>
          String(h).trim().replace(/\uFEFF/g, '').replace(/\s/g, '').toLowerCase()
        );
        const admNoIdx = header.findIndex(
          (h) => h === 'admnumber' || h === 'adm_no' || h === 'admno' || h.startsWith('admission')
        );
        const commentIdx = header.findIndex((h) => h === 'comment' || h === 'comments');
        if (admNoIdx === -1 || commentIdx === -1) {
          toast.error(
            'Upload rejected: the first row must contain "AdmNumber" and "Comment". Your first row: ' +
              (rawHeaderCells.join(', ') || '(empty)')
          );
          return;
        }
        const payload = [];
        let skipped = 0;
        for (let i = 1; i < lines.length; i++) {
          const cells = parseLine(lines[i], delimiter);
          const admNo = String(cells[admNoIdx] ?? '').trim();
          if (!admNo) continue;
          const student = findStudentByAdmNo(admNo);
          if (!student) {
            skipped++;
            continue;
          }
          payload.push({
            student_id: Number(student.id),
            comment_text: String(cells[commentIdx] ?? '').trim(),
          });
        }
        if (payload.length === 0) {
          toast.warning(
            skipped > 0
              ? `No comments saved: ${skipped} row(s) had AdmNumber not in this year.`
              : 'No comments saved. Ensure the CSV has "AdmNumber" and "Comment" columns.'
          );
          return;
        }
        const data = await preFormOneService.saveCommentsBulk(year, {
          comment_type: commentType,
          comments: payload,
        });
        const saved = data?.saved ?? 0;
        queryClient.invalidateQueries(['pre-form-one-comments', year, commentType]);
        if (saved > 0) {
          toast.success(
            `Upload complete: ${saved} comment(s) saved.${
              skipped > 0 ? ` ${skipped} row(s) skipped.` : ''
            }`
          );
        } else {
          toast.warning('No comments saved.');
        }
      } catch (err) {
        toast.error(err.response?.data?.message || err.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    };
    setTimeout(run, 0);
  };

  const backPath = year ? `${basePath}` : '/admin';

  return (
    <AdminLayout>
      <div className="comments-mgmt-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className={`fas ${icon}`}></i>
            {year} - {label}
            <div className="header-actions">
              <div className="csv-bulk-actions">
                <button
                  type="button"
                  className="excel-btn small secondary"
                  onClick={handleDownloadTemplate}
                  disabled={students.length === 0}
                  title={CSV_BULK_TITLES.template}
                >
                  <i className="fas fa-download"></i> {CSV_BULK_LABELS.template}
                </button>
                <span className="csv-bulk-actions-spacer" aria-hidden="true" />
                <label
                  className="excel-btn small secondary"
                  style={{ marginBottom: 0, cursor: 'pointer' }}
                  title={CSV_BULK_TITLES.upload}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleUploadFilled}
                    disabled={students.length === 0 || uploading}
                    style={{ display: 'none' }}
                  />
                  {uploading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-upload"></i>
                  )}
                  {uploading ? ` ${CSV_BULK_LABELS.uploading}` : ` ${CSV_BULK_LABELS.upload}`}
                </label>
              </div>
              {supportsAutoFill && (
                <button
                  type="button"
                  className="excel-btn small secondary"
                  onClick={handleAutoFillComments}
                  disabled={students.length === 0 || gradesLoading}
                  title="Auto-fill comments based on student grades"
                >
                  <i className="fas fa-magic"></i> Auto-fill Comments
                </button>
              )}
              <Link to={backPath} className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {studentsLoading || commentsLoading ? (
              <div className="loading-state">Loading...</div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <i className={`fas ${icon} empty-icon`}></i>
                <h3>No Students Found</h3>
                <p>No students have been registered for this year yet.</p>
                <Link to="/admin/pre-form-one" className="excel-btn primary">
                  <i className="fas fa-plus"></i> Register Students
                </Link>
              </div>
            ) : (
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
                      <th>Grade</th>
                      <th>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => {
                      const sid = String(student.id);
                      const commentText = comments[sid] || '';
                      const savingState = savingStates[sid];
                      return (
                        <tr key={student.id}>
                          <td>{index + 1}</td>
                          <td>{student.admission_number}</td>
                          <td>{student.first_name}</td>
                          <td>{student.middle_name || '-'}</td>
                          <td>{student.surname}</td>
                          <td>{student.sex}</td>
                          <td>{student.year}</td>
                          <td className="grade-cell">
                            {supportsAutoFill ? classGrades[sid] || '-' : '-'}
                          </td>
                          <td>
                            <div className="comment-input-wrapper">
                              <textarea
                                className={`comment-input ${savingState || ''}`}
                                value={commentText}
                                onChange={(e) => handleCommentChange(sid, e.target.value)}
                                onBlur={(e) => handleCommentBlur(sid, e.target.value)}
                                placeholder={`Enter ${label.toLowerCase()} comment...`}
                                rows="3"
                              />
                              {savingState === 'saving' && (
                                <span className="save-indicator saving">
                                  <i className="fas fa-spinner fa-spin"></i> Saving...
                                </span>
                              )}
                              {savingState === 'saved' && (
                                <span className="save-indicator saved">
                                  <i className="fas fa-check"></i> Saved
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Mobile cards */}
                <div className="mobile-students-list">
                  {students.map((student, index) => {
                    const sid = String(student.id);
                    const commentText = comments[sid] || '';
                    const savingState = savingStates[sid];
                    return (
                      <div key={student.id} className="mobile-student-card">
                        <div className="mobile-student-card-header">
                          <div className="student-info">
                            <div className="student-name">
                              {index + 1}. {student.first_name} {student.middle_name || ''}{' '}
                              {student.surname}
                            </div>
                            <div className="student-adm">
                              Adm No: {student.admission_number}
                            </div>
                          </div>
                        </div>
                        <div className="mobile-student-card-body">
                          <div className="mobile-student-field">
                            <span className="mobile-student-field-label">Sex</span>
                            <span className="mobile-student-field-value">{student.sex}</span>
                          </div>
                          <div className="mobile-student-field">
                            <span className="mobile-student-field-label">Grade</span>
                            <span className="mobile-student-field-value">
                              {supportsAutoFill ? classGrades[sid] || '-' : '-'}
                            </span>
                          </div>
                          <div className="mobile-student-field mobile-comment-field">
                            <span className="mobile-student-field-label">Comments</span>
                            <div className="mobile-comment-input-wrapper">
                              <textarea
                                className={`comment-input ${savingState || ''}`}
                                value={commentText}
                                onChange={(e) => handleCommentChange(sid, e.target.value)}
                                onBlur={(e) => handleCommentBlur(sid, e.target.value)}
                                placeholder={`Enter ${label.toLowerCase()} comment...`}
                                rows="3"
                              />
                              {savingState === 'saved' && (
                                <span className="save-indicator saved">
                                  <i className="fas fa-check"></i> Saved
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PreFormOneCommentsManagement;
