/**
 * Score Entry Stream Selection Page for FORM I-IV (after year)
 * Non-admin without access to this class is redirected to score entry.
 */
import { Link, useParams, Navigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import './ScoreEntryStreamSelection.css';

const ScoreEntryStreamSelection = ({ formLevel }) => {
  const { year } = useParams();
  const { hasClass, isAdminLike } = useAuth();

  if (!isAdminLike() && !hasClass(formLevel)) {
    return <Navigate to="/admin/score-entry" replace />;
  }

  // Standard streams for FORM I-IV
  const standardStreams = ['A', 'B'];

  const getBackPath = () => {
    const formMap = {
      'FORM I': 'form-i',
      'FORM II': 'form-ii',
      'FORM III': 'form-iii',
      'FORM IV': 'form-iv',
    };
    return `/admin/score-entry/${formMap[formLevel]}/years`;
  };

  const getStreamDetailPath = (stream) => {
    const formMap = {
      'FORM I': 'form-i',
      'FORM II': 'form-ii',
      'FORM III': 'form-iii',
      'FORM IV': 'form-iv',
    };
    return `/admin/score-entry/${formMap[formLevel]}/year/${year}/stream/${stream}/subjects`;
  };

  return (
    <AdminLayout>
      <div className="score-entry-stream-selection-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className={`fas fa-${formLevel === 'FORM I' ? '1' : formLevel === 'FORM II' ? '2' : formLevel === 'FORM III' ? '3' : '4'}`}></i>
            {formLevel} {year} - Select Stream
            <div className="header-actions">
              <Link to={getBackPath()} className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back to Years
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            <div className="stream-selection-grid">
              {standardStreams.map((stream) => (
                <Link
                  key={stream}
                  to={getStreamDetailPath(stream)}
                  className="stream-selection-card-item"
                  aria-label={`Stream ${stream}`}
                >
                  <div className="stream-selection-name">Stream {stream}</div>
                  <div className="stream-selection-subtitle">{formLevel} {year} {stream}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ScoreEntryStreamSelection;


