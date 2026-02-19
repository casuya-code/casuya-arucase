/**
 * Contact Page - Full Content from Python Template
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './Contact.css';

const Contact = () => {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['homepage'],
    queryFn: () => publicAPI.getHomepage(),
    select: (res) => res.data?.settings,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Loading contact page..." />
      </PublicLayout>
    );
  }

  const contactAddress = settings?.contact_address || 'Arusha Catholic Seminary, P.O. Box 1234, Arusha, Tanzania';
  const contactPhone = settings?.contact_phone || '+255 123 456 789';
  const contactEmail = settings?.contact_email || 'info@arushacatholicseminary.co.tz';
  const contactWhatsapp = settings?.contact_whatsapp || '+255 123 456 789';
  const whatsappNumber = contactWhatsapp.replace(/[+\s]/g, '');
  const socialLocation = settings?.social_location || 'https://maps.google.com/?q=Arusha+Catholic+Seminary+Tanzania';
  const socialFacebook = settings?.social_facebook || 'https://facebook.com/arushacatholicseminary';
  const socialInstagram = settings?.social_instagram || 'https://instagram.com/arushacatholicseminary';
  const socialYoutube = settings?.social_youtube || 'https://youtube.com/@arushacatholicseminary';

  return (
    <PublicLayout>
      <div className="contact-page">
        <Link to="/" className="home-button">
          <i className="fas fa-home"></i> Back to Home
        </Link>

        <div className="content-card">
          <h2>Contact Us</h2>
          
          <h3>Get in Touch</h3>
          <p>
            We welcome inquiries from prospective students, parents, alumni, and friends of the seminary. 
            Please feel free to reach out to us through any of the following channels:
          </p>

          <h3>Contact Information</h3>
          <div className="contact-info-box">
            <p>
              <i className="fas fa-map-marker-alt"></i>
              <strong>Address:</strong><br />
              {contactAddress.split('\n').map((line, idx) => (
                <span key={idx}>{line}<br /></span>
              ))}
            </p>
            
            <p>
              <i className="fas fa-phone"></i>
              <strong>Phone:</strong>{' '}
              <a href={`tel:${contactPhone}`}>{contactPhone}</a>
            </p>
            
            <p>
              <i className="fas fa-envelope"></i>
              <strong>Email:</strong>{' '}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </p>
            
            <p>
              <i className="fab fa-whatsapp contact-whatsapp-icon"></i>
              <strong>WhatsApp:</strong>{' '}
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                {contactWhatsapp}
              </a>
            </p>
          </div>

          <h3>Office Hours</h3>
          <ul>
            <li><strong>Monday - Friday:</strong> 8:00 AM - 4:00 PM</li>
            <li><strong>Saturday:</strong> 9:00 AM - 12:00 PM (Parents' Days)</li>
            <li><strong>Sunday:</strong> Closed</li>
            <li><strong>Public Holidays:</strong> Closed</li>
          </ul>

          <h3>Department Contacts</h3>
          <ul>
            <li><strong>Admissions:</strong> admissions@arushacatholicseminary.co.tz</li>
            <li><strong>Academic Affairs:</strong> academics@arushacatholicseminary.co.tz</li>
            <li><strong>Bursar (Fees):</strong> bursar@arushacatholicseminary.co.tz</li>
            <li><strong>Alumni Relations:</strong> alumni@arushacatholicseminary.co.tz</li>
            <li><strong>Parents' Office:</strong> parents@arushacatholicseminary.co.tz</li>
          </ul>

          <h3>Visit Us</h3>
          <p>
            Visitors are welcome to tour our campus by appointment. Please contact us in advance 
            to schedule a visit. Our campus is open for tours during office hours.
          </p>

          <h3>Directions</h3>
          <p>
            The seminary is located in Arusha, Tanzania. For detailed directions, please use the 
            map below or contact our office.
          </p>

          <div className="map-button-container">
            <a href={socialLocation} target="_blank" rel="noopener noreferrer" className="map-button">
              <i className="fas fa-map-marked-alt"></i> Get Directions on Google Maps
            </a>
          </div>

          <h3>Follow Us on Social Media</h3>
          <p>Stay updated with seminary news and events by following us on:</p>
          <div className="social-links">
            <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="social-link-facebook">
              <i className="fab fa-facebook-f"></i> Facebook
            </a>
            <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="social-link-instagram">
              <i className="fab fa-instagram"></i> Instagram
            </a>
            <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="social-link-youtube">
              <i className="fab fa-youtube"></i> YouTube
            </a>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Contact;

