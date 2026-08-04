/**
 * Individual Student Report - Step 3: Term Selection
 */
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './IndividualReport.css';

const IndividualReportTermSelection = () => {
  const { form, stream, year } = useParams();
  const navigate = useNavigate();

  const formCode = form.replace('FORM ', '').trim();
  const isFormVOrVI = ['V', 'VI', '5', '6'].includes(formCode);

  const terms = isFormVOrVI
    ? [
        { code: 'Term I', name: 'Term I', subtitle: 'First Term', months: 'July - December', icon: 'fa-book-open' },
        { code: 'Term II', name: 'Term II', subtitle: 'Second Term', months: 'January - June', icon: 'fa-book' }
      ]
    : [
        { code: 'Term I', name: 'Term I', subtitle: 'First Term', months: 'February - May', icon: 'fa-book-open' },
        { code: 'Term II', name: 'Term II', subtitle: 'Second Term', months: 'August - November', icon: 'fa-book' }
      ];

  const handleTermClick = (term) => {
    navigate(`/reports/individual/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/${encodeURIComponent(year)}/${encodeURIComponent(term)}/students`);
  };

  return (
    <AdminLayout>
      <div className="individual-report-page">
        <div className="individual-report-shell">
          <div className="individual-report-breadcrumb">
            <Link to="/reports/individual">Individual Student Report</Link>
            <span className="bc-sep">&rsaquo;</span>
            <Link to="/reports/individual">{form}</Link>
            <span className="bc-sep">&rsaquo;</span>
            <Link to={`/reports/individual/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/year`}>{year}</Link>
            <span className="bc-sep">&rsaquo;</span>
            <span className="bc-current">Term</span>
          </div>

          <div className="individual-report-card" style={{ '--accent': '#8b5cf6' }}>
            <div className="individual-report-card-header">
              <i className="fas fa-calendar-check" /> Select Term
            </div>
            <div className="individual-report-card-body">
              <div className="individual-report-term-grid">
                {terms.map((term) => (
                  <button
                    type="button"
                    key={term.code}
                    onClick={() => handleTermClick(term.code)}
                    className="individual-report-term-card"
                    style={{ '--accent': term.code === 'Term I' ? '#3b82f6' : '#f59e0b' }}
                  >
                    <div className="individual-report-term-icon">
                      <i className={`fas ${term.icon}`} />
                    </div>
                    <div className="individual-report-term-label">{term.name}</div>
                    <div className="individual-report-term-subtitle">{term.subtitle}</div>
                    <div className="individual-report-term-months">{term.months}</div>
                  </button>
                ))}
              </div>
              <div className="individual-report-actions">
                <Link
                  to={`/reports/individual/${encodeURIComponent(form)}/${encodeURIComponent(stream)}/year`}
                  className="individual-report-btn individual-report-btn--secondary"
                >
                  <i className="fas fa-arrow-left" /> Back to Years
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default IndividualReportTermSelection;
