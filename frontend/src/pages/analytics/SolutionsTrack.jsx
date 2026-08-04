import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/layout/AdminLayout';
import { analyticsAPI } from '../../services/analytics';
import { normalizeFormLabel } from '../../utils/analyticsUtils';
import './AnalyticsTrack.css';

const CATEGORY_CONFIG = [
  { key: 'subjectSpecific', title: 'Subject-specific', icon: 'fa-book', color: '#3b82f6' },
  { key: 'classLevel', title: 'Class-level', icon: 'fa-users', color: '#8b5cf6' },
  { key: 'studentLevel', title: 'Student-level', icon: 'fa-user-graduate', color: '#10b981' },
  { key: 'teachingStrategies', title: 'Teaching Strategies', icon: 'fa-chalkboard-teacher', color: '#f59e0b' },
  { key: 'resourceAllocation', title: 'Resource Allocation', icon: 'fa-tasks', color: '#ef4444' },
];

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };

const SolutionsTrack = () => {
  const { form } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const formLabel = normalizeFormLabel(form);

  const standardStreams = [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }];
  const combinationStreams = [
    { value: 'PCB', label: 'PCB' }, { value: 'PCM', label: 'PCM' },
    { value: 'EGM', label: 'EGM' }, { value: 'HGE', label: 'HGE' }, { value: 'HGL', label: 'HGL' },
  ];
  const availableStreams = (formLabel.includes('FORM V') || formLabel.includes('FORM VI'))
    ? combinationStreams : standardStreams;

  const [selectedStream, setSelectedStream] = useState(() => {
    const u = searchParams.get('stream');
    return (u && availableStreams.find(s => s.value === u)) ? u : availableStreams[0]?.value || 'A';
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const u = searchParams.get('year');
    if (u) { const y = parseInt(u); if (!isNaN(y) && y > 0) return y; }
    return null;
  });
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const p = new URLSearchParams(searchParams);
    if (selectedStream) p.set('stream', selectedStream); else p.delete('stream');
    if (selectedYear) p.set('year', selectedYear.toString()); else p.delete('year');
    setSearchParams(p, { replace: true });
  }, [selectedStream, selectedYear]);

  const { data, isLoading, error, isError, refetch } = useQuery({
    queryKey: ['solutions', formLabel, selectedStream, selectedYear],
    queryFn: async () => {
      const params = { form: formLabel, stream: selectedStream, term: 'First Term' };
      if (selectedYear) params.year = selectedYear;
      const res = await analyticsAPI.getSolutions(params);
      if (!res.data) throw new Error('No data received');
      return res.data;
    },
    enabled: !!selectedStream,
    staleTime: 5 * 60 * 1000,
    retry: (f, e) => (e?.response?.status >= 400 && e?.response?.status < 500) ? false : f < 2,
  });

  const recs = data?.recommendations || {};

  return (
    <AdminLayout>
      <div className="an-st-page">
        <div className="an-st-shell">
          <header className="an-st-top">
            <div className="an-st-top-row">
              <div>
                <h1 className="an-st-title">Solutions</h1>
                <p className="an-st-sub">{formLabel} &mdash; Stream {selectedStream}</p>
              </div>
              <Link to={`/admin/analytics/${encodeURIComponent(form)}`} className="an-st-back">
                <i className="fas fa-arrow-left" /><span>Back</span>
              </Link>
            </div>
          </header>

          <div className="an-ct-filters">
            <div className="an-ct-filter">
              <label className="an-ct-filter-label">Stream</label>
              <select value={selectedStream} onChange={e => setSelectedStream(e.target.value)} className="an-ct-select">
                {availableStreams.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="an-ct-filter">
              <label className="an-ct-filter-label">Year (optional)</label>
              <input type="number" value={selectedYear || ''} onChange={e => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)} className="an-ct-input" placeholder="All years" min={new Date().getFullYear() - 10} max={new Date().getFullYear() + 5} />
            </div>
          </div>

          {isLoading ? (
            <div className="an-st-loading"><div className="an-st-spinner" /><span>Generating recommendations...</span></div>
          ) : isError ? (
            <div className="an-ct-error"><i className="fas fa-exclamation-triangle" /><span>{error?.message || 'Failed to load'}</span><button onClick={() => refetch()} className="an-ct-retry">Retry</button></div>
          ) : data ? (
            <div className="an-st-perf-body">
              {/* Summary Stats */}
              <div className="an-ct-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="an-ct-stat">
                  <span className="an-ct-stat-label">Total</span>
                  <span className="an-ct-stat-val an-ct-blue">{data.summary?.totalRecommendations || 0}</span>
                </div>
                <div className="an-ct-stat">
                  <span className="an-ct-stat-label">High Priority</span>
                  <span className="an-ct-stat-val an-ct-red">{data.summary?.highPriority || 0}</span>
                </div>
                <div className="an-ct-stat">
                  <span className="an-ct-stat-label">Categories</span>
                  <span className="an-ct-stat-val an-ct-blue">{CATEGORY_CONFIG.filter(c => (recs[c.key]?.length || 0) > 0).length}</span>
                </div>
              </div>

              {/* Category Accordion */}
              <div className="an-waw-cats">
                {CATEGORY_CONFIG.map(cat => {
                  const items = recs[cat.key] || [];
                  const isOpen = expanded === cat.key;
                  return (
                    <div key={cat.key} className="an-waw-cat">
                      <button className={`an-waw-cat-head ${isOpen ? 'open' : ''}`} onClick={() => setExpanded(isOpen ? null : cat.key)} type="button">
                        <span className="an-waw-cat-icon" style={{ background: cat.color + '14', color: cat.color }}>
                          <i className={`fas ${cat.icon}`} />
                        </span>
                        <span className="an-waw-cat-info">
                          <span className="an-waw-cat-title">{cat.title}</span>
                          <span className="an-waw-cat-desc">{items.length} recommendation{items.length !== 1 ? 's' : ''}</span>
                        </span>
                        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} an-waw-cat-chevron`} />
                      </button>

                      {isOpen && (
                        <div className="an-waw-cat-body">
                          {items.length === 0 ? (
                            <div className="an-waw-empty">No recommendations in this category</div>
                          ) : (
                            items.map((rec, idx) => (
                              <div key={idx} className="an-sol-card">
                                <div className="an-sol-card-top">
                                  <h4 className="an-sol-title">{rec.title}</h4>
                                  {rec.priority && (
                                    <span className="an-sol-badge" style={{ background: (PRIORITY_COLORS[rec.priority] || '#aaa') + '18', color: PRIORITY_COLORS[rec.priority] || '#666' }}>
                                      {rec.priority}
                                    </span>
                                  )}
                                </div>
                                {rec.description && <p className="an-sol-desc">{rec.description}</p>}
                                {rec.details && Object.keys(rec.details).length > 0 && (
                                  <div className="an-sol-section">
                                    <span className="an-sol-section-label">Details</span>
                                    <ul className="an-sol-list">
                                      {Object.entries(rec.details).map(([k, v]) => (
                                        <li key={k}><strong>{k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}:</strong> {Array.isArray(v) ? v.join(', ') : String(v)}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {rec.actions?.length > 0 && (
                                  <div className="an-sol-section">
                                    <span className="an-sol-section-label">Actions</span>
                                    <ul className="an-sol-list">
                                      {rec.actions.map((a, i) => <li key={i}>{a}</li>)}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AdminLayout>
  );
};

export default SolutionsTrack;
