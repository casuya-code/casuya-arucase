/**
 * Bulk Report - Step 3: Term Selection
 */
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './BulkReport.css';

const BulkReportTermSelection = () => {
  const { form, stream, year } = useParams();
  const navigate = useNavigate();

  const terms = [
    { code: 'Term I', name: 'Term I', subtitle: 'First Term', months: 'January - June' },
    { code: 'Term II', name: 'Term II', subtitle: 'Second Term', months: 'July - December' }
  ];

  const handleTermClick = (term) => {
    // Check if form has streams (V/VI)
    const formCode = form.replace('FORM ', '').trim();
    const hasStreams = ['V', 'VI', '5', '6'].includes(formCode);
    
    if (hasStreams && stream && stream !== 'NA') {
      // Navigate to stream selection (to choose specific stream or all streams)
      navigate(`/reports/bulk/${form}/${stream}/${year}/${term}/stream`);
    } else {
      // For Forms I-IV, go directly to generation
      navigate(`/reports/bulk/${form}/${stream}/${year}/${term}/generate`);
    }
  };

  return (
    <AdminLayout>
      <div className="bulk-report-page">
        <div className="breadcrumb">
          <Link to="/reports/bulk">Bulk Student Report</Link> &gt;{' '}
          <Link to={`/reports/bulk/${form}/${stream}/year`}>{form}</Link> &gt; {year}
        </div>

        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-calendar-check"></i> Bulk Report - {form} {year} - Select Term
          </div>
          <div className="excel-card-body">
            <p className="instruction-text">Select a term</p>
            <div className="term-grid">
              {terms.map((term) => (
                <button
                  key={term.code}
                  onClick={() => handleTermClick(term.code)}
                  className="term-card"
                >
                  <div className="term-icon">
                    <i className={term.code === 'Term I' ? 'fas fa-book-open' : 'fas fa-book'}></i>
                  </div>
                  <div className="term-title">{term.name}</div>
                  <div className="term-subtitle">{term.subtitle}</div>
                  <div className="term-period">{term.months}</div>
                </button>
              ))}
            </div>
            <div className="action-buttons mt-20">
              <Link
                to={`/reports/bulk/${form}/${stream}/year`}
                className="excel-btn"
              >
                <i className="fas fa-arrow-left"></i> Back to Year Selection
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BulkReportTermSelection;

