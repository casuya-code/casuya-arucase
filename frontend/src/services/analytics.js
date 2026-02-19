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
};

