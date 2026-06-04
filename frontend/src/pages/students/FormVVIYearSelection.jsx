/**
 * Year Selection Page for FORM V-VI (after stream selection)
 */
import { useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import FormVVIYearGrid from '../../components/formVVI/FormVVIYearGrid';
import { formLevelToPathSlug } from '../../utils/academicYearUtils';

const FormVVIYearSelection = ({ formLevel }) => {
  const { stream } = useParams();

  const formPath = formLevelToPathSlug(formLevel);

  return (
    <AdminLayout>
      <FormVVIYearGrid
        formLevel={formLevel}
        stream={stream}
        title={`${formLevel} ${stream} - Choose Academic Year`}
        backPath={`/admin/students/registration/${formPath}/streams`}
        getYearLink={(year) =>
          `/admin/students/registration/${formPath}/stream/${stream}/year/${year}/terms`
        }
      />
    </AdminLayout>
  );
};

export default FormVVIYearSelection;
