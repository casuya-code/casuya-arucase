/**
 * Pre-Form One Continuing Results Page
 * Full results grid: S/N, names, parish, per-subject scores, totals, grade, position, remarks
 *
 * The grid itself lives in PreFormOneResultsPage; this page only supplies the
 * continuing labels and API calls.
 */
import React from 'react';
import { preFormOneService } from '../../services/preFormOneService';
import PreFormOneResultsPage from './PreFormOneResultsPage';

const CONTINUING_CONFIG = {
  labelTitle: 'Continuing',
  scoreType: 'continuing',
  resultsQueryKey: 'preform-one-continuing-results',
  fetchResults: (year, month) => preFormOneService.getContinuingResults(year, month),
  calculateResults: (year, month) => preFormOneService.calculateContinuingResults(year, month),
  downloadResultsPDF: (year) => preFormOneService.downloadContinuingResultsPDF(year),
  pageTitle: 'Continuing Results',
  cardTitle: 'Pre-Form One Continuing Results',
  cardIconClass: 'fa-chart-line',
  pdfButtonId: 'downloadContinuingResultsBtn',
  pdfButtonTextId: 'downloadContinuingBtnText',
  showSummaryHeader: false,
  showBackButtonInCardHeader: true,
};

const PreFormOneContinuingResults = () => <PreFormOneResultsPage config={CONTINUING_CONFIG} />;

export default PreFormOneContinuingResults;
