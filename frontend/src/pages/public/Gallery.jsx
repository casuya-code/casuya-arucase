/**
 * Public Gallery Page - Full Photo Gallery
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import PublicLayout from '../../components/layout/PublicLayout';
import { publicAPI } from '../../services/public';
import Loading from '../../components/common/Loading';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { getImageLoadingStrategy, getNetworkInfo } from '../../utils/networkUtils';
import '../../components/public/Gallery.css';
import './GalleryPage.css';

const Gallery = () => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch gallery photos - fewer on slow networks to save data
  const galleryLimit = getNetworkInfo().isSlow ? 30 : 100;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['public-gallery', galleryLimit],
    queryFn: async () => {
      const res = await publicAPI.getGallery(galleryLimit);
      return res.data.photos || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });

  const photos = data || [];
  
  // Get network-aware image loading strategy
  const imageStrategy = getImageLoadingStrategy();

  // Helper function to resolve image URLs
  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    
    // Remove leading slash if present
    let cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Paths from database are like "uploads/photos/filename.jpg"
    // We need to prepend "static/" to get "/static/uploads/photos/filename.jpg"
    if (!cleanPath.startsWith('static/')) {
      cleanPath = `static/${cleanPath}`;
    }
    
    // In development, use relative URL (Vite proxy at /static forwards to backend)
    // The proxy is configured to forward /static to http://localhost:5000/static
    return `/${cleanPath}`;
  };

  // Get unique categories from photos
  const categories = ['all', ...new Set(photos.map(photo => photo.category || 'general'))];

  // Filter photos by category
  const filteredPhotos = selectedCategory === 'all' 
    ? photos 
    : photos.filter(photo => (photo.category || 'general') === selectedCategory);

  // Navigation functions for lightbox
  const handlePrevious = (e) => {
    e.stopPropagation();
    const newIndex = currentIndex > 0 ? currentIndex - 1 : filteredPhotos.length - 1;
    setCurrentIndex(newIndex);
    setSelectedPhoto(filteredPhotos[newIndex]);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    const newIndex = currentIndex < filteredPhotos.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    setSelectedPhoto(filteredPhotos[newIndex]);
  };

  const handlePhotoClick = (photo, index) => {
    setCurrentIndex(index);
    setSelectedPhoto(photo);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!selectedPhoto) return;

    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const newIndex = currentIndex > 0 ? currentIndex - 1 : filteredPhotos.length - 1;
        setCurrentIndex(newIndex);
        setSelectedPhoto(filteredPhotos[newIndex]);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const newIndex = currentIndex < filteredPhotos.length - 1 ? currentIndex + 1 : 0;
        setCurrentIndex(newIndex);
        setSelectedPhoto(filteredPhotos[newIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedPhoto(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedPhoto, currentIndex, filteredPhotos]);

  // Show skeleton loader instead of blocking page - better UX
  // Content will appear progressively as it loads

  if (error) {
    return (
      <PublicLayout>
        <div className="gallery-page-container">
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            <p>Failed to load gallery photos. Check your connection and try again.</p>
            <button
              type="button"
              className="gallery-retry-btn"
              onClick={() => refetch()}
            >
              <i className="fas fa-sync-alt"></i> Retry
            </button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="gallery-page-container">
        <div className="gallery-page-header">
          <h1>
            <i className="fas fa-images"></i>
            Photo Gallery
          </h1>
          <p>Explore our collection of photos showcasing life at Arusha Catholic Seminary</p>
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="gallery-filters">
            {categories.map((category) => (
              <button
                key={category}
                className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory(category);
                  setSelectedPhoto(null);
                }}
              >
                {category === 'all' ? 'All Photos' : category.charAt(0).toUpperCase() + category.slice(1)}
                {category !== 'all' && (
                  <span className="filter-count">
                    ({photos.filter(p => (p.category || 'general') === category).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Gallery Grid */}
        {isLoading && filteredPhotos.length === 0 ? (
          <SkeletonLoader type="gallery" />
        ) : filteredPhotos.length === 0 ? (
          <div className="empty-gallery">
            <i className="fas fa-images"></i>
            <p>No photos found in this category.</p>
          </div>
        ) : (
          <div className="gallery-grid">
            {filteredPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className="gallery-item-card"
                onClick={() => handlePhotoClick(photo, index)}
              >
                <div className="gallery-item-image-wrapper">
                  <LazyLoadImage
                    src={getImageUrl(photo.path)}
                    alt={photo.caption || 'Gallery photo'}
                    effect={imageStrategy.useBlur ? "blur" : undefined}
                    className="gallery-image"
                    threshold={imageStrategy.threshold}
                    placeholder={<div className="image-placeholder">Loading...</div>}
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextElementSibling) {
                        e.target.nextElementSibling.style.display = 'flex';
                      }
                    }}
                  />
                  <div className="image-placeholder" style={{ display: 'none' }}>
                    <i className="fas fa-image"></i>
                  </div>
                  <div className="gallery-item-overlay">
                    <div className="gallery-item-category-badge">
                      <i className="fas fa-tag"></i>
                      {photo.category ? photo.category.charAt(0).toUpperCase() + photo.category.slice(1) : 'General'}
                    </div>
                    <div className="gallery-item-view-icon">
                      <i className="fas fa-search-plus"></i>
                    </div>
                  </div>
                </div>
                <div className="gallery-item-info">
                  {photo.caption && (
                    <h3 className="gallery-item-title">{photo.caption}</h3>
                  )}
                  {photo.date && (
                    <div className="gallery-item-meta">
                      <span className="gallery-item-date">
                        <i className="fas fa-calendar-alt"></i>
                        {new Date(photo.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Photo Count */}
        <div className="gallery-stats">
          <p>
            Showing {filteredPhotos.length} {filteredPhotos.length === 1 ? 'photo' : 'photos'}
            {selectedCategory !== 'all' && ` in ${selectedCategory}`}
          </p>
        </div>

        {/* Lightbox Modal */}
        {selectedPhoto && (
          <div className="lightbox" onClick={() => setSelectedPhoto(null)}>
            <button
              className="lightbox-close"
              onClick={() => setSelectedPhoto(null)}
              aria-label="Close"
            >
              <i className="fas fa-times"></i>
            </button>
            {filteredPhotos.length > 1 && (
              <>
                <button
                  className="lightbox-nav lightbox-prev"
                  onClick={handlePrevious}
                  aria-label="Previous photo"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button
                  className="lightbox-nav lightbox-next"
                  onClick={handleNext}
                  aria-label="Next photo"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </>
            )}
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <img 
                src={getImageUrl(selectedPhoto.path)} 
                alt={selectedPhoto.caption || 'Gallery photo'}
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextElementSibling) {
                    e.target.nextElementSibling.style.display = 'flex';
                  }
                }}
              />
              <div className="image-placeholder" style={{ display: 'none' }}>
                <i className="fas fa-image"></i>
                <p>Image not available</p>
              </div>
              {(selectedPhoto.caption || selectedPhoto.date) && (
                <div className="lightbox-info">
                  {selectedPhoto.caption && (
                    <p className="lightbox-caption">{selectedPhoto.caption}</p>
                  )}
                  {selectedPhoto.date && (
                    <p className="lightbox-date">
                      <i className="fas fa-calendar"></i> {new Date(selectedPhoto.date).toLocaleDateString()}
                    </p>
                  )}
                  {selectedPhoto.category && (
                    <p className="lightbox-category">
                      <i className="fas fa-tag"></i> {selectedPhoto.category}
                    </p>
                  )}
                </div>
              )}
              {filteredPhotos.length > 1 && (
                <div className="lightbox-counter">
                  {currentIndex + 1} / {filteredPhotos.length}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default Gallery;
