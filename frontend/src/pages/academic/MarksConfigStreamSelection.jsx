/**
 * Marks Config Stream Selection Page for FORM I-IV (after year) or FORM V-VI (initial)
 */
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useFormVVIStreams } from '../../hooks/useFormVVIStreams';
import { formVVIModuleBase } from '../../components/formVVI/formVVIStreamPaths';
import { formLevelToPathSlug } from '../../utils/academicYearUtils';
import './SubjectsStreamSelection.css';

const MarksConfigStreamSelection = ({ formLevel, isFormVOrVI = false }) => {
  const { year } = useParams();

  const standardStreams = ['A', 'B'];
  const formVVIStreams = useFormVVIStreams(formLevel, { requireAllocation: isFormVOrVI });

  const formSlug = formLevelToPathSlug(formLevel);

  const getBackPath = () => {
    if (isFormVOrVI) {
      return '/admin/marks-config';
    }
    return `/admin/marks-config/${formSlug}/years`;
  };

  const getStreamDetailPath = (stream) => {
    if (isFormVOrVI) {
      return `${formVVIModuleBase('marks-config', formLevel)}/stream/${stream}/years`;
    }
    return `/admin/marks-config/${formSlug}/year/${year}/stream/${stream}/terms`;
  };

  const streams = isFormVOrVI ? formVVIStreams : standardStreams;

  return (
    <AdminLayout>
      <div className="subjects-stream-selection-page-container">
        <div className="subjects-stream-selection-card">
          <div className="subjects-stream-selection-card-header">
            <i className="fas fa-calendar-alt"></i>
            {formLevel} {year && !isFormVOrVI ? year : ''} - Select Stream
          </div>
          <div className="subjects-stream-selection-card-body">
            <div className="subjects-stream-selection-grid">
              {streams.map((stream) => {
                const streamCode = typeof stream === 'string' ? stream : stream.code;
                const streamName = typeof stream === 'string' ? `Stream ${stream}` : stream.name;
                return (
                  <Link
                    key={streamCode}
                    to={getStreamDetailPath(streamCode)}
                    className="subjects-stream-selection-card-item"
                  >
                    <div className="subjects-stream-selection-name">{streamName}</div>
                    {typeof stream === 'object' && (
                      <div className="subjects-stream-selection-code">Stream Code: {streamCode}</div>
                    )}
                  </Link>
                );
              })}
            </div>
            <Link to={getBackPath()} className="subjects-stream-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MarksConfigStreamSelection;

