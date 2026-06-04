/**
 * Score Entry Year Selection Page for FORM V-VI (after stream)
 */
import { Link, useParams, Navigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import FormVVIYearGrid from '../../components/formVVI/FormVVIYearGrid';
import { useAuth } from '../../context/AuthContext';
import { formLevelToPathSlug } from '../../utils/academicYearUtils';

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
          getYearLink={(year) =>
            `/admin/score-entry/${formPath}/stream/${stream}/year/${year}/subjects`
          }
        />
      </div>
    </AdminLayout>
  );
};

export default ScoreEntryFormVVIYearSelection;
