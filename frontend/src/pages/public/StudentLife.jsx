/**
 * Student Life Page — CMS from Admin → Public Pages (slug: student-life)
 */
import PublicCmsPage from '../../components/public/PublicCmsPage';
import { createPublicCmsPrepareHtml } from '../../components/public/PublicCmsPage';
import './StudentLife.css';

const StudentLife = () => (
  <PublicCmsPage
    pageSlug="student-life"
    pageLabel="Maisha ya Wanafunzi"
    loadingMessage="Inapakia ukurasa wa maisha ya wanafunzi..."
    shellClassName="student-life-page student-life-page--immersive public-immersive-shell"
    innerClassName="public-immersive-shell__inner"
    showPageHero
    heroVariant="student-life"
    cmsClassName="student-life-grid"
    prepareHtml={createPublicCmsPrepareHtml('studentLife')}
  />
);

export default StudentLife;
