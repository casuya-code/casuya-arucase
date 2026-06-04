/**
 * Marks Config Term Selection Page
 */
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import FormVVITermGrid from '../../components/formVVI/FormVVITermGrid';
import { normalizeFormLevel, requiresSpecialAcademicYearLogic } from '../../utils/academicYearUtils';
import './MarksConfigTermSelection.css';
import '../students/YearSelection.css';

const MarksConfigTermSelection = ({ formLevel }) => {
  const { year, stream } = useParams();

  const normalizedLevel = normalizeFormLevel(
    formLevel
      ? formLevel.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : ''
  );
  const isFormVOrVI = requiresSpecialAcademicYearLogic(normalizedLevel);

  const getBackPath = () => {
    if (isFormVOrVI) {
      return `/admin/marks-config/${formLevel}/stream/${stream}/years`;
    }
    return `/admin/marks-config/${formLevel}/year/${year}/streams`;
  };

  const marksTermSlug = (term) => (term === 'First Term' ? 'Term I' : 'Term II');

  const getTermDetailPath = (term) => {
    if (isFormVOrVI) {
      return `/admin/marks-config/${formLevel}/stream/${stream}/year/${year}/term/${marksTermSlug(term)}`;
    }
    return `/admin/marks-config/${formLevel}/year/${year}/stream/${stream}/term/${term}`;
  };

  return (
    <AdminLayout>
      <div className="marks-config-term-selection-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-calendar-alt"></i>
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
                formLevel={normalizedLevel}
                backPath={null}
                getTermLink={getTermDetailPath}
                moduleActionLabel="Configure marks"
              />
            ) : (
              <div className="term-selection-grid">
                {['Term I', 'Term II'].map((term) => (
                  <Link
                    key={term}
                    to={getTermDetailPath(term)}
                    className="term-selection-card-item"
                  >
                    <div className="term-selection-name">{term}</div>
                    <div className="term-selection-subtitle">Configure month weights</div>
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

export default MarksConfigTermSelection;

