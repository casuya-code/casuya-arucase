/**
 * Subjects Stream Selection Page for FORM V-VI
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import './SubjectsStreamSelection.css';

const SubjectsStreamSelection = ({ formLevel }) => {
  // Streams for FORM V-VI
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
    return '/admin/subjects';
  };

  const getStreamDetailPath = (stream) => {
    const formMap = {
      'FORM V': 'form-v',
      'FORM VI': 'form-vi',
    };
    return `/admin/subjects/${formMap[formLevel]}/stream/${stream}/years`;
  };

  return (
    <AdminLayout>
      <div className="subjects-stream-selection-page-container">
        <div className="subjects-stream-selection-card">
          <div className="subjects-stream-selection-card-header">
            <i className="fas fa-book"></i>
            <span>{formLevel} - Select Stream</span>
          </div>
          <div className="subjects-stream-selection-card-body">
            <div className="subjects-stream-selection-grid">
              {formVVIStreams.map((stream) => (
                <Link
                  key={stream.code}
                  to={getStreamDetailPath(stream.code)}
                  className="subjects-stream-selection-card-item"
                  aria-label={`${stream.name} Stream`}
                >
                  <div className="subjects-stream-selection-name">{stream.name}</div>
                  <div className="subjects-stream-selection-code">Stream Code: {stream.code}</div>
                </Link>
              ))}
            </div>
            <Link to={getBackPath()} className="subjects-stream-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back to Classes</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SubjectsStreamSelection;

