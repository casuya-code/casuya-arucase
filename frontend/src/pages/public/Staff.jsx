/**
 * Staff Page - Full Content from Python Template
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './Staff.css';

const Staff = () => {
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'staff'],
    queryFn: () => publicAPI.getPage('staff'),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const fallbackContent = (
    <div className="staff-page">
      <Link to="/" className="home-button">
        <i className="fas fa-home"></i> Back to Home
      </Link>

      <div className="content-card">
        <h2>Our Staff</h2>
        
        <h3>Administration</h3>
        <p>
          The seminary is led by a dedicated team of clergy and lay staff committed to the 
          holistic formation of our students.
        </p>

        <h3>Academic Staff</h3>
        <p>
          Our teaching staff consists of qualified and experienced educators, many holding 
          advanced degrees in their respective fields. They are dedicated to academic excellence 
          and the spiritual formation of our students.
        </p>

        <h3>Formation Team</h3>
        <p>
          The formation team comprises priests and religious who guide students in their spiritual 
          journey, helping them discern their vocation and grow in their faith.
        </p>

        <h3>Support Staff</h3>
        <p>Our support staff ensures the smooth running of daily operations, including:</p>
        <ul>
          <li>Maintenance and facilities management</li>
          <li>Kitchen and dining services</li>
          <li>Library and resource center</li>
          <li>Administrative support</li>
          <li>Health and medical services</li>
        </ul>

        <h3>Staff Development</h3>
        <p>
          The seminary is committed to continuous professional development for all staff members, 
          ensuring they remain current with best practices in education and formation.
        </p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Loading staff page..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);

  return (
    <PublicLayout>
      {hasCustomContent ? (
        <div className="staff-page">
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

export default Staff;
