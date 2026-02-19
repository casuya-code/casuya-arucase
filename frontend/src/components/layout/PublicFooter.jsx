import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicAPI } from '../../services/public';
import './PublicFooter.css';

const PublicFooter = () => {
  const { data: homepageData } = useQuery({
    queryKey: ['homepage'],
    queryFn: () => publicAPI.getHomepage(),
    select: (res) => res.data,
    staleTime: 10 * 60 * 1000,
  });

  const { data: visitorStats } = useQuery({
    queryKey: ['visitor-stats'],
    queryFn: () => publicAPI.getVisitorStats(),
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const settings = homepageData?.settings || {};
  const contactEmail = settings?.contact_email || 'info@arushacatholicseminary.co.tz';
  const contactWhatsapp = settings?.contact_whatsapp || '255123456789';
  const socialLocation = settings?.social_location || 'https://maps.google.com/?q=Arusha+Catholic+Seminary+Tanzania';
  
  const socialFacebook = settings?.social_facebook || 'https://facebook.com/arushacatholicseminary';
  const socialInstagram = settings?.social_instagram || 'https://instagram.com/arushacatholicseminary';
  const socialYoutube = settings?.social_youtube || 'https://youtube.com/@arushacatholicseminary';

  // Format WhatsApp number (remove + and spaces)
  const whatsappNumber = contactWhatsapp.replace(/[+\s]/g, '');
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;

  const stats = visitorStats?.stats || {
    daily: 0,
    weekly: 0,
    total: 0
  };

  // Map backend stats to frontend format
  const displayStats = {
    daily: stats.today || 0,
    weekly: stats.week || 0,
    total: stats.total || 0
  };

  return (
    <>
      {/* Social Media Footer */}
      <footer className="social-footer">
        <div className="social-footer-content">
          <span className="social-label">Connect With Us</span>
          <div className="social-icons">
            <a 
              href={socialYoutube} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="youtube" 
              title="YouTube"
            >
              <i className="fab fa-youtube"></i>
            </a>
            <a 
              href={socialFacebook} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="facebook" 
              title="Facebook"
            >
              <i className="fab fa-facebook-f"></i>
            </a>
            <a 
              href={socialInstagram} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="instagram" 
              title="Instagram"
            >
              <i className="fab fa-instagram"></i>
            </a>
            <a 
              href={`mailto:${contactEmail}`} 
              className="email" 
              title="Email"
            >
              <i className="fas fa-envelope"></i>
            </a>
            <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="whatsapp" 
              title="WhatsApp"
            >
              <i className="fab fa-whatsapp"></i>
            </a>
            <a 
              href={socialLocation} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="location" 
              title="Our Location"
            >
              <i className="fas fa-map-marker-alt"></i>
            </a>
          </div>
        </div>
      </footer>

      {/* Copyright Footer */}
      <footer className="copyright-footer">
        <div className="copyright-footer-container">
          <p className="copyright-text">
            &copy; <span id="current-year">2026</span> Arusha Catholic Seminary. All rights reserved.
            {' '}
            <Link to="/privacy-policy" className="privacy-link">
              Privacy Policy
            </Link>
          </p>
          <p className="visitor-stats">
            <span className="visitor-label">Visitors:</span>
            <span className="visitor-value">Today: {displayStats.daily}</span>
            <span className="footer-separator">|</span>
            <span className="visitor-value">This Week: {displayStats.weekly}</span>
            <span className="footer-separator">|</span>
            <span className="visitor-total">Total: {displayStats.total}</span>
          </p>
        </div>
      </footer>
    </>
  );
};

export default PublicFooter;
