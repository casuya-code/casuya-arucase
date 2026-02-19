/**
 * Loading Component - Optimized for better UX
 * Shows minimal, non-intrusive loading indicator
 * For better UX, prefer SkeletonLoader for content areas
 */
import PropTypes from 'prop-types';
import SkeletonLoader from './SkeletonLoader';

const Loading = ({ message = 'Loading...', minimal = false, skeleton = false, skeletonType = 'default' }) => {
  // Use skeleton loader for better perceived performance
  if (skeleton) {
    return <SkeletonLoader type={skeletonType} />;
  }
  
  // Minimal loading indicator (less intrusive)
  if (minimal) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        gap: '0.5rem'
      }}>
        <div className="spinner-mini" style={{
          width: '20px',
          height: '20px',
          border: '2px solid #f3f3f3',
          borderTop: '2px solid #1a5490',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}></div>
        {message && <span style={{ color: '#666', fontSize: '13px' }}>{message}</span>}
      </div>
    );
  }
  
  // Full loading (for initial page loads only)
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '40vh', // Reduced from 50vh
      gap: '1rem',
      padding: '2rem'
    }}>
      <div className="spinner" style={{
        width: '32px', // Smaller spinner
        height: '32px',
        border: '3px solid #f3f3f3',
        borderTop: '3px solid #1a5490',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite' // Faster animation
      }}></div>
      {message && <p style={{ color: '#666', fontSize: '14px', marginTop: '0.5rem' }}>{message}</p>}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

Loading.propTypes = {
  message: PropTypes.string,
  minimal: PropTypes.bool,
  skeleton: PropTypes.bool,
  skeletonType: PropTypes.string,
};

export default Loading;

