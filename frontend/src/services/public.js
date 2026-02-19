/**
 * Public API Service
 */
import api from './api';

export const publicAPI = {
  // Get homepage data
  getHomepage: () => api.get('/public/homepage'),
  
  // Get announcements
  getAnnouncements: (limit) => api.get(`/public/announcements${limit ? `?limit=${limit}` : ''}`),
  
  // Get gallery
  getGallery: (limit) => api.get(`/public/gallery${limit ? `?limit=${limit}` : ''}`),
  
  // Get alumni
  getAlumni: (limit) => api.get(`/public/alumni${limit ? `?limit=${limit}` : ''}`),
  
  // Get FAQs
  getFAQs: () => api.get('/public/faqs'),

  // Chatbot (replaces FAQ for common questions; no protected data)
  chat: (message) => api.post('/public/chat', { message }),

  // Get administrators
  getAdministrators: () => api.get('/public/administrators'),
  
  // Get public page
  getPage: (pageName) => api.get(`/public/page/${pageName}`),
  
  
  // Submit alumni
  submitAlumni: (data) => api.post('/public/alumni/submit', data),
  
  // Submit donation
  submitDonation: (data) => api.post('/public/donation', data),
  
  // Track visitor
  trackVisitor: () => api.post('/public/track-visitor'),
  
  // Get visitor stats
  getVisitorStats: () => api.get('/public/visitor-stats'),
  
  // Fetch NECTA results
  fetchNECTAResults: (examType, year) => api.post('/public/necta-results', { exam_type: examType, year }),
  
  // Student portal
  studentLogin: (credentials) => api.post('/public/student/login', credentials),
  getStudentMonths: (admNo, year) => api.get(`/public/student/${admNo}/months?year=${year}`),
  getStudentResults: (admNo, month, year) => api.get(`/public/student/${admNo}/results/${month}?year=${year}`),
  getStudentPhoto: (admNo, level, stream, year) => api.get(`/public/student/${admNo}/photo?level=${encodeURIComponent(level)}&stream=${stream}&year=${year}`)
};

