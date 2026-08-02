/**
 * Canonical admin module catalog.
 *
 * SUPERADMIN uses these to decide which sidebar modules each ADMIN may see.
 * Admins may grant non-admin users only the modules listed here that they
 * themselves own. Keep ids in sync with AdminSidebar navigationItems.moduleId,
 * App.jsx ProtectedRoute requiredModule props, and backend requireModule calls.
 */
export const ADMIN_MODULES = [
  // Student Management
  { id: 'student_registration_form_i_iv', label: 'Student Registration (Forms I-IV)', icon: 'fa-user-plus' },
  { id: 'student_registration_form_v_vi', label: 'Student Registration (Forms V-VI)', icon: 'fa-user-plus' },
  { id: 'student_registration_pre_form', label: 'Registration (Pre-Form)', icon: 'fa-child' },
  { id: 'student_photo', label: 'Student Photos', icon: 'fa-camera' },
  { id: 'student_parishes', label: 'Parishes', icon: 'fa-place-of-worship' },

  // Academic Management
  { id: 'subject_management', label: 'Subjects', icon: 'fa-book' },
  { id: 'individual_scores', label: 'Score Entry', icon: 'fa-graduation-cap' },
  { id: 'dta_monitor', label: 'DTA Monitor', icon: 'fa-history' },
  { id: 'teachers_management', label: 'Teachers', icon: 'fa-chalkboard-teacher' },
  { id: 'grades', label: 'Grades', icon: 'fa-award' },
  { id: 'marks_config', label: 'Marks Config', icon: 'fa-calendar-alt' },

  // Comments & Assessment
  { id: 'sala_comments', label: 'Sala', icon: 'fa-comments' },
  { id: 'huduma_comments', label: 'Huduma', icon: 'fa-hands-helping' },
  { id: 'tabia_comments', label: 'Tabia', icon: 'fa-user-check' },
  { id: 'michezo_comments', label: 'Michezo', icon: 'fa-running' },
  { id: 'taaluma_comments', label: 'Taaluma', icon: 'fa-book-open' },
  { id: 'mwalimu_taaluma_comments', label: 'Mwalimu Comments', icon: 'fa-user-graduate' },
  { id: 'mkuu_shule_comments', label: 'Mkuu Comments', icon: 'fa-crown' },
  { id: 'tabia_mwenendo_comments', label: 'Tabia & Mwenendo', icon: 'fa-balance-scale' },

  // Results & Reports
  { id: 'monthly_results', label: 'Monthly Results', icon: 'fa-clipboard-list' },
  { id: 'individual_report', label: 'Student Report', icon: 'fa-file-alt' },
  { id: 'bulk_report', label: 'Bulk Report', icon: 'fa-copy' },

  // Announcements & Communication
  { id: 'news_announcements', label: 'News', icon: 'fa-newspaper' },
  { id: 'fees_announcements', label: 'Fees', icon: 'fa-money-bill-wave' },
  { id: 'individual_debt', label: 'Debts', icon: 'fa-money-bill-wave' },

  // Analytics
  { id: 'analytics_view', label: 'Analytics View', icon: 'fa-chart-line' },
  { id: 'analytics_student_tracking', label: 'Student Tracking', icon: 'fa-user-check' },
  { id: 'analytics_solutions', label: 'Solutions', icon: 'fa-lightbulb' },
  { id: 'analytics_form_averages', label: 'Form Averages', icon: 'fa-chart-bar' },

  // School Branding
  { id: 'school_branding', label: 'School Branding', icon: 'fa-image' },

  // Administration
  { id: 'administrators', label: 'Administrators', icon: 'fa-user-shield' },
  { id: 'user_management', label: 'User Management', icon: 'fa-users-cog' },
  { id: 'promotion', label: 'Promotion', icon: 'fa-graduation-cap' },
  { id: 'database_backups', label: 'Database Backup', icon: 'fa-database' },

  // AI Matters
  { id: 'ai_matters', label: 'AI Matters', icon: 'fa-robot' },
  { id: 'user_commands', label: 'User Commands', icon: 'fa-comments' },

  // Public Website
  { id: 'public_pages', label: 'Public Pages', icon: 'fa-globe' },
  { id: 'necta_urls', label: 'NECTA URLs', icon: 'fa-link' },
  { id: 'announcements', label: 'Announcements', icon: 'fa-bullhorn' },
  { id: 'gallery', label: 'Gallery', icon: 'fa-images' },
  { id: 'admission_applications', label: 'Admissions Apps', icon: 'fa-file-signature' },
  { id: 'admission_letters', label: 'Admission Letters', icon: 'fa-file-pdf' },
  { id: 'staff_profiles', label: 'Staff Profiles', icon: 'fa-id-badge' },
  { id: 'pass_ids', label: 'Pass ID', icon: 'fa-key' },
  { id: 'faqs', label: 'FAQs', icon: 'fa-question-circle' },
  { id: 'department_contacts', label: 'Site & Contacts', icon: 'fa-address-book' },
];

export const ADMIN_MODULE_IDS = ADMIN_MODULES.map((m) => m.id);

export const getAdminModuleLabel = (id) => {
  const found = ADMIN_MODULES.find((m) => m.id === id);
  return found ? found.label : id.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};
