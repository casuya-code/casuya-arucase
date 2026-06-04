/**
 * Pre-Form One Students Service
 * Handles API calls for Pre-Form One registered students
 */

import api from './api';

async function fetchPreFormOneStudents(year) {
  const response = await api.get(`/pre-form-one/${year}`);
  return response.data;
}

const preFormOneStudentsService = {
  /** @param {number|string} [year] defaults to current calendar year */
  getPreFormOneStudents: async (year = new Date().getFullYear()) => fetchPreFormOneStudents(year),

  getPreFormOneStudentsByYear: async (year) => fetchPreFormOneStudents(year),

  getStudentByAdmissionNumber: async (admissionNumber) => {
    const response = await api.get(`/pre-form-one/student/${admissionNumber}`);
    return response.data;
  },

  saveStudentScores: async (studentScores) => {
    const response = await api.post('/preformone-scores', studentScores);
    return response.data;
  },

  saveBulkStudentScores: async (scores) => {
    const response = await api.post('/preformone-scores/bulk', { scores });
    return response.data;
  },

  getStudentScoresBySubject: async (subjectId, scoreType) => {
    const response = await api.get(`/preformone-scores/subject/${subjectId}?type=${scoreType}`);
    return response.data;
  },

  getScoresByYear: async (year, scoreType) => {
    const response = await api.get(`/preformone-scores/year/${year}?type=${scoreType}`);
    return response.data;
  },

  getScoreStatistics: async (subjectId, scoreType, year) => {
    const response = await api.get(
      `/preformone-scores/stats/${subjectId}?type=${scoreType}&year=${encodeURIComponent(year)}`
    );
    const payload = response.data;
    const stats = payload?.data ?? payload;
    const total = Number(stats?.total_students) || 0;
    const scored = Number(stats?.scored_students) || 0;
    return {
      total,
      scored,
      pending: Math.max(0, total - scored),
      averageScore: stats?.average_score != null ? Number(stats.average_score) : null,
      highestScore: stats?.highest_score != null ? Number(stats.highest_score) : null,
      lowestScore: stats?.lowest_score != null ? Number(stats.lowest_score) : null,
    };
  },

  exportScores: async (subjectId, scoreType, year) => {
    const response = await api.get(
      `/preformone-scores/export/${subjectId}?type=${scoreType}&year=${encodeURIComponent(year)}`,
      {
        responseType: 'blob',
      }
    );
    return response;
  },
};

export default preFormOneStudentsService;
