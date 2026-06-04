/**
 * Teachers Stream Selection Page for FORM V-VI
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useFormVVIStreams } from '../../hooks/useFormVVIStreams';
import { formVVIModuleBase } from '../../components/formVVI/formVVIStreamPaths';
import './SubjectsStreamSelection.css';

const TeachersStreamSelection = ({ formLevel }) => {
  const formVVIStreams = useFormVVIStreams(formLevel);

  return (
    <AdminLayout>
      <div className="subjects-stream-selection-page-container">
        <div className="subjects-stream-selection-card">
          <div className="subjects-stream-selection-card-header">
            <i className={`fas fa-${formLevel === 'FORM V' ? '5' : '6'}`}></i>
            {formLevel} - Select Stream
          </div>
          <div className="subjects-stream-selection-card-body">
            <div className="subjects-stream-selection-grid">
              {formVVIStreams.map((stream) => (
                <Link
                  key={stream.code}
                  to={`${formVVIModuleBase('teachers', formLevel)}/stream/${stream.code}/years`}
                  className="subjects-stream-selection-card-item"
                  aria-label={`${stream.name} Stream`}
                >
                  <div className="subjects-stream-selection-name">{stream.name}</div>
                  <div className="subjects-stream-selection-code">Stream Code: {stream.code}</div>
                </Link>
              ))}
            </div>
            <Link to="/admin/teachers" className="subjects-stream-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default TeachersStreamSelection;
