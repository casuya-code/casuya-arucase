/**
 * Parish Year Selection Page for FORM V-VI (after stream selection)
 */
import { useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import FormVVIYearGrid from '../../components/formVVI/FormVVIYearGrid';
import { formLevelToPathSlug } from '../../utils/academicYearUtils';

const ParishFormVVIYearSelection = ({ formLevel }) => {
  const { stream } = useParams();
  const formPath = formLevelToPathSlug(formLevel);

  return (
    <AdminLayout>
      <FormVVIYearGrid
        formLevel={formLevel}
        stream={stream}
        moduleId="student_parishes"
        title={`${formLevel} ${stream} - Choose Academic Year`}
        backPath={`/admin/students/parishes/${formPath}/streams`}
        actionLabel="Parishes"
        getYearLink={(year) =>
          `/admin/students/parishes/${formPath}/stream/${stream}/year/${year}`
        }
      />
    </AdminLayout>
  );
};

export default ParishFormVVIYearSelection;
