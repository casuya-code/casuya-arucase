/**
 * About Page - Full Content from Python Template
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './About.css';

const About = () => {
  // Try to fetch page content from database, but have fallback content
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'about'],
    queryFn: () => publicAPI.getPage('about'),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  // Fallback content from Python template
  const fallbackContent = (
    <div className="about-page">
      <Link to="/" className="home-button">
        <i className="fas fa-home"></i> Back to Home
      </Link>

      <div className="content-card">
        <h1>About Arusha Catholic Seminary</h1>
        
        <p>
          <strong>Answer:</strong> Arusha Catholic Seminary is a premier Catholic secondary school 
          established in 1967 in Oldonyosambu, Tanzania. We provide quality Catholic education and 
          spiritual formation to young men aspiring to serve the Church and society.
        </p>
        
        <h2>Our History</h2>
        <p>
          Arusha Catholic Seminary was established in <strong>1967</strong> with a mission to provide 
          quality Catholic education and spiritual formation to young men aspiring to serve the Church 
          and society. For over <strong>five decades</strong>, we have been nurturing minds and souls 
          in the heart of Tanzania.
        </p>

        <h2>Our Mission</h2>
        <p>
          <strong>Answer:</strong> To form young men into spiritually mature, academically excellent, 
          and morally upright individuals who will serve as future leaders in the Catholic Church and 
          society at large.
        </p>

        <h2>Our Vision</h2>
        <p>
          <strong>Answer:</strong> To be a center of excellence in Catholic seminary education, 
          producing well-rounded individuals who embody the values of faith, knowledge, and service.
        </p>

        <h2>Core Values</h2>
        <ul>
          <li><strong>Faith:</strong> Deepening relationship with God through prayer and sacraments</li>
          <li><strong>Academic Excellence:</strong> Pursuing knowledge with dedication and integrity</li>
          <li><strong>Discipline:</strong> Cultivating self-control and responsibility</li>
          <li><strong>Service:</strong> Serving God and humanity with humility and love</li>
          <li><strong>Community:</strong> Building brotherhood and unity among seminarians</li>
        </ul>

        <h3>Our Patron</h3>
        <p>
          The seminary is placed under the patronage of Saint Thomas Aquinas.
        </p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Loading about page..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);

  return (
    <PublicLayout>
      {hasCustomContent ? (
        <div className="about-page">
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

export default About;
