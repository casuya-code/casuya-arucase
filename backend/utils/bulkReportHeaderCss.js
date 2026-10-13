/**
 * Bulk multi-page PDF header layout.
 *
 * With the report card header built from `display: flex` plus `position: absolute`
 * logo/photo, Chromium's print layout only paints the absolutely-positioned
 * children on the first page of a multi-page document (see the O-Level bulk
 * report). Switching the header to a CSS grid keeps the logo and photo on every
 * student's report, so this CSS is applied to any document that stacks multiple
 * `report-container`s into one PDF.
 *
 * Shared by the O-Level bulk report (bulkPdfGenerator) and the Pre-Form One
 * continuing bulk report (preFormOneContinuingReportHtml); both use the same
 * report CSS class names.
 */
const BULK_MULTI_PAGE_HEADER_CSS = `
    @media print {
      .bulk-pdf-document .report-container {
        min-height: 0 !important;
        overflow: visible !important;
        overflow-x: visible !important;
        page-break-after: always;
        break-after: page;
      }
      .bulk-pdf-document .report-container:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      .bulk-pdf-document .report-container .report-header {
        display: grid !important;
        grid-template-columns: 90px minmax(0, 1fr) 90px !important;
        align-items: center !important;
        gap: 8px !important;
        min-height: 104px !important;
        position: relative !important;
        overflow: visible !important;
        box-sizing: border-box !important;
        margin-bottom: 4px !important;
        padding: 10px 4px 8px 4px !important;
      }
      .bulk-pdf-document .report-container .report-header .school-info {
        grid-column: 2 !important;
        min-width: 0 !important;
      }
      .bulk-pdf-document .report-container .logo-section {
        grid-column: 1 !important;
        position: relative !important;
        left: auto !important;
        right: auto !important;
        top: auto !important;
      }
      .bulk-pdf-document .report-container .student-photo {
        grid-column: 3 !important;
        position: relative !important;
        left: auto !important;
        right: auto !important;
        top: auto !important;
      }
      .bulk-pdf-document .report-container .logo-section,
      .bulk-pdf-document .report-container .student-photo {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      .bulk-pdf-document .report-container .school-logo,
      .bulk-pdf-document .report-container .photo {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      /* Keep MAMBO + signature/stamp on page 2 (match individual 2-page layout) */
      .bulk-pdf-document .report-closing-block {
        page-break-inside: avoid !important;
        break-inside: avoid-page !important;
      }
      .bulk-pdf-document .report-closing-block .signature-stamp-section {
        page-break-before: avoid !important;
        break-before: avoid-page !important;
        margin-top: 4px !important;
        min-height: 0 !important;
        padding: 2px 0 !important;
      }
      .bulk-pdf-document .report-section.section-mambo {
        padding-bottom: 2px !important;
        margin-bottom: 0 !important;
      }
      .bulk-pdf-document .report-section.section-maoni-taaluma,
      .bulk-pdf-document .report-section.section-maoni {
        margin-bottom: 1px !important;
        padding-bottom: 2px !important;
      }
      .bulk-pdf-document .stamp-img {
        max-width: 100px !important;
        max-height: 100px !important;
      }
    }
`;

module.exports = { BULK_MULTI_PAGE_HEADER_CSS };
