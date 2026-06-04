/**
 * Teachers Year Selection Page for FORM V-VI (after stream)
 */
import { useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import FormVVIYearGrid from '../../components/formVVI/FormVVIYearGrid';
import { formLevelToPathSlug } from '../../utils/academicYearUtils';

const TeachersFormVVIYearSelection = ({ formLevel }) => {
  const { stream } = useParams();
  const formPath = formLevelToPathSlug(formLevel);

  return (
    <AdminLayout>
      <FormVVIYearGrid
        formLevel={formLevel}
        stream={stream}
        title={`${formLevel} ${stream} - Choose Academic Year`}
        backPath={`/admin/teachers/${formPath}/streams`}
        actionLabel="Assign Teachers"
        getYearLink={(year) =>
          `/admin/teachers/${formPath}/stream/${stream}/year/${year}/terms`
        }
      />
    </AdminLayout>
  );
};

export default TeachersFormVVIYearSelection;
