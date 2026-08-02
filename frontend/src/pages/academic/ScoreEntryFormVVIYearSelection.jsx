/**
 * Score Entry Year Selection Page for FORM V-VI (after stream)
 */
import { useParams, Navigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import FormVVIYearGrid from '../../components/formVVI/FormVVIYearGrid';
import { useAuth } from '../../context/AuthContext';
import {
  formLevelToPathSlug,
  normalizeFormVVITerm,
} from '../../utils/academicYearUtils';

const ScoreEntryFormVVIYearSelection = ({ formLevel }) => {
  const { stream } = useParams();
  const { hasClass, isAdminLike } = useAuth();

  const className = stream ? `${formLevel} ${stream}` : formLevel;
  if (!isAdminLike() && !hasClass(className)) {
    return <Navigate to="/admin/score-entry" replace />;
  }

  const formPath = formLevelToPathSlug(formLevel);

  return (
    <AdminLayout>
      <div className="score-entry-year-selection-page-container">
        <FormVVIYearGrid
          formLevel={formLevel}
          stream={stream}
          title={`${formLevel} ${stream} - Choose Academic Year`}
          backPath={`/admin/score-entry/${formPath}/streams`}
          actionLabel="Enter Scores"
          getYearLink={(year, term) => {
            const termSlug = normalizeFormVVITerm(term);
            return `/admin/score-entry/${formPath}/stream/${stream}/year/${year}/term/${encodeURIComponent(termSlug)}/subjects`;
          }}
        />
      </div>
    </AdminLayout>
  );
};

export default ScoreEntryFormVVIYearSelection;
