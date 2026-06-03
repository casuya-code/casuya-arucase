/**
 * Student Report page — CMS from Admin → Public Pages (slug: student_report)
 */
import DOMPurify from 'dompurify';
import PublicCmsPage from '../../components/public/PublicCmsPage';
import { RIPOTI_MWANAFUNZI_LABEL } from '../../constants/publicSiteNav';
import { prepareStudentReportHtml } from './studentReportCms';
import './StudentReport.css';

const StudentReport = () => (
  <PublicCmsPage
    pageSlug="student_report"
    pageLabel={RIPOTI_MWANAFUNZI_LABEL}
    loadingMessage="Inapakia ukurasa wa ripoti..."
    shellClassName="student-report-page public-immersive-shell"
    innerClassName="public-immersive-shell__inner"
    showPageHero
    heroVariant="student-report"
    prepareHtml={(page) => {
      const raw = prepareStudentReportHtml(page);
      return { html: DOMPurify.sanitize(raw.html), variant: raw.variant };
    }}
    cmsClassName="content-card student-report-surface student-report-surface--cms"
  />
);

export default StudentReport;
