/**
 * Pre-Form One Interview Results Page
 * Full results grid: S/N, names, parish, per-subject scores, totals, grade, position, remarks
 *
 * The grid itself lives in PreFormOneResultsPage; this page only supplies the
 * interview labels and API calls.
 */
import React from 'react';
import { preFormOneService } from '../../services/preFormOneService';
import PreFormOneResultsPage from './PreFormOneResultsPage';

const INTERVIEW_CONFIG = {
  labelTitle: 'Interview',
  scoreType: 'interview',
  resultsQueryKey: 'preform-one-interview-results',
  fetchResults: (year, month) => preFormOneService.getInterviewResults(year, month),
  calculateResults: (year, month) => preFormOneService.calculateInterviewResults(year, month),
  downloadResultsPDF: (year) => preFormOneService.downloadInterviewResultsPDF(year),
  pageTitle: 'Interview Results',
  cardTitle: 'Calculate Results',
  cardIconClass: 'fa-calculator',
  pdfButtonId: 'downloadInterviewResultsBtn',
  pdfButtonTextId: 'downloadInterviewBtnText',
  showSummaryHeader: true,
  showBackButtonInCardHeader: false,
};

const PreFormOneInterviewResults = () => <PreFormOneResultsPage config={INTERVIEW_CONFIG} />;

export default PreFormOneInterviewResults;
