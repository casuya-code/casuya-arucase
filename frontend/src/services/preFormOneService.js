import api from './api';

export const preFormOneService = {
  // Get all students for a specific year
  getStudents: async (year) => {
    try {
      const response = await api.get(`/pre-form-one/${year}`);
      
      return response.data;
    } catch (error) {
      // Handle specific error types
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Create a single student
  createStudent: async (studentData) => {
    try {
      const response = await api.post('/pre-form-one', studentData);
      return response.data;
    } catch (error) {
      // Handle specific error types
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Create multiple students (bulk registration)
  createBulkStudents: async (students, year = null) => {
    const response = await api.post('/pre-form-one/bulk', { students, year });
    return response.data;
  },

  // Update student parish
  updateStudentParish: async (studentId, parish) => {
    const response = await api.put(`/pre-form-one/${studentId}/parish`, { parish });
    return response.data;
  },

  // Bulk update parishes for multiple students
  bulkUpdateParishes: async (updates, year) => {
    const response = await api.put('/pre-form-one/bulk-parish', { year, updates });
    return response.data;
  },

  // Update a student
  updateStudent: async (id, studentData) => {
    const response = await api.put(`/pre-form-one/${id}`, studentData);
    return response.data;
  },

  // Delete a student
  deleteStudent: async (studentId) => {
    const response = await api.delete(`/pre-form-one/${studentId}`);
    return response.data;
  },

  // Bulk delete Pre-Form One students (with cascade cleanup of scores/results)
  bulkDeleteStudents: async (ids) => {
    const response = await api.delete('/pre-form-one/bulk', { data: { ids } });
    return response.data;
  },

  // Export students to CSV
  exportStudents: async (year) => {
    const response = await api.get(`/pre-form-one/${year}/export`, {
      responseType: 'blob'
    });
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `preform-one-students-${year}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response;
  },

  // Get interview results for a specific year and optional month
  getInterviewResults: async (year, month = null) => {
    try {
      let url = `/pre-form-one/${year}/interview-results`;
      if (month && month !== 'all') {
        url += `?month=${encodeURIComponent(month)}`;
      }
      const response = await api.get(url);
      
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Get continuing results for a specific year and optional month
  getContinuingResults: async (year, month = null) => {
    try {
      let url = `/pre-form-one/${year}/continuing-results`;
      if (month && month !== 'all') {
        url += `?month=${encodeURIComponent(month)}`;
      }
      const response = await api.get(url);
      
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Calculate interview results
  calculateInterviewResults: async (year, month = null) => {
    try {
      let url = `/pre-form-one/${year}/interview-results/calculate`;
      if (month && month !== 'all') {
        url += `?month=${encodeURIComponent(month)}`;
      }
      const response = await api.post(url);
      
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Calculate continuing results
  calculateContinuingResults: async (year, month = null) => {
    try {
      let url = `/pre-form-one/${year}/continuing-results/calculate`;
      if (month && month !== 'all') {
        url += `?month=${encodeURIComponent(month)}`;
      }
      const response = await api.post(url);
      
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Get student score for a specific subject
  getStudentScore: async (studentId, subjectId, type) => {
    try {
      let endpoint;
      if (type === 'interview') {
        endpoint = `/pre-form-one/interview-score/${studentId}/${subjectId}`;
      } else if (type === 'continuing') {
        endpoint = `/pre-form-one/continuing-score/${studentId}/${subjectId}`;
      } else {
        throw new Error('Invalid score type. Must be "interview" or "continuing"');
      }

      const response = await api.get(endpoint);

      return response.data?.data ?? response.data?.score ?? 0;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Save interview result
  saveInterviewResult: async (data) => {
    try {
      const response = await api.post('/pre-form-one/interview-result', data);
      
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Save continuing result
  saveContinuingResult: async (data) => {
    try {
      const response = await api.post('/pre-form-one/continuing-result', data);
      
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Delete interview result
  deleteInterviewResult: async (studentId, year) => {
    try {
      const response = await api.delete(`/pre-form-one/interview-result/${studentId}?year=${year}`);
      
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Delete continuing result
  deleteContinuingResult: async (studentId, year) => {
    try {
      const response = await api.delete(`/pre-form-one/continuing-result/${studentId}?year=${year}`);
      
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Download interview results PDF
  downloadInterviewResultsPDF: async (year) => {
    try {
      const response = await api.get(`/pre-form-one/${year}/interview-results/pdf`, {
        responseType: 'blob'
      });
      
      return response;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Download continuing results PDF
  downloadContinuingResultsPDF: async (year) => {
    try {
      const response = await api.get(`/pre-form-one/${year}/continuing-results/pdf`, {
        responseType: 'blob'
      });
      if (!response.data || !(response.data instanceof Blob)) {
        throw new Error('Invalid PDF response from server');
      }
      return response;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Download interview parish results PDF
  downloadInterviewParishResultsPDF: async (year) => {
    try {
      const response = await api.get(`/pre-form-one/${year}/interview-results/parish-pdf`, {
        responseType: 'blob'
      });
      if (!response.data || !(response.data instanceof Blob)) {
        throw new Error('Invalid PDF response from server');
      }
      return response;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw error;
    }
  },

  // Download continuing parish results PDF
  downloadContinuingParishResultsPDF: async (year) => {
    try {
      const response = await api.get(`/pre-form-one/${year}/continuing-results/parish-pdf`, {
        responseType: 'blob'
      });
      if (!response.data || !(response.data instanceof Blob)) {
        throw new Error('Invalid PDF response from server');
      }
      return response;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }

      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }

      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }

      throw error;
    }
  },

  // ==================== Pre-Form One comment modules (PRE-*) ====================

  // List comments for a year, optionally for one comment_type.
  // Returns { success, comments: { studentId: text }, byType: { studentId: { type: text } } }
  getComments: async (year, commentType = null) => {
    const params = new URLSearchParams();
    if (commentType) params.append('comment_type', commentType);
    const qs = params.toString();
    const response = await api.get(`/pre-form-one/${year}/comments${qs ? `?${qs}` : ''}`);
    return response.data;
  },

  // Upsert one comment (student_id, comment_type, comment_text)
  saveComment: async (year, data) => {
    const response = await api.post(`/pre-form-one/${year}/comments`, data);
    return response.data;
  },

  // Upsert many comments of one type: { comment_type, comments: [{ student_id, comment_text }] }
  saveCommentsBulk: async (year, data) => {
    const response = await api.post(`/pre-form-one/${year}/comments/bulk`, data);
    return response.data;
  },

  // Tabia na Mwenendo evaluations as { studentId: { code: grade } }
  getTabiaMwenendo: async (year) => {
    const response = await api.get(`/pre-form-one/${year}/tabia-mwenendo`);
    return response.data;
  },

  // Batch upsert tabia na mwenendo: { evaluations: [{ student_id, criterion, evaluation }], replaceScope }
  saveTabiaMwenendo: async (year, data) => {
    const response = await api.post(`/pre-form-one/${year}/tabia-mwenendo`, data);
    return response.data;
  },

  // O-Level class grades (per student) used by the comment auto-fill helpers
  getClassGrades: async (year) => {
    const response = await api.get(`/pre-form-one/${year}/class-grades`);
    return response.data;
  },

  // ==================== Pre-Form One fees announcements & debts ====================

  // Fees announcement slots for a year as { "1": text, ... }
  getFeesAnnouncements: async (year) => {
    const response = await api.get(`/pre-form-one/${year}/fees-announcements`);
    return response.data;
  },

  // Save the 10 fees announcement slots: { announcements: { "1": text, ... } }
  saveFeesAnnouncements: async (year, announcements) => {
    const response = await api.post(`/pre-form-one/${year}/fees-announcements`, { announcements });
    return response.data;
  },

  // Pre-Form One students with their debt records: { students: [...], debts: { [studentId]: {...} } }
  getDebts: async (year) => {
    const response = await api.get(`/pre-form-one/${year}/debts`);
    return response.data;
  },

  // Save (or clear) one student's debt: { student_id, amount, description, due_date, status }
  saveDebt: async (year, data) => {
    const response = await api.post(`/pre-form-one/${year}/debts`, data);
    return response.data;
  },

  // Bulk upsert debts: { debts: [{ student_id, amount, description }] }
  saveDebtsBulk: async (year, debts) => {
    const response = await api.post(`/pre-form-one/${year}/debts/bulk`, { debts });
    return response.data;
  },

  // Delete one student's debt record
  deleteDebt: async (year, studentId) => {
    const response = await api.delete(`/pre-form-one/${year}/debts/${studentId}`);
    return response.data;
  },
};

export default preFormOneService;
