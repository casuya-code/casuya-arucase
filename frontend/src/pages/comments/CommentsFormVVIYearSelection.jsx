/**
 * Comments Year Selection Page for FORM V-VI (after stream)
 */
import { useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import FormVVIYearGrid from '../../components/formVVI/FormVVIYearGrid';
import { formLevelToPathSlug } from '../../utils/academicYearUtils';

const CommentsFormVVIYearSelection = ({ formLevel, moduleName }) => {
  const { stream } = useParams();
  const [searchParams] = useSearchParams();
  const formPath = formLevelToPathSlug(formLevel);
  const isCombined = searchParams.get('combined') === '1' || String(stream || '').toUpperCase() === 'ALL';
  const streamLabel = isCombined ? 'ALL STREAMS (Combined)' : stream;

  const getYearLink = (year) => {
    if (moduleName === 'promotion') {
      return `/admin/${moduleName}/${formPath}/stream/${stream}/year/${year}${isCombined ? '?combined=1' : ''}`;
    }
    return `/admin/${moduleName}/${formPath}/stream/${stream}/year/${year}/terms${isCombined ? '?combined=1' : ''}`;
  };

  const backPath = isCombined
    ? `/admin/${moduleName}/${formPath}/streams?combined=1`
    : `/admin/${moduleName}/${formPath}/streams`;

  return (
    <AdminLayout>
      <FormVVIYearGrid
        formLevel={formLevel}
        stream={stream}
        title={`${formLevel} ${streamLabel} - Choose Academic Year`}
        backPath={backPath}
        getYearLink={getYearLink}
        actionLabel="Select Term"
      />
    </AdminLayout>
  );
};

export default CommentsFormVVIYearSelection;
