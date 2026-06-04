/**
 * Stream Selection Page for FORM I-IV (after year selection)
 * or FORM V-VI (initial selection).
 * Non-admin users only see FORM V-VI streams (classes) allocated to them.
 */
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { formLevelToPathSlug } from '../../utils/academicYearUtils';
import { useFormVVIStreams } from '../../hooks/useFormVVIStreams';
import './StreamSelection.css';

const standardStreams = ['A', 'B'];

const StreamSelection = ({ formLevel, isFormVOrVI = false }) => {
  const { year } = useParams();
  const formVVIStreams = useFormVVIStreams(formLevel, { requireAllocation: isFormVOrVI });

  const formSlug = formLevelToPathSlug(formLevel);

  const getBackPath = () => {
    if (isFormVOrVI) {
      return '/admin/students/registration';
    }
    return `/admin/students/registration/${formSlug}/years`;
  };

  const getStreamDetailPath = (stream) => {
    if (isFormVOrVI) {
      return `/admin/students/registration/${formSlug}/stream/${stream}/years`;
    }
    return `/admin/students/registration/${formSlug}/year/${year}/stream/${stream}/actions`;
  };

  return (
    <AdminLayout>
      <div className="stream-selection-page-container">
        <div className="stream-selection-card">
          <div className="stream-selection-card-header">
            <i className="fas fa-layer-group"></i>
            <span>
              {formLevel} {year && `- ${year}`} - Select Stream
            </span>
          </div>
          <div className="stream-selection-card-body">
            {isFormVOrVI && formVVIStreams.length === 0 ? (
              <p className="stream-selection-empty">You do not have access to any streams for this form. Contact an administrator.</p>
            ) : (
            <>
              <div className="stream-selection-grid">
                {isFormVOrVI ? (
                  formVVIStreams.map((stream) => (
                    <Link
                      key={stream.code}
                      to={getStreamDetailPath(stream.code)}
                      className="stream-selection-card-item"
                      aria-label={`${stream.name} Stream`}
                    >
                      <div className="stream-selection-name">{stream.name}</div>
                      <div className="stream-selection-code">Stream Code: {stream.code}</div>
                    </Link>
                  ))
                ) : (
                  // FORM I-IV standard streams
                  standardStreams.map((stream) => (
                    <Link
                      key={stream}
                      to={getStreamDetailPath(stream)}
                      className="stream-selection-card-item"
                      aria-label={`Stream ${stream}`}
                    >
                      <div className="stream-selection-name">Stream {stream}</div>
                    </Link>
                  ))
                )}
              </div>
              <Link to={getBackPath()} className="stream-selection-back-btn">
                <i className="fas fa-arrow-left"></i>
                <span>Back</span>
              </Link>
            </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StreamSelection;

