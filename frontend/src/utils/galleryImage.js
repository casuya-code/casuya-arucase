/**
 * Gallery image URLs with variant support.
 *
 * Photos uploaded to Cloudflare R2 carry ready-made crops:
 *   hero_url      1920x1080 (16:9)  → homepage hero carousel
 *   gallery_url   1200x800  (3:2)   → public gallery grid
 *   thumb_url     480x320           → small previews / admin grid
 *   original_url  <=2560px          → lightbox
 *
 * Legacy Cloudinary rows only have `path`, so we fall back to the existing
 * Cloudinary transforms to keep them working unchanged.
 */
import { resolveStaticUrl } from './backendUrl';
import { heroImageSources, galleryThumbUrl } from './cloudinaryImage';

/** Hero carousel source — 16:9 crop when stored in R2. */
export function galleryHeroSource(photo) {
  if (!photo) return { src: '', srcSet: '' };
  if (photo.hero_url) return { src: photo.hero_url, srcSet: '' };
  return heroImageSources(resolveStaticUrl(photo.path));
}

/** Gallery grid image — 3:2 crop when stored in R2. */
export function galleryGridUrl(photo) {
  if (!photo) return '';
  return photo.gallery_url || resolveStaticUrl(photo.path);
}

/** Small preview image. */
export function galleryThumbUrlFor(photo) {
  if (!photo) return '';
  if (photo.thumb_url) return photo.thumb_url;
  return galleryThumbUrl(resolveStaticUrl(photo.path));
}

/** Full-size image for lightboxes. */
export function galleryFullUrl(photo) {
  if (!photo) return '';
  return photo.original_url || photo.gallery_url || resolveStaticUrl(photo.path);
}
