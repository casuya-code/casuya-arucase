/**
 * Form V / Form VI promotion: term rollover and Form V → Form VI
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import {
  getFormVVICardByYear,
  FORM_V_VI_STREAM_CODES,
} from '../../utils/academicYearUtils';
import './Promotion.css';

const MODES = {
  TERM_ROLLOVER: 'term_rollover',
  TO_FORM_VI: 'to_form_vi',
};

const FormVVIPromotion = ({ formLevel }) => {
  const { stream, year } = useParams();
  const queryClient = useQueryClient();
  const yearNum = parseInt(year, 10);

  const normalizedLevel = formLevel === 'FORM VI' ? 'FORM VI' : 'FORM V';
  const formSlug = formLevel === 'FORM VI' ? 'form-vi' : 'form-v';
  const streamCode = (stream || '').toUpperCase();

  const [activeMode, setActiveMode] = useState(null);
  const [sourceTerm, setSourceTerm] = useState('First Term');
  const [excludedAdmNos, setExcludedAdmNos] = useState([]);

  const yearCard = getFormVVICardByYear(yearNum);

  const rolloverSourceTerm = 'First Term';
  const toFormVISourceTerm = 'Second Term';

  const previewQuery = useQuery({
    queryKey: ['form-vvi-promotion-preview', normalizedLevel, streamCode, yearNum, activeMode, sourceTerm],
    queryFn: async () => {
      const res = await studentsAPI.getFormVVIPromotionPreview({
        level: normalizedLevel,
        stream: streamCode,
        year: yearNum,
        term: sourceTerm,
        mode: activeMode,
      });
      return res.data;
    },
    enabled: Boolean(activeMode && streamCode && yearNum),
  });

  const executeMutation = useMutation({
    mutationFn: (payload) => studentsAPI.executeFormVVIPromotion(payload),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Promotion completed');
      queryClient.invalidateQueries({ queryKey: ['form-vvi-promotion-preview'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setExcludedAdmNos([]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Promotion failed');
    },
  });

  const startMode = (mode) => {
    setActiveMode(mode);
    setSourceTerm(mode === MODES.TERM_ROLLOVER ? rolloverSourceTerm : toFormVISourceTerm);
    setExcludedAdmNos([]);
  };

  const toggleExclude = (admNo) => {
    setExcludedAdmNos((prev) =>
      prev.includes(admNo) ? prev.filter((a) => a !== admNo) : [...prev, admNo]
    );
  };

  const handleExecute = () => {
    const data = previewQuery.data;
    if (!data || data.session_completed) return;

    if (
      !window.confirm(
        `Promote ${Math.max(0, data.to_promote_count - excludedAdmNos.length)} student(s)?\n\n${data.label}`
      )
    ) {
      return;
    }

    executeMutation.mutate({
      level: normalizedLevel,
      stream: streamCode,
      year: yearNum,
      term: sourceTerm,
      mode: activeMode,
      excluded_adm_nos: excludedAdmNos,
    });
  };

  const preview = previewQuery.data;

  return (
    <AdminLayout>
      <div className="promotion-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-graduation-cap"></i>
            {normalizedLevel} {streamCode} — Promotion ({yearNum})
            <div className="header-actions">
              <Link
                to={`/admin/promotion/${formSlug}/stream/${stream}/years`}
                className="excel-btn secondary small"
              >
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            <p className="form-vvi-year-help" style={{ marginBottom: 20 }}>
              Year card: <strong>{yearCard?.displayLabel || yearNum}</strong>. Form V/VI students are
              stored per calendar year and term (Jul–Dec = First Term, Jan–Jun = Second Term).
            </p>

            {!activeMode && (
              <div className="promotion-info" style={{ flexDirection: 'column', gap: 16 }}>
                <div className="info-card" style={{ maxWidth: '100%' }}>
                  <h4>1. Roll cohort to Second Term</h4>
                  <p>
                    Copy students from <strong>{yearNum} First Term</strong> →{' '}
                    <strong>{yearNum + 1} Second Term</strong> (same {normalizedLevel} {streamCode}).
                  </p>
                  <p style={{ fontSize: 13, color: '#64748b' }}>
                    Use after Jul–Dec (Term I). Example: PCB 2025 First → PCB 2026 Second.
                  </p>
                  <button
                    type="button"
                    className="excel-btn primary"
                    onClick={() => startMode(MODES.TERM_ROLLOVER)}
                  >
                    Preview term rollover
                  </button>
                </div>

                {normalizedLevel === 'FORM V' && (
                  <div className="info-card" style={{ maxWidth: '100%' }}>
                    <h4>2. Promote to Form VI</h4>
                    <p>
                      Copy students from <strong>FORM V {streamCode} {yearNum} Second Term</strong> →{' '}
                      <strong>FORM VI {streamCode} {yearNum} First Term</strong>.
                    </p>
                    <p style={{ fontSize: 13, color: '#64748b' }}>
                      Use after Jan–Jun (Term II). Same combination (e.g. PCB → PCB).
                    </p>
                    <button
                      type="button"
                      className="excel-btn primary"
                      onClick={() => startMode(MODES.TO_FORM_VI)}
                    >
                      Preview Form V → Form VI
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeMode && (
              <>
                <button
                  type="button"
                  className="excel-btn secondary small"
                  style={{ marginBottom: 12 }}
                  onClick={() => {
                    setActiveMode(null);
                    setExcludedAdmNos([]);
                  }}
                >
                  <i className="fas fa-arrow-left"></i> Choose another action
                </button>

                {previewQuery.isLoading && (
                  <div className="loading-state">Loading preview...</div>
                )}

                {previewQuery.error && (
                  <div className="warning-banner">
                    {previewQuery.error.response?.data?.message || previewQuery.error.message}
                  </div>
                )}

                {preview && (
                  <>
                    {preview.session_completed && (
                      <div className="warning-banner">
                        <i className="fas fa-check-circle"></i>
                        This promotion was already completed on{' '}
                        {preview.session?.created_at
                          ? new Date(preview.session.created_at).toLocaleString()
                          : 'a previous date'}
                        .
                      </div>
                    )}

                    <div className="promotion-info">
                      <div className="info-card">
                        <h4>Action</h4>
                        <p>{preview.label}</p>
                      </div>
                      <div className="info-card">
                        <h4>From</h4>
                        <p>
                          {preview.from.level} {preview.from.stream} {preview.from.year}{' '}
                          {preview.from.term}
                        </p>
                      </div>
                      <div className="info-card">
                        <h4>To</h4>
                        <p>
                          {preview.to.level} {preview.to.stream} {preview.to.year} {preview.to.term}
                        </p>
                      </div>
                      <div className="info-card">
                        <h4>To promote</h4>
                        <p>{preview.to_promote_count}</p>
                      </div>
                      <div className="info-card">
                        <h4>Already at destination</h4>
                        <p>{preview.already_at_destination_count}</p>
                      </div>
                    </div>

                    <div className="students-list-section">
                      <h3>Students</h3>
                      <p className="section-hint">Uncheck to exclude (repeaters / not moving)</p>
                      <div className="students-table-container">
                        <table className="excel-table">
                          <thead>
                            <tr>
                              <th />
                              <th>Adm</th>
                              <th>Name</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.students.map((s) => {
                              const excluded = excludedAdmNos.includes(s.adm_no);
                              const atDest = s.already_at_destination;
                              return (
                                <tr
                                  key={s.adm_no}
                                  className={excluded || atDest ? 'excluded-row' : ''}
                                >
                                  <td>
                                    <input
                                      type="checkbox"
                                      disabled={atDest}
                                      checked={!excluded && !atDest}
                                      onChange={() => toggleExclude(s.adm_no)}
                                    />
                                  </td>
                                  <td>{s.adm_no}</td>
                                  <td>
                                    {s.first_name} {s.surname}
                                  </td>
                                  <td>
                                    {atDest ? (
                                      <span className="status-badge badge-inactive">
                                        Already registered
                                      </span>
                                    ) : excluded ? (
                                      <span className="status-badge badge-inactive">Excluded</span>
                                    ) : (
                                      <span className="status-badge badge-active">Will promote</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="promotion-actions">
                      <button
                        type="button"
                        className="excel-btn primary large"
                        disabled={
                          executeMutation.isPending ||
                          preview.session_completed ||
                          preview.to_promote_count === 0
                        }
                        onClick={handleExecute}
                      >
                        <i className="fas fa-graduation-cap" />
                        {executeMutation.isPending ? 'Promoting...' : 'Run promotion'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            <p style={{ marginTop: 24, fontSize: 12, color: '#94a3b8' }}>
              Combinations: {FORM_V_VI_STREAM_CODES.join(', ')}. Subjects/teachers for the
              destination year are copied when possible.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default FormVVIPromotion;
