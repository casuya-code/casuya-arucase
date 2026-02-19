/**
 * Admissions Page - Full Content from Python Template
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './Admissions.css';

const Admissions = () => {
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'admissions'],
    queryFn: () => publicAPI.getPage('admissions'),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const { data: settings } = useQuery({
    queryKey: ['homepage'],
    queryFn: () => publicAPI.getHomepage(),
    select: (res) => res.data?.settings,
    staleTime: 10 * 60 * 1000,
  });

  const fallbackContent = (
    <div className="admissions-page">
      <Link to="/" className="home-button">
        <i className="fas fa-home"></i> Back to Home
      </Link>

      <div className="content-card">
        <h1>Admissions</h1>
        
        <h2>Admission Requirements</h2>
        <p>
          Arusha Catholic Seminary welcomes young men who demonstrate a genuine interest in pursuing 
          their vocation and academic excellence. The following are our admission requirements:
        </p>

        <ul>
          <li>Baptismal certificate from a Catholic Church</li>
          <li>Academic transcripts from previous schools</li>
          <li>Letter of recommendation from parish priest</li>
          <li>Medical examination certificate</li>
          <li>Birth certificate or valid identification</li>
          <li>Passport-sized photographs (4 copies)</li>
        </ul>

        <h2>Application Process</h2>
        <p><strong>Answer:</strong> To apply to Arusha Catholic Seminary, follow these 6 steps:</p>
        <ol>
          <li><strong>Obtain Application Form:</strong> Download or collect from the seminary office</li>
          <li><strong>Complete Application:</strong> Fill out all required information accurately</li>
          <li><strong>Submit Documents:</strong> Submit all required documents with your application</li>
          <li><strong>Entrance Examination:</strong> Attend the scheduled entrance examination</li>
          <li><strong>Interview:</strong> Participate in an interview with the admissions committee</li>
          <li><strong>Admission Decision:</strong> Receive notification of admission status</li>
        </ol>

        <h2>Important Dates</h2>
        <ul>
          <li><strong>Application Period:</strong> January - March</li>
          <li><strong>Entrance Examinations:</strong> April</li>
          <li><strong>Interviews:</strong> May</li>
          <li><strong>Admission Letters:</strong> June</li>
          <li><strong>Orientation:</strong> Late June</li>
          <li><strong>Academic Year Begins:</strong> July</li>
        </ul>

        <h3>Contact Admissions Office</h3>
        <p>
          For more information about admissions, please contact:<br />
          <strong>Email:</strong>{' '}
          <a href={`mailto:${settings?.contact_email || 'info@arushacatholicseminary.co.tz'}`} className="contact-link">
            {settings?.contact_email || 'info@arushacatholicseminary.co.tz'}
          </a>
          <br />
          <strong>Phone:</strong>{' '}
          <a href={`tel:${settings?.contact_phone || '+255 123 456 789'}`} className="contact-link">
            {settings?.contact_phone || '+255 123 456 789'}
          </a>
        </p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Loading admissions page..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);

  return (
    <PublicLayout>
      {hasCustomContent ? (
        <div className="admissions-page">
          <Link to="/" className="home-button">
            <i className="fas fa-home"></i> Back to Home
          </Link>
          <div 
            className="content-card"
            dangerouslySetInnerHTML={{ __html: page.html_content || page.content || '' }}
          />
        </div>
      ) : (
        fallbackContent
      )}
    </PublicLayout>
  );
};

export default Admissions;
