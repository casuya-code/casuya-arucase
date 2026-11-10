/**
 * Comments Stream Selection Page for FORM I-IV (after year) or FORM V-VI (initial)
 */
import { Link, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useFormVVIStreams } from '../../hooks/useFormVVIStreams';
import { formVVIModuleBase } from '../../components/formVVI/formVVIStreamPaths';
import { formLevelToPathSlug } from '../../utils/academicYearUtils';
import '../academic/SubjectsStreamSelection.css';

const CommentsStreamSelection = ({ formLevel, moduleName, isFormVOrVI = false }) => {
  const { year } = useParams();
  const [searchParams] = useSearchParams();
  const isCombined = searchParams.get('combined') === '1';

  const standardStreams = ['A', 'B'];
  const formVVIStreams = useFormVVIStreams(formLevel, { requireAllocation: isFormVOrVI });

  const formSlug = formLevelToPathSlug(formLevel);

  const getBackPath = () => {
    if (isFormVOrVI) {
      return `/admin/${moduleName}`;
    }
    return `/admin/${moduleName}/${formSlug}/years`;
  };

  const getStreamDetailPath = (stream) => {
    if (isFormVOrVI) {
      return `${formVVIModuleBase(moduleName, formLevel)}/stream/${stream}/years`;
    }
    if (moduleName === 'promotion') {
      return `/admin/${moduleName}/${formSlug}/year/${year}/stream/${stream}/preview`;
    }
    if (moduleName === 'debts') {
      return `/admin/${moduleName}/${formSlug}/year/${year}/stream/${stream}`;
    }
    return `/admin/${moduleName}/${formSlug}/year/${year}/stream/${stream}/terms`;
  };

  const streams = isFormVOrVI ? formVVIStreams : standardStreams;

  const combinedMessage =
    formLevel === 'FORM V'
      ? 'CLICK HERE TO SEE ALL FORM FIVE STREAMS COMBINED'
      : 'CLICK HERE TO SEE ALL FORM SIX STREAMS COMBINED';

  const getCombinedYearSelectionPath = () =>
    `${formVVIModuleBase(moduleName, formLevel)}/stream/all/years?combined=1`;

  return (
    <AdminLayout>
      <div className="subjects-stream-selection-page-container">
        <div className="subjects-stream-selection-card">
          <div className="subjects-stream-selection-card-header">
            <i className="fas fa-stream"></i>
            {formLevel} {year && !isFormVOrVI ? year : ''} - Select Stream
          </div>
          <div className="subjects-stream-selection-card-body">
            {isCombined && isFormVOrVI ? (
              <Link
                to={getCombinedYearSelectionPath()}
                className="subjects-stream-selection-combined-card"
              >
                <div className="subjects-stream-selection-combined-text">{combinedMessage}</div>
              </Link>
            ) : (
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
            )}
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

export default CommentsStreamSelection;

