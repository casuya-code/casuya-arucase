/**
 * Reports API Service
 */
import api from './api';

export const reportsAPI = {
  // Get individual report
  getIndividualReport: (form, stream, year, term, admNo) =>
    api.get(`/reports/individual/${form}/${stream}/${year}/${term}/${admNo}`),
  
  // Download individual report PDF
  downloadIndividualPDF: (form, stream, year, term, admNo) =>
    api.get(`/reports/individual/${form}/${stream}/${year}/${term}/${admNo}/pdf`, {
      responseType: 'blob'
    }),
  
  // Download individual report CSV
  downloadIndividualCSV: (form, stream, year, term, admNo) =>
    api.get(`/reports/individual/${form}/${stream}/${year}/${term}/${admNo}/csv`, {
      responseType: 'blob'
    }),
  
  // Get bulk report
  getBulkReport: (form, year, term, stream = null) => {
    const url = stream
      ? `/reports/bulk/${form}/${year}/${term}?stream=${stream}`
      : `/reports/bulk/${form}/${year}/${term}`;
    return api.get(url);
  },
  
  // Download bulk report PDF
  downloadBulkPDF: (form, year, term, stream = null) => {
    const url = stream
      ? `/reports/bulk/${form}/${year}/${term}/pdf?stream=${stream}`
      : `/reports/bulk/${form}/${year}/${term}/pdf`;
    return api.get(url, { responseType: 'blob' });
  }
};

