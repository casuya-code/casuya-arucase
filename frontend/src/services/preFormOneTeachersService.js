import api from './api';

const preFormOneTeachersService = {
  getTeachers: async (year) => {
    const response = await api.get('/preformone-teachers', { params: { year } });
    return response.data;
  },

  saveTeacher: async (data) => {
    const response = await api.post('/preformone-teachers', data);
    return response.data;
  },

  deleteTeacher: async (year, subject_code) => {
    const response = await api.delete('/preformone-teachers', { params: { year, subject_code } });
    return response.data;
  },
};

export default preFormOneTeachersService;
