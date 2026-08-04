/**
 * Individual Student Report - Multi-step Wizard
 * Step 1: Form Selection (with Stream for Form V/VI)
 */
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './IndividualReport.css';

const formAccents = {
  'FORM I': '#3b82f6',
  'FORM II': '#10b981',
  'FORM III': '#8b5cf6',
  'FORM IV': '#f59e0b',
  'FORM V': '#ef4444',
  'FORM VI': '#06b6d4',
};

const IndividualReport = () => {
  const navigate = useNavigate();
  const { form } = useParams();
  const location = useLocation();
  const isStreamSelection = location.pathname.includes('/stream');

  const forms = [
    { name: 'FORM I', code: 'FORM I', stream: 'NA', hasStreams: false },
    { name: 'FORM II', code: 'FORM II', stream: 'NA', hasStreams: false },
    { name: 'FORM III', code: 'FORM III', stream: 'NA', hasStreams: false },
    { name: 'FORM IV', code: 'FORM IV', stream: 'NA', hasStreams: false },
    { 
      name: 'FORM V', 
      code: 'FORM V', 
      hasStreams: true,
      streams: ['PCB', 'PCM', 'CBG', 'HGL', 'HKL', 'EGM', 'HGE', 'PGM']
    },
    { 
      name: 'FORM VI', 
      code: 'FORM VI', 
      hasStreams: true,
      streams: ['PCB', 'PCM', 'CBG', 'HGL', 'HKL', 'EGM', 'HGE', 'PGM']
    }
  ];

  const handleFormClick = (form) => {
    if (form.hasStreams) {
      navigate(`/reports/individual/${encodeURIComponent(form.code)}/stream`);
    } else {
      navigate(`/reports/individual/${encodeURIComponent(form.code)}/${encodeURIComponent(form.stream)}/year`);
    }
  };

  const handleStreamClick = (formCode, stream) => {
    navigate(`/reports/individual/${encodeURIComponent(formCode)}/${encodeURIComponent(stream)}/year`);
  };

  if (isStreamSelection && form) {
    const selectedForm = forms.find(f => f.code === form);
    if (!selectedForm || !selectedForm.hasStreams) {
      navigate('/reports/individual');
      return null;
    }

    return (
      <AdminLayout>
        <div className="individual-report-page">
          <div className="individual-report-shell">
            <div className="individual-report-breadcrumb">
              <Link to="/reports/individual">Individual Student Report</Link>
              <span className="bc-sep">&rsaquo;</span>
              <span className="bc-current">{form}</span>
            </div>

            <div className="individual-report-card" style={{ '--accent': formAccents[form] || '#10b981' }}>
              <div className="individual-report-card-header">
                <i className="fas fa-layer-group" /> Select Stream
              </div>
              <div className="individual-report-card-body">
                <p className="individual-report-instruction">Select a stream for {form}</p>
                <div className="individual-report-streams-grid">
                  {selectedForm.streams.map((stream) => (
                    <button
                      type="button"
                      key={stream}
                      onClick={() => handleStreamClick(selectedForm.code, stream)}
                      className="individual-report-stream-card"
                    >
                      <div className="individual-report-stream-code">{stream}</div>
                      <div className="individual-report-stream-name">{selectedForm.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="individual-report-page">
        <div className="individual-report-shell">
          <header className="individual-report-top">
            <div>
              <h1 className="individual-report-top-title">Individual Student Report</h1>
              <p className="individual-report-top-sub">Select a form to generate a student report</p>
            </div>
          </header>

          <div className="individual-report-forms-grid">
            {forms.map((form) => (
              form.hasStreams ? (
                <div key={form.code} className="individual-report-form-streams-card" style={{ '--accent': formAccents[form.code] || '#10b981' }}>
                  <div className="individual-report-form-streams-header" style={{ cursor: 'pointer' }} onClick={() => handleFormClick(form)}>
                    <h3>{form.name}</h3>
                    <p>Select Stream</p>
                  </div>
                  <div className="individual-report-streams-grid">
                    {form.streams.map((stream) => (
                      <button
                        type="button"
                        key={stream}
                        onClick={() => handleStreamClick(form.code, stream)}
                        className="individual-report-stream-card"
                      >
                        <div className="individual-report-stream-code">{stream}</div>
                        <div className="individual-report-stream-name">{form.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  key={form.code}
                  onClick={() => handleFormClick(form)}
                  className="individual-report-form-card"
                  style={{ '--accent': formAccents[form.code] || '#10b981' }}
                >
                  <span className="individual-report-form-icon">
                    <i className="fas fa-graduation-cap" />
                  </span>
                  <span className="individual-report-form-label">{form.name}</span>
                  <span className="individual-report-form-desc">Individual Report</span>
                </button>
              )
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default IndividualReport;
