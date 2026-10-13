/**
 * Pre-Form One Individual Debt Management Page
 *
 * Pre-Form One has no streams or terms: a year is the only selector. Debts are
 * keyed by the Pre-Form One student id and appear in the "Fees Due" line of the
 * continuing report card.
 */
import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { preFormOneService } from '../../services/preFormOneService';
import { useGoBack } from '../../hooks/useGoBack';
import './DebtsManagement.css';
import './preform-one-modern.css';
import { CSV_BULK_LABELS, CSV_BULK_TITLES } from '../../constants/csvBulkActions';

const PreFormOneDebtsManagement = () => {
  const { year } = useParams();
  const queryClient = useQueryClient();
  const goBack = useGoBack('/admin/pre-form-one-debts');

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['pre-form-one-debts', year],
    queryFn: async () => {
      const res = await preFormOneService.getDebts(year);
      return { students: res.students || [], debts: res.debts || {} };
    },
    enabled: !!year,
    retry: (failureCount, err) => {
      if (err?.response?.status === 401 || err?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });

  const students = data?.students || [];
  const existingDebt = data?.debts || {};

  const invalidate = () => queryClient.invalidateQueries(['pre-form-one-debts', year]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => preFormOneService.saveDebt(year, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Debt record updated successfully!');
      setEditingId(null);
      setEditForm({});
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save debt record');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (studentId) => preFormOneService.deleteDebt(year, studentId),
    onSuccess: () => {
      invalidate();
      toast.success('Debt record deleted successfully!');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete debt record');
    },
  });

  const handleEdit = (student) => {
    const debt = existingDebt[String(student.id)] || {};
    setEditingId(String(student.id));
    setEditForm({
      student_id: student.id,
      amount: debt.amount || 0,
      description: debt.description || '',
    });
  };

  const handleSave = () => {
    if (editForm.amount < 0) {
      toast.error('Amount must be non-negative');
      return;
    }
    saveMutation.mutate(editForm);
  };

  const handleDelete = (student) => {
    if (window.confirm('Are you sure you want to delete this debt record?')) {
      deleteMutation.mutate(student.id);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const formatAmount = (amount) => {
    if (!amount || amount === 0) return 'No debt';
    return new Intl.NumberFormat('en-TZ').format(amount);
  };

  const fullName = (s) => [s.first_name, s.middle_name, s.surname].filter(Boolean).join(' ');

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
        out.push(cur.trim().replace(/^\uFEFF/, ''));
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

  const buildDebtCsv = () => {
    const headers = ['AdmNumber', 'amount', 'description'];
    const rows = students.map((s) => {
      const debt = existingDebt[String(s.id)] || {};
      return [csvEscape(s.admission_number ?? ''), csvEscape(debt.amount ?? 0), csvEscape(debt.description ?? '')].join(',');
    });
    return [headers.join(','), ...rows].join('\r\n');
  };

  const downloadCsv = (csv, filename) => {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const csvFilename = `pre_form_one_debt_${year}.csv`;

  const handleDownloadTemplate = () => {
    downloadCsv(buildDebtCsv(), csvFilename.replace('.csv', '_template.csv'));
    toast.success('Debt CSV template downloaded');
  };

  const handleDownloadFilledCSV = () => {
    downloadCsv(buildDebtCsv(), csvFilename.replace('.csv', '_filled.csv'));
    toast.success('Filled debt CSV downloaded');
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
        const header = parseLine(firstLine, delimiter).map(normalizeHeader);

        const admNoIdx = header.findIndex(
          (h) => h === 'admnumber' || h === 'adm_no' || h === 'admno' || h.startsWith('admission'),
        );
        const amountIdx = header.findIndex((h) => h === 'amount' || h === 'debtamount' || h === 'debt');
        const descIdx = header.findIndex((h) => h === 'description' || h === 'desc');

        if (admNoIdx === -1 || amountIdx === -1) {
          toast.error('Upload rejected: CSV must include columns "AdmNumber" and "amount"');
          return;
        }

        const byAdmNo = new Map(
          students.map((s) => [String(s.admission_number ?? '').trim(), s]),
        );

        const payload = [];
        let skipped = 0;

        for (let i = 1; i < lines.length; i++) {
          const cells = parseLine(lines[i], delimiter);
          const admNo = String(cells[admNoIdx] ?? '').trim();
          if (!admNo) continue;

          const student = byAdmNo.get(admNo);
          if (!student) {
            skipped += 1;
            continue;
          }

          const amountRaw = String(cells[amountIdx] ?? '').trim();
          const amount = amountRaw === '' ? 0 : parseFloat(amountRaw);
          const description = descIdx >= 0 ? String(cells[descIdx] ?? '').trim() : '';

          payload.push({
            student_id: student.id,
            amount: Number.isNaN(amount) ? 0 : amount,
            description,
          });
        }

        if (payload.length === 0) {
          toast.warning('No valid rows found to upload');
          return;
        }

        const res = await preFormOneService.saveDebtsBulk(year, payload);
        invalidate();

        const failed = res?.failed ?? 0;
        const saved = res?.saved ?? 0;
        if (failed === 0) {
          toast.success(`Upload complete: ${saved} debt record(s) saved.`);
        } else {
          toast.warning(`Upload complete with issues: ${saved} saved, ${failed} failed.`);
        }
        if (skipped > 0) {
          toast.warning(`${skipped} row(s) skipped (unknown admission number).`);
        }
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
      <div className="debts-mgmt-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-money-bill-wave"></i>
            Pre-Form One Student Debt - {year}
            <div className="header-actions">
              <button type="button" onClick={goBack} className="excel-btn secondary small">
                <i className="fas fa-arrow-left"></i> Back
              </button>
            </div>
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : error ? (
              <div className="empty-state">
                <i className="fas fa-exclamation-triangle empty-icon"></i>
                <h3>Error Loading Students</h3>
                <p>{error.response?.data?.message || error.message || 'Failed to load students. Please try again.'}</p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>Year={year}</p>
              </div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-money-bill-wave empty-icon"></i>
                <h3>No Students Found</h3>
                <p>No Pre-Form One students have been registered for this year yet.</p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>Year={year}</p>
              </div>
            ) : (
              <>
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
                        const sid = String(student.id);
                        const debt = existingDebt[sid];
                        const isEditing = editingId === sid;

                        return (
                          <tr key={student.id}>
                            <td>{index + 1}</td>
                            <td>{student.admission_number || '-'}</td>
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
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })
                                  }
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
                                    onClick={handleSave}
                                    className="action-btn save-btn"
                                    disabled={saveMutation.isPending}
                                  >
                                    <i className="fas fa-save"></i>
                                  </button>
                                  <button onClick={handleCancel} className="action-btn cancel-btn">
                                    <i className="fas fa-times"></i>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => handleEdit(student)} className="action-btn edit-btn">
                                    <i className="fas fa-edit"></i> Edit
                                  </button>
                                  {debt?.amount > 0 && (
                                    <button onClick={() => handleDelete(student)} className="action-btn delete-btn">
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
                    const sid = String(student.id);
                    const debt = existingDebt[sid];
                    const isEditing = editingId === sid;

                    return (
                      <div key={student.id} className="mobile-student-card">
                        <div className="mobile-student-card-header">
                          <div className="student-info">
                            <div className="student-name">
                              {index + 1}. {fullName(student)}
                            </div>
                            <div className="student-adm">Adm No: {student.admission_number || '-'}</div>
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
                                onChange={(e) =>
                                  setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })
                                }
                                className="debt-input"
                                style={{ maxWidth: '150px', textAlign: 'right' }}
                              />
                            ) : (
                              <span
                                className={
                                  debt?.amount > 0
                                    ? 'mobile-student-field-value debt-amount'
                                    : 'mobile-student-field-value text-muted'
                                }
                              >
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
                              <span
                                className={
                                  debt?.description
                                    ? 'mobile-student-field-value debt-text'
                                    : 'mobile-student-field-value text-muted'
                                }
                              >
                                {debt?.description || '-'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mobile-student-actions">
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleSave}
                                className="action-btn save-btn"
                                disabled={saveMutation.isPending}
                              >
                                <i className="fas fa-save"></i> Save
                              </button>
                              <button onClick={handleCancel} className="action-btn cancel-btn">
                                <i className="fas fa-times"></i> Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleEdit(student)} className="action-btn edit-btn">
                                <i className="fas fa-edit"></i> Edit
                              </button>
                              {debt?.amount > 0 && (
                                <button onClick={() => handleDelete(student)} className="action-btn delete-btn">
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
                  <h3>
                    <i className="fas fa-file-csv"></i> CSV Bulk Operations
                  </h3>
                  <p className="csv-hint">
                    Download the template, fill the <strong>amount</strong> and{' '}
                    <strong>description</strong> columns (matched by AdmNumber), then upload.
                  </p>
                  <div className="csv-actions csv-bulk-actions">
                    <button
                      className="excel-btn primary"
                      onClick={handleDownloadTemplate}
                      disabled={students.length === 0 || uploading}
                      title={CSV_BULK_TITLES.template}
                    >
                      <i className="fas fa-download"></i> {CSV_BULK_LABELS.template}
                    </button>
                    <button
                      className="excel-btn secondary"
                      onClick={handleDownloadFilledCSV}
                      disabled={students.length === 0 || uploading}
                      title={CSV_BULK_TITLES.filled}
                    >
                      <i className="fas fa-download"></i> {CSV_BULK_LABELS.filled}
                    </button>
                    <label
                      className="excel-btn success"
                      style={{
                        cursor: students.length === 0 ? 'not-allowed' : 'pointer',
                        opacity: students.length === 0 ? 0.6 : 1,
                      }}
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
                      <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>{' '}
                      {uploading ? CSV_BULK_LABELS.uploading : CSV_BULK_LABELS.upload}
                    </label>
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

export default PreFormOneDebtsManagement;
