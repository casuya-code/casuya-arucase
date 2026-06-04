import api from './api';
import { unwrapListPayload } from './preFormOneApiHelpers';

export const preFormOneInterviewSubjectsService = {
  getSubjects: async () => {
    const response = await api.get('/preformone-interview-subjects');
    return unwrapListPayload(response.data);
  },

  getSubjectById: async (id) => {
    const response = await api.get(`/preformone-interview-subjects/${id}`);
    return response.data.data || response.data;
  },

  createSubject: async (subjectData) => {
    const response = await api.post('/preformone-interview-subjects', {
      subject_name: subjectData.subject_name,
      subject_code: subjectData.subject_code,
      is_active: subjectData.is_active,
    });
    return response.data;
  },

  updateSubject: async (id, subjectData) => {
    const response = await api.put(`/preformone-interview-subjects/${id}`, {
      subject_name: subjectData.subject_name,
      subject_code: subjectData.subject_code,
      is_active: subjectData.is_active,
    });
    return response.data;
  },

  deleteSubject: async (id) => {
    const response = await api.delete(`/preformone-interview-subjects/${id}`);
    return response.data;
  },

  exportSubjects: async () => {
    const response = await api.get('/preformone-interview-subjects/export', {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'preformone-interview-subjects.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return response.data;
  },
};
