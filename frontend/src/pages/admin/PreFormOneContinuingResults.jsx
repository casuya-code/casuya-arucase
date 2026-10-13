/**
 * Pre-Form One Continuing Results Page
 * Full results grid: S/N, names, parish, per-subject scores, totals, grade, position, remarks
 *
 * The grid itself lives in PreFormOneResultsPage; this page only supplies the
 * continuing labels and API calls.
 */
import React from 'react';
import { preFormOneService } from '../../services/preFormOneService';
import { O_LEVEL_C_LOW_THRESHOLD } from '../../utils/oLevelGrading';
import PreFormOneResultsPage from './PreFormOneResultsPage';

const CONTINUING_CONFIG = {
  labelTitle: 'Continuing',
  scoreType: 'continuing',
  resultsQueryKey: 'preform-one-continuing-results',
  fetchResults: (year, month) => preFormOneService.getContinuingResults(year, month),
  calculateResults: (year, month) => preFormOneService.calculateContinuingResults(year, month),
  downloadResultsPDF: (year) => preFormOneService.downloadContinuingResultsPDF(year),
  downloadParishResultsPDF: (year) => preFormOneService.downloadContinuingParishResultsPDF(year),
  pageTitle: 'Continuing Results',
  cardTitle: 'Pre-Form One Continuing Results',
  cardIconClass: 'fa-chart-line',
  pdfButtonId: 'downloadContinuingResultsBtn',
  pdfButtonTextId: 'downloadContinuingBtnText',
  showSummaryHeader: false,
  showBackButtonInCardHeader: true,
  // Continuing students have passed the interview, so they are graded on the
  // school's regular O-Level scale (A>=85, B>=70, C>=50, D>=40, F<40) with
  // Swahili remarks instead of the interview pass/fail scale.
  grading: 'oLevel',
  cLowThreshold: O_LEVEL_C_LOW_THRESHOLD,
  // Continuing results omit the parish column.
  showParishColumn: false,
};

const PreFormOneContinuingResults = () => <PreFormOneResultsPage config={CONTINUING_CONFIG} />;

export default PreFormOneContinuingResults;
