/**
 * Admissions Page — CMS from Admin → Public Pages (slug: admissions)
 */
import PublicCmsPage from '../../components/public/PublicCmsPage';
import { createPublicCmsPrepareHtml } from '../../components/public/PublicCmsPage';
import './Admissions.css';

const Admissions = () => (
  <PublicCmsPage
    pageSlug="admissions"
    pageLabel="Udahili"
    loadingMessage="Inapakia ukurasa wa udahili..."
    shellClassName="admissions-page admissions-page--immersive public-immersive-shell"
    innerClassName="public-immersive-shell__inner"
    cmsClassName="admissions-grid"
    proseClassName="admissions-card admissions-card--prose"
    showPageHero
    heroVariant="admissions"
    prepareHtml={createPublicCmsPrepareHtml('admissions')}
  />
);

export default Admissions;
