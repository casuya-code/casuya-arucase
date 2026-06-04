/**
 * Monthly Results Year Selection for FORM V-VI
 */
import { useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import FormVVIYearGrid from '../../components/formVVI/FormVVIYearGrid';
import { formLevelToPathSlug } from '../../utils/academicYearUtils';

const MonthlyResultsFormVVIYearSelection = ({ formLevel }) => {
  const { stream } = useParams();
  const formPath = formLevelToPathSlug(formLevel);

  return (
    <AdminLayout>
      <FormVVIYearGrid
        formLevel={formLevel}
        stream={stream}
        title={`${formLevel} ${stream} - Choose Academic Year`}
        backPath={`/admin/results/monthly/${formPath}/streams`}
        actionLabel="Monthly Results"
        getYearLink={(year) =>
          `/admin/results/monthly/${formPath}/stream/${stream}/year/${year}/months`
        }
      />
    </AdminLayout>
  );
};

export default MonthlyResultsFormVVIYearSelection;
