/**
 * Gallery image processing.
 *
 * Turns one uploaded photo into the fixed display variants the public site
 * uses, so the same source image looks right in each place:
 *
 *   hero    1920x1080 (16:9)  — homepage hero carousel
 *   gallery 1200x800  (3:2)   — public gallery grid
 *   thumb   480x320   (3:2)   — small previews / admin grid
 *   original <=2560px long edge — lightbox
 *
 * Crops use sharp's "attention" strategy so the subject stays in frame
 * instead of always centring. EXIF is stripped by re-encoding (privacy) and
 * orientation is normalised first.
 */
const sharp = require('sharp');

const JPEG_OPTIONS = {
  mozjpeg: true,
  chromaSubsampling: '4:4:4',
  trellisQuantisation: true,
  overshootDeringing: true,
  optimizeScans: true,
};

const VARIANTS = {
  hero: { width: 1920, height: 1080, quality: 92, sharpen: 1.0 },
  gallery: { width: 1200, height: 800, quality: 92, sharpen: 1.0 },
  thumb: { width: 480, height: 320, quality: 90, sharpen: 0.6 },
};

async function renderCrop(buffer, { width, height, quality, sharpen }) {
  return sharp(buffer, { failOn: 'none' })
    .rotate() // honour EXIF orientation before cropping
    .resize(width, height, { fit: 'cover', position: sharp.strategy.attention })
    .sharpen({ sigma: sharpen, m1: 1.0, m2: 0.5, x1: 2, y2: 10, y3: 20 })
    .jpeg({ ...JPEG_OPTIONS, quality })
    .toBuffer();
}

async function renderOriginal(buffer) {
  return sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
    .sharpen({ sigma: 0.5, m1: 0.8, m2: 0.4, x1: 2, y2: 10, y3: 20 })
    .jpeg({ ...JPEG_OPTIONS, quality: 95 })
    .toBuffer();
}

/** @returns {Promise<{hero: Buffer, gallery: Buffer, thumb: Buffer, original: Buffer}>} */
async function processGalleryImage(buffer) {
  const [hero, gallery, thumb, original] = await Promise.all([
    renderCrop(buffer, VARIANTS.hero),
    renderCrop(buffer, VARIANTS.gallery),
    renderCrop(buffer, VARIANTS.thumb),
    renderOriginal(buffer),
  ]);
  return { hero, gallery, thumb, original };
}

module.exports = { processGalleryImage, VARIANTS };
