/**
 * Score Entry Stream Selection Page for FORM V-VI
 * Non-admin users only see streams (classes) allocated to them.
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useFormVVIStreams } from '../../hooks/useFormVVIStreams';
import { formLevelToPathSlug } from '../../utils/academicYearUtils';
import './ScoreEntryStreamSelection.css';

const ScoreEntryFormVVIStreamSelection = ({ formLevel }) => {
  const formVVIStreams = useFormVVIStreams(formLevel);

  const getBackPath = () => {
    return '/admin/score-entry';
  };

  const getStreamDetailPath = (stream) =>
    `/admin/score-entry/${formLevelToPathSlug(formLevel)}/stream/${stream}/years`;

  return (
    <AdminLayout>
      <div className="score-entry-stream-selection-page-container">
        <div className="score-entry-stream-selection-card">
          <div className="score-entry-stream-selection-card-body">
            {formVVIStreams.length === 0 ? (
              <div className="score-entry-stream-selection-empty">
                <p>You do not have access to any streams for this form. Contact an administrator to get class allocations.</p>
              </div>
            ) : (
              <div className="stream-selection-grid">
                {formVVIStreams.map((stream) => (
                  <Link
                    key={stream.code}
                    to={getStreamDetailPath(stream.code)}
                    className="stream-selection-card-item"
                    aria-label={`${stream.name} Stream`}
                  >
                    <div className="stream-selection-name">{stream.name}</div>
                    <div className="stream-selection-subtitle">Stream Code: {stream.code}</div>
                  </Link>
                ))}
              </div>
            )}
            <Link to={getBackPath()} className="score-entry-stream-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back to Forms</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ScoreEntryFormVVIStreamSelection;


