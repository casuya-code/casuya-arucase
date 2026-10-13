/**
 * Pre-Form One Tabia na Mwenendo (PRE-TABIA NA MWENENDO).
 *
 * 11-criterion behaviour grid keyed by student_id + year (no stream/term),
 * mirroring the Forms I–VI Tabia & Mwenendo module.
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import preFormOneService from '../../services/preFormOneService';
import './../comments/TabiaMwenendoManagement.css';
import { CSV_BULK_LABELS, CSV_BULK_TITLES } from '../../constants/csvBulkActions';
import './preform-one-modern.css';

const CRITERIA_CODES = ['901', '902', '903', '904', '905', '906', '907', '908', '909', '910', '911'];
const VALID_GRADES = ['A', 'B', 'C', 'D', 'F'];

const CRITERIA = [
  { code: '901', description: 'Kufanya kazi kwa bidii', english: 'Working diligently' },
  { code: '902', description: 'Ubora wa kazi', english: 'Quality of work' },
  { code: '903', description: 'Kuheshimu kazi', english: 'Respecting work' },
  { code: '904', description: 'Utunzaji wa mali ya shule / binafsi', english: 'Care of school/personal property' },
  { code: '905', description: 'Ushirikiano na wenzake', english: 'Cooperation with peers' },
  { code: '906', description: 'Heshima kwa wenzake / walimu / wafanyakazi', english: 'Respect for peers/teachers/staff' },
  { code: '907', description: 'Sifa za uongozi', english: 'Leadership qualities' },
  { code: '908', description: 'Kutii na kufuata maagizo', english: 'Obedience and following instructions' },
  { code: '909', description: 'Uaminifu', english: 'Honesty' },
  { code: '910', description: 'Usafi binafsi', english: 'Personal cleanliness' },
  { code: '911', description: 'Kushiriki katika Utamaduni / Michezo', english: 'Participation in Culture/Sports' },
];

const PreFormOneTabiaMwenendoManagement = ({ moduleConfig }) => {
  const { year } = useParams();
  const queryClient = useQueryClient();

  const {
    label = 'PRE-Tabia na Mwenendo',
    basePath = '/admin',
    icon = 'fa-balance-scale',
  } = moduleConfig || {};

  const [evaluations, setEvaluations] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveTimeouts, setSaveTimeouts] = useState({});
  const [savingStates, setSavingStates] = useState({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['pre-form-one-students', year],
    queryFn: async () => {
      const res = await preFormOneService.getStudents(year);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return list;
    },
  });

  const { data: existingEvaluations = {}, isLoading: evaluationsLoading } = useQuery({
    queryKey: ['pre-form-one-tabia-mwenendo', year],
    queryFn: async () => {
      const res = await preFormOneService.getTabiaMwenendo(year);
      return res?.evaluations || {};
    },
    enabled: students.length > 0,
  });

  useEffect(() => {
    // Guard on a non-empty payload: existingEvaluations defaults to a fresh {}
    // while the query is pending, and setting state to a new object on every
    // render would re-run this effect forever (starving timers in tests).
    if (Object.keys(existingEvaluations).length > 0) {
      setEvaluations(existingEvaluations);
    }
  }, [existingEvaluations]);

  const saveEvaluationsMutation = useMutation({
    // Accept either a bare array (Save All) or { evaluations, studentId }
    // (per-student autosave) and always POST { evaluations: [...] }.
    mutationFn: (payload) => {
      const evaluationsArray = Array.isArray(payload) ? payload : (payload?.evaluations ?? []);
      return preFormOneService.saveTabiaMwenendo(year, { evaluations: evaluationsArray });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries(['pre-form-one-tabia-mwenendo', year]);
      if (variables?.studentId !== undefined) {
        setSavingStates((prev) => ({ ...prev, [variables.studentId]: 'saved' }));
        setTimeout(() => {
          setSavingStates((prev) => {
            const next = { ...prev };
            delete next[variables.studentId];
            return next;
          });
        }, 2000);
      } else {
        toast.success('Evaluations saved successfully!');
        setHasChanges(false);
      }
    },
    onError: (error, variables) => {
      if (variables?.studentId !== undefined) {
        setSavingStates((prev) => ({ ...prev, [variables.studentId]: 'error' }));
      }
      toast.error(error.response?.data?.message || 'Failed to save evaluations');
    },
  });

  const saveStudentEvaluations = (studentId) => {
    const studentEvals = evaluations[studentId] || {};
    if (Object.keys(studentEvals).length === 0) return;
    const evaluationsArray = Object.entries(studentEvals).map(([criterion, evaluation]) => ({
      student_id: Number(studentId),
      criterion,
      evaluation,
    }));
    saveEvaluationsMutation.mutate({ evaluations: evaluationsArray, studentId });
  };

  const handleGradeChange = (studentId, criterion, grade) => {
    setEvaluations((prev) => {
      const next = { ...prev };
      if (!next[studentId]) next[studentId] = {};
      else next[studentId] = { ...next[studentId] };
      if (grade === '') {
        delete next[studentId][criterion];
        if (Object.keys(next[studentId]).length === 0) delete next[studentId];
      } else {
        next[studentId][criterion] = grade;
      }
      return next;
    });
    setHasChanges(true);

    if (saveTimeouts[studentId]) clearTimeout(saveTimeouts[studentId]);
    setSavingStates((prev) => ({ ...prev, [studentId]: 'saving' }));

    const timeout = setTimeout(() => saveStudentEvaluations(studentId), 3000);
    setSaveTimeouts((prev) => ({ ...prev, [studentId]: timeout }));
  };

  const handleGradeBlur = (studentId) => {
    if (saveTimeouts[studentId]) {
      clearTimeout(saveTimeouts[studentId]);
      setSaveTimeouts((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    }
    saveStudentEvaluations(studentId);
  };

  const handleSaveAll = () => {
    const evaluationsArray = [];
    Object.entries(evaluations).forEach(([studentId, studentEvals]) => {
      Object.entries(studentEvals).forEach(([criterion, evaluation]) => {
        evaluationsArray.push({
          student_id: Number(studentId),
          criterion,
          evaluation,
        });
      });
    });
    if (evaluationsArray.length === 0) {
      toast.warning('No evaluations to save');
      return;
    }
    // The backend expects { evaluations: [...] }; posting a bare array makes
    // the route see req.body.evaluations === undefined and reject the save,
    // which left the tabia section of the report empty.
    saveEvaluationsMutation.mutate({ evaluations: evaluationsArray });
  };

  // ---- CSV ----
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
    const headers = ['AdmNumber', 'first_name', 'middle_name', 'surname', ...CRITERIA_CODES];
    const rows = students.map((s) => {
      const evals = evaluations[String(s.id)] || {};
      return [
        csvEscape(s.admission_number),
        csvEscape(s.first_name),
        csvEscape(s.middle_name),
        csvEscape(s.surname),
        ...CRITERIA_CODES.map((code) => csvEscape(evals[code] ?? '')),
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pre_tabia_mwenendo_template_${year}.csv`;
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
        if (admNoIdx === -1) {
          toast.error('CSV must have column "AdmNumber". Your first row: ' + rawHeaderCells.join(', '));
          return;
        }
        const criterionIndices = {};
        CRITERIA_CODES.forEach((code) => {
          const idx = header.findIndex((h) => h === code);
          if (idx !== -1) criterionIndices[code] = idx;
        });
        if (Object.keys(criterionIndices).length === 0) {
          toast.error('CSV must have at least one criterion column (901 … 911).');
          return;
        }
        const evaluationsArray = [];
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
          Object.entries(criterionIndices).forEach(([code, colIdx]) => {
            const val = String(cells[colIdx] ?? '').trim().toUpperCase();
            if (VALID_GRADES.includes(val)) {
              evaluationsArray.push({
                student_id: Number(student.id),
                criterion: code,
                evaluation: val,
              });
            }
          });
        }
        if (evaluationsArray.length === 0) {
          toast.warning(
            skipped > 0
              ? `No valid rows: ${skipped} row(s) had AdmNumber not in this year.`
              : 'No valid grades in CSV. Use columns 901–911 with values A, B, C, D, or F.'
          );
          return;
        }
        await preFormOneService.saveTabiaMwenendo(year, {
          evaluations: evaluationsArray,
          replaceScope: true,
        });
        queryClient.invalidateQueries(['pre-form-one-tabia-mwenendo', year]);
        toast.success(
          `Upload complete: ${evaluationsArray.length} evaluation(s) saved.${
            skipped > 0 ? ` ${skipped} row(s) skipped.` : ''
          }`
        );
      } catch (err) {
        toast.error(err?.response?.data?.message || err?.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    };
    setTimeout(run, 0);
  };

  return (
    <AdminLayout>
      <div className="tabia-mwenendo-mgmt-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <div className="tabia-mwenendo-header-title">
              <i className={`fas ${icon}`} aria-hidden="true"></i>
              <span className="tabia-mwenendo-header-title-text">
                {year} - {label}
              </span>
            </div>
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
              <Link to={basePath} className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {studentsLoading || evaluationsLoading ? (
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
              <>
                <div className="action-buttons">
                  <button
                    type="button"
                    className="excel-btn primary"
                    onClick={handleSaveAll}
                    disabled={saveEvaluationsMutation.isLoading || !hasChanges}
                  >
                    <i className="fas fa-save"></i>{' '}
                    {saveEvaluationsMutation.isLoading ? 'Saving...' : 'Save All Evaluations'}
                  </button>
                </div>

                <div className="table-container">
                  <table className="tabia-table">
                    <thead>
                      <tr>
                        <th rowSpan="2">S/N</th>
                        <th rowSpan="2">Adm No</th>
                        <th rowSpan="2">First Name</th>
                        <th rowSpan="2">Middle Name</th>
                        <th rowSpan="2">Surname</th>
                        <th colSpan="11">TABIA NA MWENENDO</th>
                      </tr>
                      <tr>
                        {CRITERIA.map((criterion) => (
                          <th key={criterion.code} title={criterion.description}>
                            {criterion.code}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => {
                        const sid = String(student.id);
                        const studentEvals = evaluations[sid] || {};
                        return (
                          <tr key={student.id}>
                            <td>{index + 1}</td>
                            <td>{student.admission_number}</td>
                            <td>{student.first_name}</td>
                            <td>{student.middle_name || '-'}</td>
                            <td>{student.surname}</td>
                            {CRITERIA.map((criterion) => {
                              const currentGrade = studentEvals[criterion.code] || '';
                              const savingState = savingStates[sid];
                              return (
                                <td key={criterion.code}>
                                  <div className="grade-select-wrapper">
                                    <select
                                      className={`grade-select ${
                                        currentGrade ? `grade-${currentGrade.toLowerCase()}` : ''
                                      } ${savingState || ''}`}
                                      value={currentGrade}
                                      onChange={(e) =>
                                        handleGradeChange(sid, criterion.code, e.target.value)
                                      }
                                      onBlur={() => handleGradeBlur(sid)}
                                    >
                                      <option value="">Select</option>
                                      {VALID_GRADES.map((grade) => (
                                        <option key={grade} value={grade}>
                                          {grade}
                                        </option>
                                      ))}
                                    </select>
                                    {savingState === 'saving' && (
                                      <span className="save-indicator saving">
                                        <i className="fas fa-spinner fa-spin"></i>
                                      </span>
                                    )}
                                    {savingState === 'saved' && (
                                      <span className="save-indicator saved">
                                        <i className="fas fa-check"></i>
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="criteria-legend">
                  <h4>Evaluation Criteria:</h4>
                  <div className="criteria-list">
                    {CRITERIA.map((criterion) => (
                      <div key={criterion.code} className="criterion-item">
                        <strong>{criterion.code}:</strong> {criterion.description} ({criterion.english})
                      </div>
                    ))}
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

export default PreFormOneTabiaMwenendoManagement;
