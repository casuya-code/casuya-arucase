/**
 * Bulk Student Report - Multi-step Wizard
 * Step 1: Form Selection (with Stream for Form V/VI)
 */
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './BulkReport.css';

const formAccents = {
  'FORM I': '#3b82f6',
  'FORM II': '#10b981',
  'FORM III': '#8b5cf6',
  'FORM IV': '#f59e0b',
  'FORM V': '#ef4444',
  'FORM VI': '#06b6d4',
};

const BulkReport = () => {
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
      navigate(`/reports/bulk/${encodeURIComponent(form.code)}/stream`);
    } else {
      navigate(`/reports/bulk/${encodeURIComponent(form.code)}/${encodeURIComponent(form.stream)}/year`);
    }
  };

  const handleStreamClick = (formCode, stream) => {
    navigate(`/reports/bulk/${encodeURIComponent(formCode)}/${encodeURIComponent(stream)}/year`);
  };

  // If we're on the stream selection route, show only streams for the selected form
  if (isStreamSelection && form) {
    const selectedForm = forms.find(f => f.code === form);
    if (!selectedForm || !selectedForm.hasStreams) {
      navigate('/reports/bulk');
      return null;
    }

    return (
      <AdminLayout>
        <div className="bulk-report-page">
          <div className="bulk-report-shell">
            <div className="breadcrumb">
              <Link to="/reports/bulk">Bulk Student Report</Link>
              <span style={{ color: '#bbb' }}>&rsaquo;</span>
              <span className="breadcrumb-current">{form}</span>
            </div>

            <div className="excel-card" style={{ '--accent': formAccents[form] || '#10b981' }}>
              <div className="excel-card-header">
                <i className="fas fa-layer-group" /> Select Stream
              </div>
              <div className="excel-card-body">
                <p className="instruction-text">Select a stream for {form}</p>
                <div className="streams-grid">
                  {selectedForm.streams.map((stream) => (
                    <button
                      type="button"
                      key={stream}
                      onClick={() => handleStreamClick(selectedForm.code, stream)}
                      className="stream-card"
                    >
                      <i className="fas fa-check-circle bulk-report-hover-tick"></i>
                      <div className="stream-icon">
                        <i className="fas fa-layer-group"></i>
                      </div>
                      <div className="stream-info">
                        <h4>{stream}</h4>
                        <p>{selectedForm.name} - {stream}</p>
                      </div>
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

  // Default: Show all forms
  return (
    <AdminLayout>
      <div className="bulk-report-page">
        <div className="bulk-report-shell">
          <header className="page-header">
            <h1>Bulk Student Report</h1>
            <p>Generate reports for all students in a class</p>
          </header>

          <div className="forms-grid">
            {forms.map((form) => (
              form.hasStreams ? (
                <div key={form.code} className="form-card-with-streams" style={{ '--accent': formAccents[form.code] || '#10b981' }}>
                  <div 
                    className="form-card-header"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleFormClick(form)}
                    title="Click to view stream selection page"
                  >
                    <h3>{form.name}</h3>
                    <p>Select Stream:</p>
                  </div>
                  <div className="streams-grid">
                    {form.streams.map((stream) => (
                      <button
                        type="button"
                        key={stream}
                        onClick={() => handleStreamClick(form.code, stream)}
                        className="stream-card"
                      >
                        <i className="fas fa-check-circle bulk-report-hover-tick"></i>
                        <div className="stream-icon">
                          <i className="fas fa-layer-group"></i>
                        </div>
                        <div className="stream-info">
                          <h4>{stream}</h4>
                          <p>{form.name} - {stream}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  key={form.code}
                  onClick={() => handleFormClick(form)}
                  className="form-card"
                  style={{ '--accent': formAccents[form.code] || '#10b981' }}
                >
                  <i className="fas fa-check-circle bulk-report-hover-tick"></i>
                  <div className="form-icon">
                    <i className="fas fa-graduation-cap"></i>
                  </div>
                  <div className="form-info">
                    <h3>{form.name}</h3>
                    <p>Click to select year and term</p>
                  </div>
                  <div className="form-arrow">
                    <i className="fas fa-chevron-right"></i>
                  </div>
                </button>
              )
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BulkReport;
