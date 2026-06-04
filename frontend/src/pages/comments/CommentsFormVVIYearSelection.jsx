/**
 * Comments Year Selection Page for FORM V-VI (after stream)
 */
import { useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import FormVVIYearGrid from '../../components/formVVI/FormVVIYearGrid';
import { formLevelToPathSlug } from '../../utils/academicYearUtils';

const CommentsFormVVIYearSelection = ({ formLevel, moduleName }) => {
  const { stream } = useParams();
  const formPath = formLevelToPathSlug(formLevel);

  const getYearLink = (year) => {
    if (moduleName === 'promotion') {
      return `/admin/${moduleName}/${formPath}/stream/${stream}/year/${year}`;
    }
    return `/admin/${moduleName}/${formPath}/stream/${stream}/year/${year}/terms`;
  };

  return (
    <AdminLayout>
      <FormVVIYearGrid
        formLevel={formLevel}
        stream={stream}
        title={`${formLevel} ${stream} - Choose Academic Year`}
        backPath={`/admin/${moduleName}/${formPath}/streams`}
        getYearLink={getYearLink}
        actionLabel="Select Term"
      />
    </AdminLayout>
  );
};

export default CommentsFormVVIYearSelection;
