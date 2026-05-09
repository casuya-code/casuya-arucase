import api from './api';

export const preFormOnePromotionService = {
  // Get students eligible for promotion
  getEligibleStudents: async (year) => {
    console.log('🔍 PROMOTION SERVICE: Getting eligible students for year:', year);
    try {
      const response = await api.get(`/preformone-promotion/eligible/${year}`, {
        timeout: 15000 // 15 second timeout
      });
      console.log('🔍 PROMOTION SERVICE: Eligible students response:', response);
      return response.data;
    } catch (error) {
      console.error('🔍 PROMOTION SERVICE: Error fetching eligible students:', error);
      throw error;
    }
  },

  // Get promotion status for a year
  getPromotionStatus: async (year) => {
    console.log('🔍 PROMOTION SERVICE: Getting promotion status for year:', year);
    try {
      const response = await api.get(`/preformone-promotion/status/${year}`, {
        timeout: 15000 // 15 second timeout
      });
      console.log('🔍 PROMOTION SERVICE: Promotion status response:', response);
      return response.data;
    } catch (error) {
      console.error('🔍 PROMOTION SERVICE: Error fetching promotion status:', error);
      throw error;
    }
  },

  // Promote students to Form One
  promoteStudents: async (year, promotionData) => {
    console.log('🔍 PROMOTION SERVICE: Promoting students from year:', year);
    console.log('🔍 PROMOTION SERVICE: Promotion data:', promotionData);
    try {
      const response = await api.post(`/preformone-promotion/promote/${year}`, promotionData);
      console.log('🔍 PROMOTION SERVICE: Promotion response:', response);
      return response.data;
    } catch (error) {
      console.error('🔍 PROMOTION SERVICE: Error promoting students:', error);
      throw error;
    }
  },

  // Get promotion history
  getPromotionHistory: async () => {
    console.log('🔍 PROMOTION SERVICE: Getting promotion history');
    try {
      const response = await api.get('/preformone-promotion/history');
      console.log('🔍 PROMOTION SERVICE: Promotion history response:', response);
      return response.data;
    } catch (error) {
      console.error('🔍 PROMOTION SERVICE: Error fetching promotion history:', error);
      throw error;
    }
  }
};
