/**
 * Skeleton Loader Component
 * Shows content placeholders instead of spinners for better UX
 * Optimized for 3G-4G networks - makes users feel content is loading faster
 */

const SkeletonLoader = ({ 
  type = 'default', 
  lines = 3, 
  width = '100%',
  height,
  className = '' 
}) => {
  const baseClass = `skeleton-loader ${className}`;
  
  switch (type) {
    case 'text':
      return (
        <div className={baseClass} style={{ width }}>
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="skeleton-line"
              style={{
                width: i === lines - 1 ? '60%' : '100%',
                height: height || '1rem',
                marginBottom: i < lines - 1 ? '0.75rem' : '0',
              }}
            />
          ))}
        </div>
      );
    
    case 'card':
      return (
        <div className={`${baseClass} skeleton-card`} style={{ width, height }}>
          <div className="skeleton-line" style={{ width: '40%', height: '1.5rem', marginBottom: '1rem' }} />
          <div className="skeleton-line" style={{ width: '100%', height: '1rem', marginBottom: '0.5rem' }} />
          <div className="skeleton-line" style={{ width: '80%', height: '1rem' }} />
        </div>
      );
    
    case 'image':
      return (
        <div className={`${baseClass} skeleton-image`} style={{ width, height: height || '200px' }} />
      );
    
    case 'gallery':
      return (
        <div className={`${baseClass} skeleton-gallery`} style={{ width }}>
          <div className="skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-image" style={{ aspectRatio: '1/1' }} />
            ))}
          </div>
        </div>
      );
    
    case 'table':
      return (
        <div className={`${baseClass} skeleton-table`} style={{ width }}>
          <div className="skeleton-line" style={{ width: '100%', height: '2rem', marginBottom: '1rem' }} />
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="skeleton-line" style={{ width: '100%', height: '3rem', marginBottom: '0.5rem' }} />
          ))}
        </div>
      );
    
    default:
      return (
        <div className={baseClass} style={{ width, height: height || '1rem' }}>
          <div className="skeleton-line" style={{ width: '100%', height: height || '1rem' }} />
        </div>
      );
  }
};

export default SkeletonLoader;
