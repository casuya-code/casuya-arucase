/**
 * Student Life Page - Full Content from Python Template
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './StudentLife.css';

const StudentLife = () => {
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'student_life'],
    queryFn: () => publicAPI.getPage('student_life'),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const fallbackContent = (
    <div className="student-life-page">
      <Link to="/" className="home-button">
        <i className="fas fa-home"></i> Back to Home
      </Link>

      <div className="content-card">
        <h2>Student Life</h2>
        
        <h3>Daily Schedule</h3>
        <p>
          Life at the seminary follows a structured daily routine that balances prayer, study, 
          work, and recreation:
        </p>
        <ul>
          <li><strong>5:30 AM:</strong> Morning Prayer and Mass</li>
          <li><strong>7:00 AM:</strong> Breakfast</li>
          <li><strong>8:00 AM - 1:00 PM:</strong> Classes</li>
          <li><strong>1:00 PM:</strong> Lunch</li>
          <li><strong>2:00 PM - 4:00 PM:</strong> Personal Study/Activities</li>
          <li><strong>4:00 PM - 6:00 PM:</strong> Sports and Recreation</li>
          <li><strong>6:30 PM:</strong> Dinner</li>
          <li><strong>7:30 PM:</strong> Evening Study</li>
          <li><strong>9:00 PM:</strong> Night Prayer</li>
          <li><strong>10:00 PM:</strong> Lights Out</li>
        </ul>

        <h3>Spiritual Life</h3>
        <p>Spiritual formation is at the heart of seminary life:</p>
        <ul>
          <li>Daily Mass and Eucharistic Adoration</li>
          <li>Morning and Evening Prayer</li>
          <li>Weekly Confession</li>
          <li>Spiritual direction and counseling</li>
          <li>Retreats and recollections</li>
        </ul>

        <h3>Extra-Curricular Activities</h3>
        <ul>
          <li>Choir and music ministry</li>
          <li>Sports (football, volleyball, basketball)</li>
          <li>Drama and theater</li>
          <li>Debate club</li>
          <li>Environmental conservation</li>
          <li>Community service projects</li>
        </ul>

        <h3>Facilities</h3>
        <ul>
          <li>Chapel and prayer spaces</li>
          <li>Well-equipped classrooms</li>
          <li>Library and computer lab</li>
          <li>Sports fields and courts</li>
          <li>Dormitories</li>
          <li>Dining hall</li>
          <li>Medical center</li>
        </ul>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Loading student life page..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);

  return (
    <PublicLayout>
      {hasCustomContent ? (
        <div className="student-life-page">
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

export default StudentLife;
