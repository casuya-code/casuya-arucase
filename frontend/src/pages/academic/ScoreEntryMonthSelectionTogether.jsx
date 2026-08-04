/**
 * Score Entry Month Selection - Form V/VI Together Mode
 * Shows all months for the selected form, year, and subject
 */
import { Link, useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { normalizeFormVVITerm, getFormVVIMonthsForTerm } from '../../utils/academicYearUtils';
import './ScoreEntryMonthSelection.css';

const ScoreEntryMonthSelectionTogether = () => {
  const { formLevel, year, subjectCode: subjectCodeParam, term } = useParams();
  const navigate = useNavigate();
  const { getAllowedScoreEntryMonths } = useAuth();

  // Normalize form level
  const _normalizedForm = formLevel
    ? formLevel.split('-').map(w => w.toUpperCase()).join(' ')
    : '';

  // Decode subject code
  const subjectCode = subjectCodeParam ? decodeURIComponent(subjectCodeParam) : '';

  // Resolve term: scope this form V/VI term's OWN months (old code showed all terms).
  const decodedTerm = term ? decodeURIComponent(term) : '';
  const currentTerm = normalizeFormVVITerm(decodedTerm);

  // Get allowed months (non-admin may be restricted)
  const allowedMonths = getAllowedScoreEntryMonths();
  const termMonths = getFormVVIMonthsForTerm(currentTerm);
  const allMonths = allowedMonths === null
    ? termMonths
    : termMonths.filter((m) => allowedMonths.includes(m));

  const getBackPath = () => {
    const _encodedSubjectCode = encodeURIComponent(subjectCode);
    return `/admin/score-entry/${formLevel}/together/year/${year}/term/${encodeURIComponent(currentTerm)}/subjects`;
  };

  const getMonthDetailPath = (month) => {
    const encodedSubjectCode = encodeURIComponent(subjectCode);
    const encodedMonth = encodeURIComponent(month);
    return `/admin/score-entry/${formLevel}/together/year/${year}/term/${encodeURIComponent(currentTerm)}/subject/${encodedSubjectCode}/month/${encodedMonth}/enter`;
  };

  return (
    <AdminLayout>
      <div className="score-entry-month-selection-page-container">
        <div className="score-entry-month-selection-card">
          <div className="score-entry-month-selection-card-body">
            {allMonths.length === 0 ? (
              <div className="score-entry-month-selection-empty">
                <p>You are not allowed to enter scores for any month. Contact an administrator to assign score entry months in User Management.</p>
              </div>
            ) : (
              <div className="stats-grid">
                {allMonths.map((month) => {
                  const monthPath = getMonthDetailPath(month);
                  return (
                    <div
                      key={month}
                      className="stat-card"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(monthPath, { replace: false });
                      }}
                    >
                      <div className="stat-icon">
                        <i className="fas fa-calendar"></i>
                      </div>
                      <div className="stat-content">
                        <h3>{month}</h3>
                        <p>Enter {month} scores</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Link to={getBackPath()} className="score-entry-month-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back to Subjects</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ScoreEntryMonthSelectionTogether;
