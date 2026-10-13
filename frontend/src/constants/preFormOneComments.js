/**
 * Pre-Form One comment module catalog.
 *
 * Each entry is a Pre-Form One ("PRE-*") counterpart of a Forms I–VI comment
 * module. They share the same generic management pages but differ by
 * comment_type, label/icon and the admin module id used for route gating.
 *
 * Keep moduleId values in sync with constants/adminModules.js, the sidebar and
 * the App.jsx routes.
 */
export const PRE_FORM_ONE_COMMENT_TYPES = [
  {
    key: 'sala',
    path: 'pre-sala',
    basePath: '/admin/pre-sala',
    moduleId: 'pre_sala_comments',
    label: 'PRE-Sala',
    moduleLabel: 'Sala Comments',
    commentType: 'sala',
    icon: 'fa-comments',
    supportsAutoFill: false,
  },
  {
    key: 'taaluma',
    path: 'pre-taaluma',
    basePath: '/admin/pre-taaluma',
    moduleId: 'pre_taaluma_comments',
    label: 'PRE-Taaluma',
    moduleLabel: 'Taaluma Comments',
    commentType: 'taaluma',
    icon: 'fa-book-open',
    supportsAutoFill: true,
  },
  {
    key: 'tabia',
    path: 'pre-tabia',
    basePath: '/admin/pre-tabia',
    moduleId: 'pre_tabia_comments',
    label: 'PRE-Tabia',
    moduleLabel: 'Tabia Comments',
    commentType: 'tabia',
    icon: 'fa-user-check',
    supportsAutoFill: false,
  },
  {
    key: 'huduma',
    path: 'pre-huduma',
    basePath: '/admin/pre-huduma',
    moduleId: 'pre_huduma_comments',
    label: 'PRE-Huduma',
    moduleLabel: 'Huduma Comments',
    commentType: 'huduma',
    icon: 'fa-hands-helping',
    supportsAutoFill: false,
  },
  {
    key: 'michezo',
    path: 'pre-michezo',
    basePath: '/admin/pre-michezo',
    moduleId: 'pre_michezo_comments',
    label: 'PRE-Michezo',
    moduleLabel: 'Michezo Comments',
    commentType: 'michezo',
    icon: 'fa-running',
    supportsAutoFill: false,
  },
  {
    key: 'mwalimu_taaluma',
    path: 'pre-mwalimu-comments',
    basePath: '/admin/pre-mwalimu-comments',
    moduleId: 'pre_mwalimu_taaluma_comments',
    label: 'PRE-Mwalimu wa Taaluma',
    moduleLabel: 'Mwalimu wa Taaluma Comments',
    commentType: 'mwalimu_taaluma',
    icon: 'fa-user-graduate',
    supportsAutoFill: true,
  },
  {
    key: 'mkuu_shule',
    path: 'pre-mkuu-comments',
    basePath: '/admin/pre-mkuu-comments',
    moduleId: 'pre_mkuu_shule_comments',
    label: 'PRE-Mkuu wa Shule',
    moduleLabel: 'Mkuu wa Shule Comments',
    commentType: 'mkuu_shule',
    icon: 'fa-crown',
    supportsAutoFill: true,
  },
  {
    key: 'tabia_mwenendo',
    path: 'pre-tabia-mwenendo',
    basePath: '/admin/pre-tabia-mwenendo',
    moduleId: 'pre_tabia_mwenendo_comments',
    label: 'PRE-Tabia na Mwenendo',
    moduleLabel: 'Tabia na Mwenendo',
    commentType: 'tabia_mwenendo',
    icon: 'fa-balance-scale',
    isGrid: true,
  },
];

export const PRE_FORM_ONE_COMMENT_MODULE_IDS = PRE_FORM_ONE_COMMENT_TYPES.map((t) => t.moduleId);

export const getPreFormOneCommentType = (key) =>
  PRE_FORM_ONE_COMMENT_TYPES.find((t) => t.key === key) || null;
