-- Up Migration
-- Gallery photos stored in Cloudflare R2 keep pre-generated display variants
-- so one upload serves the right crop everywhere:
--   hero_url     1920x1080 (16:9)  homepage hero carousel
--   gallery_url  1200x800  (3:2)   public gallery grid + lightbox default
--   thumb_url    480x320   (3:2)   small previews / admin grid
--   original_url <=2560px          lightbox full view
--
-- Existing rows (Cloudinary) leave these NULL and keep using `path`, and the
-- frontend falls back to Cloudinary transforms when a variant is missing.

ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS hero_url varchar;
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS gallery_url varchar;
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS thumb_url varchar;
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS original_url varchar;

-- Down Migration
ALTER TABLE gallery_photos DROP COLUMN IF EXISTS original_url;
ALTER TABLE gallery_photos DROP COLUMN IF EXISTS thumb_url;
ALTER TABLE gallery_photos DROP COLUMN IF EXISTS gallery_url;
ALTER TABLE gallery_photos DROP COLUMN IF EXISTS hero_url;
