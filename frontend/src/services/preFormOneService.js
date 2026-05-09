import api from './api';

export const preFormOneService = {
  // Get all students for a specific year
  getStudents: async (year) => {
    try {
      const response = await api.get(`/pre-form-one/${year}`);
      
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error fetching students:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      
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
      console.error('🔍 SERVICE DEBUG: Error creating student:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      
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
  createBulkStudents: async (students) => {
    try {
      const response = await api.post('/pre-form-one/bulk', { students });
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error creating bulk students:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Update student parish
  updateStudentParish: async (studentId, parish) => {
    try {
      const response = await api.put(`/pre-form-one/${studentId}/parish`, { parish });
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error updating student parish:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Bulk update parishes for multiple students
  bulkUpdateParishes: async (updates) => {
    try {
      const response = await api.put('/pre-form-one/bulk-parish', { updates });
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error bulk updating parishes:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Update a student
  updateStudent: async (id, studentData) => {
    try {
      const response = await api.put(`/pre-form-one/${id}`, studentData);
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error updating student:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Delete a student
  deleteStudent: async (studentId) => {
    try {
      const response = await api.delete(`/pre-form-one/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error deleting student:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },

  // Export students to CSV
  exportStudents: async (year) => {
    try {
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
    } catch (error) {
      console.error('Error exporting students:', error);
      throw error;
    }
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
      console.error('🔍 SERVICE DEBUG: Error fetching interview results:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      
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
      console.error('🔍 SERVICE DEBUG: Error fetching continuing results:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      
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
      console.error('🔍 SERVICE DEBUG: Error calculating interview results:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      
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
      console.error('🔍 SERVICE DEBUG: Error calculating continuing results:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      
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
        endpoint = `/pre-form-one/student-score/${studentId}/${subjectId}`;
      } else if (type === 'continuing') {
        endpoint = `/pre-form-one/student-score/${studentId}/${subjectId}?type=continuing`;
      } else {
        throw new Error('Invalid score type. Must be "interview" or "continuing"');
      }
      
      const response = await api.get(endpoint);
      
      return response.data?.score || 0;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error getting student score:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      
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
      console.error('🔍 SERVICE DEBUG: Error saving interview result:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      
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
      console.error('🔍 SERVICE DEBUG: Error saving continuing result:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      
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
      console.error('🔍 SERVICE DEBUG: Error deleting interview result:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      
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
      console.error('🔍 SERVICE DEBUG: Error deleting continuing result:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      
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
      console.error('🔍 SERVICE DEBUG: Error downloading interview results PDF:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      
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
      
      return response;
      
      // Validate blob
      if (!response.data || !(response.data instanceof Blob)) {
        throw new Error('Invalid PDF response from server');
      }
      
      return response;
    } catch (error) {
      console.error('🔍 SERVICE DEBUG: Error downloading continuing results PDF:');
      console.error('🔍 SERVICE DEBUG: Error object:', error);
      console.error('🔍 SERVICE DEBUG: Error response:', error.response);
      console.error('🔍 SERVICE DEBUG: Error status:', error.response?.status);
      console.error('🔍 SERVICE DEBUG: Error data:', error.response?.data);
      
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
  }
};

export default preFormOneService;
