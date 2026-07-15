import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { publicAPI } from '../../services/public';
import { PUBLIC_INDEXABLE_NAV_LINKS } from '../../constants/publicSiteNavSeo';
import { settingValue } from '../../utils/publicPageContent';
import { FOOTER_COPYRIGHT_NAME, resolveFooterCopyrightName } from '../../utils/footerCopyright';
import './PublicFooter.css';

const FOOTER_NAV_COLUMNS = [
  {
    heading: 'Shule',
    paths: ['/about', '/staff', '/announcements', '/gallery'],
  },
  {
    heading: 'Elimu',
    paths: ['/admissions', '/admissions/apply', '/student-life', '/student-report'],
  },
  {
    heading: 'Taarifa',
    paths: ['/necta-results', '/school-fee', '/contact', '/privacy-policy'],
  },
];

const PublicFooter = () => {
  const [visitorStatsEnabled, setVisitorStatsEnabled] = useState(false);

  useEffect(() => {
    const enable = () => setVisitorStatsEnabled(true);
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(enable, { timeout: 6000 });
      return () => cancelIdleCallback(id);
    }
    const timer = setTimeout(enable, 3000);
    return () => clearTimeout(timer);
  }, []);

  const { data: homepageData } = useQuery({
    queryKey: ['homepage'],
    queryFn: async () => {
      try {
        const res = await publicAPI.getHomepage();
        return res.data;
      } catch (err) {
        console.error('Error fetching homepage data in footer:', err);
        return { settings: {} };
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: visitorStats, refetch: refetchVisitorStats } = useQuery({
    queryKey: ['visitor-stats'],
    queryFn: async () => {
      try {
        const res = await publicAPI.getVisitorStats();
        return res.data;
      } catch (err) {
        console.error('Error fetching visitor stats:', err);
        return { stats: { daily: 0, weekly: 0, total: 0 } };
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: visitorStatsEnabled,
  });

  useEffect(() => {
    const onTracked = () => {
      refetchVisitorStats();
    };
    window.addEventListener('visitor:tracked', onTracked);
    return () => window.removeEventListener('visitor:tracked', onTracked);
  }, [refetchVisitorStats]);

  const settings = homepageData?.settings || {};
  const contactEmail = settingValue(settings, 'contact_email');
  const contactWhatsapp = settingValue(settings, 'contact_whatsapp');
  const socialLocation = settingValue(settings, 'social_location');
  const socialYoutube = settingValue(settings, 'social_youtube');
  const socialFacebook = settingValue(settings, 'social_facebook');
  const socialInstagram = settingValue(settings, 'social_instagram');
  const socialTwitter = settingValue(settings, 'social_twitter');
  const footerSocialLabel = settingValue(settings, 'footer_social_label');
  const footerCopyright = resolveFooterCopyrightName(settingValue(settings, 'footer_copyright'));
  const schoolName = resolveFooterCopyrightName(settingValue(settings, 'school_name'));

  const whatsappNumber = contactWhatsapp.replace(/[+\s]/g, '');
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '';

  const stats = visitorStats?.stats || {
    daily: 0,
    weekly: 0,
    total: 0
  };

  const displayStats = {
    daily: stats.today || 0,
    weekly: stats.week || 0,
    total: stats.total || 0
  };

  const linkMap = Object.fromEntries(
    PUBLIC_INDEXABLE_NAV_LINKS.filter((l) => l.path !== '/').map((l) => [l.path, l])
  );

  const socialLinks = [
    { url: socialYoutube, cls: 'youtube', icon: 'fab fa-youtube', label: 'YouTube' },
    { url: contactEmail ? `mailto:${contactEmail}` : '', cls: 'email', icon: 'fas fa-envelope', label: 'Email' },
    { url: whatsappUrl, cls: 'whatsapp', icon: 'fab fa-whatsapp', label: 'WhatsApp' },
    { url: socialLocation, cls: 'location', icon: 'fas fa-map-marker-alt', label: 'Location' },
    { url: socialFacebook, cls: 'facebook', icon: 'fab fa-facebook', label: 'Facebook' },
    { url: socialInstagram, cls: 'instagram', icon: 'fab fa-instagram', label: 'Instagram' },
    { url: socialTwitter, cls: 'twitter', icon: 'fab fa-x-twitter', label: 'X' },
  ].filter((s) => s.url);

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="site-footer__inner">
        {/* Main footer: nav columns + social */}
        <div className="site-footer__main">
          <nav className="site-footer__nav" aria-label="Kurasa kuu za tovuti">
            {FOOTER_NAV_COLUMNS.map((col) => (
              <div className="site-footer__nav-col" key={col.heading}>
                <h3 className="site-footer__nav-heading">{col.heading}</h3>
                <ul className="site-footer__nav-list">
                  {col.paths.map((path) => {
                    const link = linkMap[path];
                    if (!link) return null;
                    return (
                      <li key={path}>
                        <Link to={link.path}>{link.nameSw}</Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="site-footer__social">
            <span className="site-footer__social-label">{footerSocialLabel || 'Ungana Nasi'}</span>
            <div className="site-footer__social-icons">
              {socialLinks.map((s) => (
                <a
                  key={s.cls}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`site-footer__social-icon site-footer__social-icon--${s.cls}`}
                  title={s.label}
                  aria-label={s.label}
                >
                  <i className={s.icon} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="site-footer__divider" />

        {/* Bottom bar: copyright + visitor stats */}
        <div className="site-footer__bottom">
          <p className="site-footer__copyright">
            &copy; <span>{new Date().getFullYear()}</span>{' '}
            {footerCopyright || schoolName || FOOTER_COPYRIGHT_NAME}
            <span className="site-footer__dot">·</span>
            <Link to="/privacy-policy" className="site-footer__privacy-link">Sera ya Faragha</Link>
          </p>
          <div className="site-footer__stats">
            <span className="site-footer__stat">
              <span className="site-footer__stat-label">Leo</span>
              <span className="site-footer__stat-value">{displayStats.daily}</span>
            </span>
            <span className="site-footer__stat">
              <span className="site-footer__stat-label">Wiki hii</span>
              <span className="site-footer__stat-value">{displayStats.weekly}</span>
            </span>
            <span className="site-footer__stat">
              <span className="site-footer__stat-label">Jumla</span>
              <span className="site-footer__stat-value">{displayStats.total}</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
