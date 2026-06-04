import { formLevelToPathSlug } from '../../utils/academicYearUtils';

/** Build admin path prefix for a Form V/VI module. */
export function formVVIModuleBase(moduleName, formLevel) {
  const slug = formLevelToPathSlug(formLevel);
  return `/admin/${moduleName}/${slug}`;
}
