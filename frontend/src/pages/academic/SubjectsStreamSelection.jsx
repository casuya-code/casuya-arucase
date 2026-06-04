/**
 * Subjects Stream Selection Page for FORM V-VI
 */
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useFormVVIStreams } from '../../hooks/useFormVVIStreams';
import { formVVIModuleBase } from '../../components/formVVI/formVVIStreamPaths';
import './SubjectsStreamSelection.css';

const SubjectsStreamSelection = ({ formLevel }) => {
  const formVVIStreams = useFormVVIStreams(formLevel);

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
                  to={`${formVVIModuleBase('subjects', formLevel)}/stream/${stream.code}/years`}
                  className="subjects-stream-selection-card-item"
                  aria-label={`${stream.name} Stream`}
                >
                  <div className="subjects-stream-selection-name">{stream.name}</div>
                  <div className="subjects-stream-selection-code">Stream Code: {stream.code}</div>
                </Link>
              ))}
            </div>
            <Link to="/admin/subjects" className="subjects-stream-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SubjectsStreamSelection;
