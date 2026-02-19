import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicAPI } from '../../services/public';
import './PublicHeader.css';

const MOBILE_BREAKPOINT = 900;

function getIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}

const PublicHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  /* Set from first paint so menu is portaled immediately on mobile and never scrolls with header */
  const [isMobile, setIsMobile] = useState(getIsMobile);
  const location = useLocation();

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Fetch settings for dynamic content
  const { data: homepageData } = useQuery({
    queryKey: ['homepage'],
    queryFn: () => publicAPI.getHomepage(),
    select: (res) => res.data,
    staleTime: 10 * 60 * 1000,
  });

  const settings = homepageData?.settings || {};
  const schoolName = settings?.school_name || 'ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU';
  const tagline = settings?.tagline || 'Catholic Minor Preparatory Seminary In Arusha Tanzania';
  const bannerText = settings?.banner_text || 'ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU TANZANIA SINCE 1967';
  const schoolLogo = settings?.school_logo || '/uploads/photos/9749b4af-7e1c-454b-a482-37a0f64162f1.jpg';
  const patronSaintImage = settings?.patron_saint_image;

  // Helper to get API URL for images
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const baseUrl = apiUrl.replace('/api', '');
    // Remove leading slash from path if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${baseUrl}/static/${cleanPath}`;
  };

  // Navigation items organized logically
  const navigationItems = [
    { path: '/', label: 'Home', icon: 'fa-home' },
    { path: '/about', label: 'About', icon: 'fa-info-circle' },
    { path: '/admissions', label: 'Admissions', icon: 'fa-user-plus' },
    { path: '/staff', label: 'Staff', icon: 'fa-users' },
    { path: '/student-life', label: 'Student Life', icon: 'fa-heart' },
    { path: '/student-login', label: 'Student Report', icon: 'fa-file-alt' },
    { path: '/school-fee', label: 'School Fee', icon: 'fa-money-bill-wave' },
    { path: '/gallery', label: 'Gallery', icon: 'fa-images' },
    { path: '/announcements', label: 'Announcements', icon: 'fa-bullhorn' },
    { path: '/necta-results', label: 'NECTA Results', icon: 'fa-certificate' },
    { path: '/contact', label: 'Contact', icon: 'fa-envelope' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Close menu when clicking outside
  const handleOverlayClick = () => {
    setMobileMenuOpen(false);
  };

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prefetch likely next pages on hover for faster navigation (fast-loading plan)
  const getPrefetchHandler = (path) => {
    if (path === '/gallery') return () => { import('../../pages/public/Gallery'); };
    if (path === '/student-login') return () => { import('../../pages/public/StudentLogin'); };
    return undefined;
  };

  return (
    <header className="header">
      <div className="header-content">
        {/* School Branding Section */}
        <div className="school-branding">
          <div className="school-info">
            {/* School Crest/Logo - Left */}
            <div className="school-crest">
              {schoolLogo ? (
                <img 
                  src={getImageUrl(schoolLogo)} 
                  alt="Arusha Catholic Seminary official school logo" 
                  className="school-logo-img" 
                  loading="eager"
                  fetchpriority="high"
                />
              ) : (
                <i className="fas fa-school"></i>
              )}
            </div>

            {/* School Name - Center */}
            <h1>{schoolName}</h1>

            {/* Patron Saint - Right */}
            <div className="patron-saint">
              {patronSaintImage ? (
                <img 
                  src={getImageUrl(patronSaintImage)} 
                  alt="Patron saint image of Arusha Catholic Seminary" 
                  className="school-logo-img" 
                  loading="eager"
                  fetchpriority="high"
                />
              ) : (
                <>
                  <i className="fas fa-user-circle"></i>
                  <span className="saint-label">Patron Saint</span>
                </>
              )}
            </div>

            {/* Tagline */}
            <p className="tagline">{tagline}</p>

            {/* Banner Text */}
            <div className="banner">{bannerText}</div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="navigation">
          <div className="nav-container">
            {/* Desktop: inline nav. Mobile: toggle/overlay/panel portaled to body so always at viewport top */}
            {isMobile ? (
              createPortal(
                <>
                  <button
                    className="mobile-menu-toggle"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                    aria-expanded={mobileMenuOpen}
                  >
                    <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
                    <span className="menu-toggle-text">{mobileMenuOpen ? 'Close' : 'Menu'}</span>
                  </button>
                  {mobileMenuOpen && (
                    <div
                      className="mobile-menu-overlay"
                      onClick={handleOverlayClick}
                      aria-hidden="true"
                    />
                  )}
                  <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                    {navigationItems.map((item) => (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          className={isActive(item.path) ? 'active' : ''}
                          onClick={() => setMobileMenuOpen(false)}
                          onMouseEnter={getPrefetchHandler(item.path)}
                        >
                          <i className={`fas ${item.icon}`}></i>
                          <span className="nav-link-text">{item.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>,
                document.getElementById('fixed-ui-root') || document.body
              )
            ) : (
              <>
                <button
                  className="mobile-menu-toggle"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Toggle menu"
                  aria-expanded={mobileMenuOpen}
                >
                  <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
                  <span className="menu-toggle-text">{mobileMenuOpen ? 'Close' : 'Menu'}</span>
                </button>
                {mobileMenuOpen && (
                  <div
                    className="mobile-menu-overlay"
                    onClick={handleOverlayClick}
                    aria-hidden="true"
                  />
                )}
                <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                  {navigationItems.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={isActive(item.path) ? 'active' : ''}
                        onClick={() => setMobileMenuOpen(false)}
                        onMouseEnter={getPrefetchHandler(item.path)}
                      >
                        <i className={`fas ${item.icon}`}></i>
                        <span className="nav-link-text">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default PublicHeader;
