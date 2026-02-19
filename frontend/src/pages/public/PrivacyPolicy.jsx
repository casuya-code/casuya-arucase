/**
 * Privacy Policy Page - Content from server (public_pages) or static fallback
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'privacy'],
    queryFn: () => publicAPI.getPage('privacy'),
    retry: false,
    staleTime: 30 * 60 * 1000,
  });

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Loading privacy policy..." />
      </PublicLayout>
    );
  }

  if (hasCustomContent) {
    return (
      <PublicLayout>
        <div className="privacy-policy-page">
          <div className="header">
            <h1><i className="fas fa-shield-alt"></i> Privacy Policy</h1>
          </div>
          <div className="container">
            <div className="policy-card" dangerouslySetInnerHTML={{ __html: page.html_content || page.content || '' }} />
            <div className="back-button-container">
              <Link to="/" className="back-button">
                <i className="fas fa-arrow-left"></i> Back to Homepage
              </Link>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="privacy-policy-page">
        <div className="header">
          <h1><i className="fas fa-shield-alt"></i> Privacy Policy</h1>
          <p>Last Updated: October 13, 2025</p>
        </div>

        <div className="container">
          <div className="policy-card">
            <h2>Introduction</h2>
            <p>
              Welcome to Arusha Catholic Seminary's website. We are committed to protecting your privacy 
              and ensuring the security of your personal information. This Privacy Policy explains how we 
              collect, use, and safeguard your data when you visit our website.
            </p>
            
            <div className="highlight-box">
              <strong>Our Commitment:</strong> We respect your privacy and are dedicated to protecting 
              your personal data in accordance with applicable privacy laws and regulations.
            </div>
          </div>

          <div className="policy-card">
            <h2>Information We Collect</h2>
            
            <h3>1. Information You Provide</h3>
            <p>When you interact with our website, we may collect:</p>
            <ul>
              <li><strong>Contact Information:</strong> Name, email address, phone number (when you submit contact forms)</li>
              <li><strong>Alumni Registration:</strong> Name, graduation year, profession, testimonials</li>
              <li><strong>Testimony Submissions:</strong> Name, message, and optional contact details</li>
              <li><strong>Event Registration:</strong> Name and contact information for school events</li>
            </ul>

            <h3>2. Automatically Collected Information</h3>
            <p>When you visit our website, we automatically collect:</p>
            <ul>
              <li><strong>Visit Statistics:</strong> Daily, weekly, and total visitor counts</li>
              <li><strong>IP Address:</strong> For security and analytics purposes</li>
              <li><strong>Browser Information:</strong> Type and version of your web browser</li>
              <li><strong>Device Information:</strong> Type of device you're using</li>
              <li><strong>Page Views:</strong> Which pages you visit and how long you stay</li>
              <li><strong>Referrer:</strong> The website you came from</li>
            </ul>

            <h3>3. Internal System Users</h3>
            <p>For staff and authenticated users:</p>
            <ul>
              <li><strong>Login Credentials:</strong> Username and encrypted password</li>
              <li><strong>Activity Logs:</strong> Pages accessed, actions performed, timestamps</li>
              <li><strong>User Role:</strong> Admin or Teacher designation</li>
              <li><strong>Session Data:</strong> For maintaining your logged-in state</li>
            </ul>
          </div>

          <div className="policy-card">
            <h2>How We Use Your Information</h2>
            <p>We use the collected information for:</p>
            <ul>
              <li><strong>Website Operation:</strong> To provide and improve our website services</li>
              <li><strong>Communication:</strong> To respond to your inquiries and requests</li>
              <li><strong>Alumni Network:</strong> To maintain our alumni directory</li>
              <li><strong>Analytics:</strong> To understand visitor behavior and improve user experience</li>
              <li><strong>Security:</strong> To protect against unauthorized access and fraud</li>
              <li><strong>Event Management:</strong> To organize and communicate about school events</li>
              <li><strong>System Administration:</strong> To monitor and manage internal operations</li>
            </ul>
          </div>

          <div className="policy-card">
            <h2>Data Storage and Security</h2>
            <p>We take the security of your data seriously:</p>
            <ul>
              <li><strong>Secure Storage:</strong> All data is stored in encrypted databases</li>
              <li><strong>Password Protection:</strong> All passwords are encrypted using industry-standard hashing</li>
              <li><strong>Access Control:</strong> Only authorized staff can access personal information</li>
              <li><strong>Regular Backups:</strong> Data is regularly backed up to prevent loss</li>
              <li><strong>Secure Connections:</strong> We use secure protocols for data transmission</li>
            </ul>
          </div>

          <div className="policy-card">
            <h2>Activity Tracking</h2>
            <p>Our website tracks user activities for administrative and security purposes:</p>
            <ul>
              <li><strong>Guest Visitors:</strong> We log public page views, IP addresses, and timestamps</li>
              <li><strong>Authenticated Users:</strong> We track page access, data modifications, and system interactions</li>
              <li><strong>Purpose:</strong> Security monitoring, usage analytics, and system improvement</li>
              <li><strong>Retention:</strong> Activity logs are retained indefinitely for security audit purposes</li>
            </ul>
            
            <div className="highlight-box">
              <strong>Note:</strong> Activity tracking helps us ensure system security, prevent unauthorized 
              access, and improve user experience. All tracking is done in compliance with applicable laws.
            </div>
          </div>

          <div className="policy-card">
            <h2>Cookies and Tracking Technologies</h2>
            <p>Our website uses:</p>
            <ul>
              <li><strong>Session Cookies:</strong> To maintain your logged-in state</li>
              <li><strong>Preference Cookies:</strong> To remember your settings (e.g., language preference)</li>
              <li><strong>Analytics:</strong> To track visitor statistics</li>
              <li><strong>PWA Storage:</strong> For Progressive Web App offline functionality</li>
            </ul>
          </div>

          <div className="policy-card">
            <h2>Third-Party Services</h2>
            <p>We may use the following third-party services:</p>
            <ul>
              <li><strong>Font Awesome:</strong> For icons and visual elements</li>
              <li><strong>Social Media Links:</strong> Links to our YouTube, Facebook, Instagram</li>
            </ul>
            <p>
              These services may have their own privacy policies. We do not control and are not responsible 
              for the privacy practices of third parties.
            </p>
          </div>

          <div className="policy-card">
            <h2>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data we hold</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Opt-Out:</strong> Choose not to receive communications from us</li>
              <li><strong>Withdraw Consent:</strong> Withdraw your consent for data processing</li>
            </ul>
            <p>To exercise these rights, please contact us at: <strong>arucase@gmail.com</strong></p>
          </div>

          <div className="policy-card">
            <h2>Children's Privacy</h2>
            <p>
              As an educational institution, we may collect information about students for educational purposes. 
              We are committed to protecting the privacy of minors and comply with applicable laws regarding 
              children's privacy.
            </p>
            <p>
              Parents and guardians have the right to review, correct, or delete their child's personal 
              information by contacting the school administration.
            </p>
          </div>

          <div className="policy-card">
            <h2>Data Retention</h2>
            <p>We retain your personal data for as long as necessary to:</p>
            <ul>
              <li>Provide our services</li>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes</li>
              <li>Maintain academic records (for students and alumni)</li>
            </ul>
            <p>
              Activity logs and visitor statistics are retained indefinitely for security and analytical purposes.
            </p>
          </div>

          <div className="policy-card">
            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
            <p>We encourage you to review this Privacy Policy periodically for any changes.</p>
          </div>

          <div className="policy-card">
            <h2>Contact Us</h2>
            <p>If you have any questions about this Privacy Policy or our data practices, please contact us:</p>
            <ul>
              <li><strong>Email:</strong> arucase@gmail.com</li>
              <li><strong>Phone:</strong> +255 754 926 022</li>
              <li><strong>Address:</strong> Arusha Catholic Seminary, Arusha, Tanzania</li>
            </ul>
          </div>

          <div className="back-button-container">
            <Link to="/" className="back-button">
              <i className="fas fa-arrow-left"></i> Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default PrivacyPolicy;

