/**
 * Marks Config Year Selection Page for FORM V-VI (after stream)
 */
import { useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import FormVVIYearGrid from '../../components/formVVI/FormVVIYearGrid';
import { formLevelToPathSlug } from '../../utils/academicYearUtils';

const MarksConfigFormVVIYearSelection = ({ formLevel }) => {
  const { stream } = useParams();
  const formPath = formLevelToPathSlug(formLevel);

  return (
    <AdminLayout>
      <FormVVIYearGrid
        formLevel={formLevel}
        stream={stream}
        title={`${formLevel} ${stream} - Choose Academic Year`}
        backPath={`/admin/marks-config/${formPath}/streams`}
        actionLabel="Configure Marks"
        getYearLink={(year) =>
          `/admin/marks-config/${formPath}/stream/${stream}/year/${year}/terms`
        }
      />
    </AdminLayout>
  );
};

export default MarksConfigFormVVIYearSelection;
