/**
 * Individual Student Report - Step 3: Term Selection
 */
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './IndividualReport.css';

const IndividualReportTermSelection = () => {
  const { form, stream, year } = useParams();
  const navigate = useNavigate();

  const terms = [
    { code: 'Term I', name: 'Term I', subtitle: 'First Term', months: 'January - June' },
    { code: 'Term II', name: 'Term II', subtitle: 'Second Term', months: 'July - December' }
  ];

  const handleTermClick = (term) => {
    // React Router handles URL encoding automatically
    navigate(`/reports/individual/${form}/${stream}/${year}/${term}/students`);
  };

  return (
    <AdminLayout>
      <div className="individual-report-page">
        <div className="breadcrumb">
          <Link to="/reports/individual">Individual Student Report</Link> &gt;{' '}
          <Link to={`/reports/individual/${form}/${stream}/year`}>{form}</Link> &gt; {year}
        </div>

        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-calendar-check"></i> Select Term
          </div>
          <div className="excel-card-body">
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
                to={`/reports/individual/${form}/${stream}/year`}
                className="excel-btn"
              >
                <nobr><i className="fas fa-arrow-left"></i> Back to Years</nobr>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default IndividualReportTermSelection;


