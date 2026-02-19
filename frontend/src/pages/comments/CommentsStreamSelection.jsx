/**
 * Comments Stream Selection Page for FORM I-IV (after year) or FORM V-VI (initial)
 */
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import '../academic/SubjectsStreamSelection.css';

const CommentsStreamSelection = ({ formLevel, moduleName, isFormVOrVI = false }) => {
  const { year } = useParams();
  
  const standardStreams = ['A', 'B'];
  
  const formVVIStreams = [
    { code: 'PCB', name: 'Physics, Chemistry, Biology' },
    { code: 'PCM', name: 'Physics, Chemistry, Mathematics' },
    { code: 'CBG', name: 'Chemistry, Biology, Geography' },
    { code: 'HGL', name: 'History, Geography, Literature' },
    { code: 'HKL', name: 'History, Kiswahili, Literature' },
    { code: 'EGM', name: 'Economics, Geography, Mathematics' },
    { code: 'HGE', name: 'History, Geography, Economics' },
    { code: 'PGM', name: 'Physics, Geography, Advanced Mathematics' },
  ];

  const getBackPath = () => {
    if (isFormVOrVI) {
      return `/admin/${moduleName}`;
    }
    const formMap = {
      'FORM I': 'form-i',
      'FORM II': 'form-ii',
      'FORM III': 'form-iii',
      'FORM IV': 'form-iv',
    };
    return `/admin/${moduleName}/${formMap[formLevel]}/years`;
  };

  const getStreamDetailPath = (stream) => {
    if (isFormVOrVI) {
      const formMap = {
        'FORM V': 'form-v',
        'FORM VI': 'form-vi',
      };
      if (moduleName === 'promotion') {
        return `/admin/${moduleName}/${formMap[formLevel]}/stream/${stream}/years`;
      }
      return `/admin/${moduleName}/${formMap[formLevel]}/stream/${stream}/years`;
    } else {
      const formMap = {
        'FORM I': 'form-i',
        'FORM II': 'form-ii',
        'FORM III': 'form-iii',
        'FORM IV': 'form-iv',
      };
      if (moduleName === 'promotion') {
        return `/admin/${moduleName}/${formMap[formLevel]}/year/${year}/stream/${stream}/preview`;
      }
      // For debts, go directly to management page (no term selection needed)
      if (moduleName === 'debts') {
        return `/admin/${moduleName}/${formMap[formLevel]}/year/${year}/stream/${stream}`;
      }
      // For fees and comments modules, go to term selection first
      return `/admin/${moduleName}/${formMap[formLevel]}/year/${year}/stream/${stream}/terms`;
    }
  };

  const streams = isFormVOrVI ? formVVIStreams : standardStreams;

  return (
    <AdminLayout>
      <div className="subjects-stream-selection-page-container">
        <div className="subjects-stream-selection-card">
          <div className="subjects-stream-selection-card-header">
            <i className="fas fa-stream"></i>
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

export default CommentsStreamSelection;

