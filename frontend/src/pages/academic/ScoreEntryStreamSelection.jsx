/**
 * Score Entry Stream Selection Page for FORM I-IV (after year)
 * Non-admin without access to this class is redirected to score entry.
 */
import { Link, useParams, Navigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { formLevelToPathSlug } from '../../utils/academicYearUtils';
import './ScoreEntryStreamSelection.css';

const ScoreEntryStreamSelection = ({ formLevel }) => {
  const { year } = useParams();
  const { hasClass, isAdminLike } = useAuth();

  if (!isAdminLike() && !hasClass(formLevel)) {
    return <Navigate to="/admin/score-entry" replace />;
  }

  // Standard streams for FORM I-IV
  const standardStreams = ['A', 'B'];

  const formSlug = formLevelToPathSlug(formLevel);

  const getBackPath = () => `/admin/score-entry/${formSlug}/years`;

  const getStreamDetailPath = (stream) =>
    `/admin/score-entry/${formSlug}/year/${year}/stream/${stream}/subjects`;

  return (
    <AdminLayout>
      <div className="score-entry-stream-selection-page-container">
        <div className="score-entry-stream-selection-card">
          <div className="score-entry-stream-selection-card-body">
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
            <Link to={getBackPath()} className="score-entry-stream-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back to Years</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ScoreEntryStreamSelection;


