/**
 * Comments / Registration Term Selection Page
 */
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import FormVVITermGrid from '../../components/formVVI/FormVVITermGrid';
import { normalizeFormLevel, requiresSpecialAcademicYearLogic } from '../../utils/academicYearUtils';
import '../academic/MarksConfigTermSelection.css';
import '../students/YearSelection.css';

const CommentsTermSelection = ({ formLevel, moduleName, basePath }) => {
  const { year, stream } = useParams();

  const normalizedLevel = formLevel
    ? formLevel.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : '';

  const isFormVOrVI = requiresSpecialAcademicYearLogic(normalizeFormLevel(normalizedLevel));

  const getBackPath = () => {
    if (basePath) {
      if (isFormVOrVI) {
        return `${basePath}/${formLevel}/stream/${stream}/years`;
      }
      return `${basePath}/${formLevel}/year/${year}/streams`;
    }

    if (isFormVOrVI) {
      return `/admin/${moduleName}/${formLevel}/stream/${stream}/years`;
    }
    return `/admin/${moduleName}/${formLevel}/year/${year}/streams`;
  };

  const getTermDetailPath = (term) => {
    const encodedTerm = encodeURIComponent(term);
    if (basePath) {
      if (formLevel.includes('form-v') || formLevel.includes('form-vi')) {
        return `${basePath}/${formLevel}/stream/${stream}/year/${year}/term/${encodedTerm}`;
      }
      return `${basePath}/${formLevel}/year/${year}/stream/${stream}/term/${encodedTerm}`;
    }

    if (formLevel.includes('form-v') || formLevel.includes('form-vi')) {
      return `/admin/${moduleName}/${formLevel}/stream/${stream}/year/${year}/term/${encodedTerm}`;
    }
    return `/admin/${moduleName}/${formLevel}/year/${year}/stream/${stream}/term/${encodedTerm}`;
  };

  const registrationActionsPath = (term) => {
    const encodedTerm = encodeURIComponent(term);
    return `${basePath}/${formLevel}/stream/${stream}/year/${year}/term/${encodedTerm}/actions`;
  };

  return (
    <AdminLayout>
      <div className="marks-config-term-selection-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-calendar-check"></i>
            Select Term
            <div className="header-actions">
              <Link to={getBackPath()} className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            {isFormVOrVI ? (
              <FormVVITermGrid
                displayYear={year}
                stream={stream}
                formLevel={normalizeFormLevel(normalizedLevel)}
                backPath={null}
                getTermLink={(term) =>
                  basePath === '/admin/students/registration'
                    ? registrationActionsPath(term)
                    : getTermDetailPath(term)
                }
                moduleActionLabel={
                  basePath === '/admin/students/registration' ? 'Registration' : 'Continue'
                }
              />
            ) : (
              <div className="term-selection-grid">
                {['First Term', 'Second Term'].map((term) => (
                  <Link
                    key={term}
                    to={getTermDetailPath(term)}
                    className="term-selection-card-item"
                  >
                    <div className="term-selection-name">{term}</div>
                    <div className="term-selection-subtitle">Enter comments</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CommentsTermSelection;
