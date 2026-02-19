/**
 * Announcements Page - Data from server (publicAPI.getAnnouncements)
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { publicAPI } from '../../services/public';
import './About.css';

const Announcements = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-announcements'],
    queryFn: () => publicAPI.getAnnouncements(50),
    select: (res) => res.data?.announcements || [],
    staleTime: 5 * 60 * 1000,
  });

  const announcements = data || [];

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="about-page">
          <Link to="/" className="home-button">
            <i className="fas fa-home"></i> Back to Home
          </Link>
          <div className="content-card">
            <SkeletonLoader type="text" lines={1} width="40%" height="2rem" className="mb-3" />
            <SkeletonLoader type="text" lines={2} />
            <div style={{ marginTop: '1.5rem' }}>
              {[1, 2, 3].map((i) => (
                <SkeletonLoader key={i} type="card" height="80px" className="mb-3" />
              ))}
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="about-page">
        <Link to="/" className="home-button">
          <i className="fas fa-home"></i> Back to Home
        </Link>

        <div className="content-card">
          <h1>Announcements</h1>
          <p>Latest news and announcements from Arusha Catholic Seminary.</p>

          {isError ? (
            <p className="text-muted">Unable to load announcements at this time. Please try again later.</p>
          ) : announcements.length === 0 ? (
            <p className="text-muted">No announcements at the moment. Check back later.</p>
          ) : (
            <ul className="announcements-list" style={{ listStyle: 'none', padding: 0 }}>
              {announcements.map((ann) => (
                <li key={ann.id} style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #eee' }}>
                  <strong>{ann.title || 'Announcement'}</strong>
                  {ann.created_at ? (
                    <span style={{ color: '#666', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                      {new Date(ann.created_at).toLocaleDateString()}
                    </span>
                  ) : null}
                  {ann.content ? (
                    <div style={{ marginTop: '0.5rem' }} dangerouslySetInnerHTML={{ __html: ann.content }} />
                  ) : ann.body ? (
                    <p style={{ marginTop: '0.5rem' }}>{ann.body}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default Announcements;
