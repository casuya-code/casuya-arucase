/**
 * Homepage - Full Functionality with API Integration
 * Note: Announcements and Gallery sections have been removed from homepage
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import PublicLayout from '../../components/layout/PublicLayout';
import { publicAPI } from '../../services/public';
import './HomePage.css';

const HomePage = () => {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [failedImages, setFailedImages] = useState(new Set());
  
  // Helper function to resolve image URLs (moved to top to avoid reference error)
  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    
    // Remove leading slash if present
    let cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Handle different path formats:
    // 1. Full path: "uploads/photos/filename.jpg" -> "/static/uploads/photos/filename.jpg"
    // 2. Just filename: "filename.jpg" -> "/static/uploads/photos/filename.jpg"
    // 3. Already has static/: "static/uploads/photos/filename.jpg" -> "/static/uploads/photos/filename.jpg"
    
    let resolvedUrl;
    if (cleanPath.startsWith('static/')) {
      // Already has static/ prefix
      resolvedUrl = `/${cleanPath}`;
    } else if (cleanPath.startsWith('uploads/')) {
      // Has uploads/ prefix, add static/
      resolvedUrl = `/static/${cleanPath}`;
    } else {
      // Just filename, assume it's in uploads/photos/
      resolvedUrl = `/static/uploads/photos/${cleanPath}`;
    }
    
    return resolvedUrl;
  };
  
  // Fetch homepage data
  const { data, isLoading, error } = useQuery({
    queryKey: ['homepage'],
    queryFn: async () => {
      try {
        const res = await publicAPI.getHomepage();
        // Axios returns { data: {...}, status: 200, ... }; use res.data
        return res.data;
      } catch (err) {
        // Handle errors gracefully
        console.error('Error fetching homepage data:', err);
        // Return empty data structure to prevent crashes
        return {
          settings: {},
          gallery_photos: [],
          faqs: [],
          administrators: [],
          announcements: []
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    retryOnMount: false,
    refetchOnWindowFocus: false
  });

  // Extract the actual data - handle both direct data and nested data.data (Axios response)
  // If data has 'data' property (Axios response), use data.data, otherwise use data directly
  const actualData = (data && typeof data === 'object' && 'data' in data && !Array.isArray(data)) 
    ? data.data 
    : data || {};
  
  const { settings, gallery_photos, faqs, administrators, announcements } = actualData;

  // Filter out failed images from carousel
  const validGalleryPhotos = gallery_photos?.filter(photo => {
    const imageUrl = getImageUrl(photo.path);
    return !failedImages.has(imageUrl);
  }) || [];

  // Handle image load errors in carousel
  const handleImageError = (imageUrl) => {
    if (imageUrl) {
      setFailedImages(prev => new Set([...prev, imageUrl]));
    }
  };

  // Get rector statement from settings or use default
  const rectorStatement = settings?.rector_statement || 
    '"Let us make Our Seminary Great and Green Again" - Father Moses Peter Assey - The Rector';

  // Auto-rotate carousel (with error handling)
  useEffect(() => {
    if (!validGalleryPhotos || validGalleryPhotos.length === 0) return;
    
    try {
      const interval = setInterval(() => {
        try {
          setCarouselIndex((prev) => {
            const maxIndex = Math.min(validGalleryPhotos.length, 10) - 1;
            return prev >= maxIndex ? 0 : prev + 1;
          });
        } catch (err) {
          console.error('Error updating carousel index:', err);
        }
      }, 4000); // Change image every 4 seconds

      return () => {
        try {
          clearInterval(interval);
        } catch (err) {
          // Silently handle cleanup errors
        }
      };
    } catch (err) {
      console.error('Error setting up carousel rotation:', err);
    }
  }, [validGalleryPhotos]);

  return (
    <PublicLayout>
      <div className="homepage">
        {/* Hero Section with Carousel */}
        <section className="main-content">
          {/* Carousel Background */}
          <div className="hero-carousel">
            {isLoading && validGalleryPhotos.length === 0 ? (
              <SkeletonLoader type="image" height="400px" />
            ) : validGalleryPhotos && validGalleryPhotos.length > 0 ? (
              <>
                <div className="carousel-wrapper">
                  {validGalleryPhotos.slice(0, Math.min(10, validGalleryPhotos.length)).map((photo, index) => {
                    const imageUrl = getImageUrl(photo.path);
                    const isActive = index === carouselIndex;
                    return (
                      <div
                        key={photo.id || index}
                        className={`carousel-slide ${isActive ? 'active' : ''}`}
                        style={{
                          backgroundImage: imageUrl ? `url("${imageUrl}")` : 'none',
                          backgroundColor: imageUrl ? 'transparent' : 'transparent',
                        }}
                        onError={() => handleImageError(imageUrl)}
                      >
                        {/* Preload image to check if it exists - dimensions hint to reduce layout shift */}
                        <img
                          src={imageUrl}
                          alt=""
                          width={1200}
                          height={600}
                          style={{ display: 'none' }}
                          onError={() => handleImageError(imageUrl)}
                          onLoad={() => {
                            // Image loaded successfully, remove from failed set if it was there
                            setFailedImages(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(imageUrl);
                              return newSet;
                            });
                          }}
                        />
                        <div className="carousel-overlay"></div>
                      </div>
                    );
                  })}
                </div>
                {/* Always show indicators if there are photos */}
                {validGalleryPhotos.length > 0 && (
                  <div className="carousel-indicators">
                    {validGalleryPhotos.slice(0, Math.min(10, validGalleryPhotos.length)).map((_, index) => (
                      <button
                        key={index}
                        className={`carousel-indicator ${index === carouselIndex ? 'active' : ''}`}
                        onClick={() => setCarouselIndex(index)}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="hero-fallback-background">
                {/* Banner is still visible with gradient background when no photos */}
              </div>
            )}
          </div>

          {/* Login Button - Top Right Corner */}
          <Link to="/login" className="login-button-top-right" title="Login">
            <i className="fas fa-sign-in-alt"></i>
          </Link>

          {/* Scrolling Text at Bottom - Rector Statement */}
          <div className="scrolling-text-bottom">
            <div className="scrolling-text-wrapper">
              <div className="scrolling-text-content">
                {rectorStatement}
              </div>
              <div className="scrolling-text-content">
                {rectorStatement}
              </div>
            </div>
          </div>
        </section>

        {/* Short intro for SEO and visitors */}
        <section className="home-intro" aria-label="About Arusha Catholic Seminary">
          <p className="home-intro-text">
            Arusha Catholic Seminary (centre number S0171) is a Catholic secondary school in Arusha, Tanzania, offering O-Level and A-Level education from Form I to Form VI. We combine strong academic formation with spiritual and character development. Explore admissions, staff, NECTA examination results, school fees, and contact information on this site.
          </p>
        </section>

        {/* Administrators Section */}
        <section className="administration-section">
          <div className="administration-container">
            {/* Section Header */}
            <div className="administration-header">
              <h2 className="administration-title">
                <i className="fas fa-user-tie administration-title-icon"></i>
                SCHOOL ADMINISTRATION
              </h2>
              <p className="administration-subtitle">
                Meet our dedicated leadership team serving Arusha Catholic Seminary
              </p>
            </div>

            {/* Administrators Grid */}
            {administrators && administrators.length > 0 ? (
              <div className="administrators-grid">
                {administrators.map((admin) => (
                  <div key={admin.id} className="admin-card">
                    {/* Photo */}
                    <div className="admin-photo-container">
                      {admin.photo ? (
                        <img 
                          src={getImageUrl(admin.photo)} 
                          alt={admin.name || 'Administrator photo'} 
                          className="admin-photo" 
                          loading="lazy"
                          onError={(e) => {
                            // Silently handle missing images - don't log to console
                            e.target.style.display = 'none';
                            const placeholder = e.target.nextElementSibling;
                            if (placeholder) {
                              placeholder.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div className="admin-photo-placeholder" style={{ display: admin.photo ? 'none' : 'flex' }}>
                        <i className="fas fa-user admin-photo-placeholder-icon"></i>
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="admin-name">
                      {admin.name || 'Name Not Available'}
                    </h3>

                    {/* Title */}
                    <p className="admin-title">
                      {admin.title || 'Title Not Available'}
                    </p>

                    {/* Year Started Badge */}
                    {admin.year_started && (
                      <div className="admin-year-badge">
                        <i className="fas fa-calendar-alt admin-year-badge-icon"></i>
                        <span className="admin-year-text">Since {admin.year_started}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="administrators-empty">
                <p>Administrator information will be available soon.</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </PublicLayout>
  );
};

export default HomePage;
