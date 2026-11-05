/**
 * Analytics API Service
 */
import api from './api';

export const analyticsAPI = {
  // Get dashboard statistics
  getDashboardStats: () => api.get('/analytics/dashboard/stats'),

  // Search students
  searchStudents: (query, form) => {
    const params = new URLSearchParams({ q: query });
    if (form) params.append('form', form);
    return api.get(`/analytics/search-students?${params.toString()}`);
  },

  // Get student performance
  getStudentPerformance: (admNo, params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/analytics/student/${admNo}/performance?${queryString}`);
  },

  // Get class performance
  getClassPerformance: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/analytics/class/performance?${queryString}`);
  },

  // Get subject performance
  getSubjectPerformance: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/analytics/subject/performance?${queryString}`);
  },

  // Get all forms averages
  getAllFormsAverages: () => api.get('/analytics/all-forms-averages'),

  // Get subjects for form
  getSubjectsForForm: (form, params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/analytics/subjects/${form}?${queryString}`);
  },

  // Get who-and-when analytics
  getWhoAndWhen: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/analytics/who-and-when?${queryString}`);
  },

  // Get solutions/recommendations
  getSolutions: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/analytics/solutions?${queryString}`);
  },

  // Get AI-enhanced solutions (Mistral-powered, falls back to rule-based)
  getAISolutions: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/analytics/solutions/ai?${queryString}`);
  },

  // PROMO — Form One subject performance for Form Two allocation
  getPromoFormOne: (year) => {
    const params = { year };
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/analytics/promo/form-one?${queryString}`);
  },

  // PROMO — download the report as a landscape A4 PDF. Passing an array
  // (even an empty one) sends exactly the selected columns; passing
  // undefined lets the backend use every month/subject.
  getPromoFormOnePdf: (year, qualifyThreshold, discussThreshold, months, subjects) => {
    const params = { year, qualifyThreshold, discussThreshold };
    if (Array.isArray(months)) params.months = months.join(',');
    if (Array.isArray(subjects)) params.subjects = subjects.join(',');
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/analytics/promo/form-one/pdf?${queryString}`, {
      responseType: 'blob',
    });
  },
};

