import api from './api';

export const maintenanceAPI = {
  getStatus: () => api.get('/maintenance/status'),
  getSettings: () => api.get('/maintenance/settings'),
  updateSettings: (settings) => api.put('/maintenance/settings', settings),
};
