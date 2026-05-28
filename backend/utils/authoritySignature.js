/**
 * Resolve authority signature image URL and optional text for reports.
 * Handles signature_image_path, legacy image paths/URLs stored in signature,
 * and plain text signatures.
 */

function isLikelyImageRef(value) {
  if (value == null || value === '') return false;
  const s = String(value).trim();
  if (!s) return false;
  if (/^https?:\/\//i.test(s) || /^\/\//.test(s)) return true;
  if (/cloudinary\.com/i.test(s)) return true;
  if (/\.(jpe?g|png|gif|webp|svg|bmp)(\?.*)?$/i.test(s)) return true;
  if (/^(\/)?(static\/)?uploads\//i.test(s)) return true;
  if (s.startsWith('/static/')) return true;
  return false;
}

/**
 * Student photo paths were sometimes stored in signature_image_path by mistake.
 * Only dedicated authority signature locations are valid.
 * @param {string|null|undefined} ref
 * @returns {boolean}
 */
function isValidAuthoritySignatureImageRef(ref) {
  if (ref == null || ref === '') return false;
  const s = String(ref).trim();
  if (!s) return false;

  if (/uploads\/photos\//i.test(s) || /\/photos\/[^/]+\.(jpe?g|png|gif|webp)/i.test(s)) {
    return false;
  }

  if (/^https?:\/\//i.test(s) || /^\/\//.test(s) || /cloudinary\.com/i.test(s)) {
    return true;
  }

  if (/authority-signatures/i.test(s)) return true;

  if (/^uploads\//i.test(s) && !/uploads\/photos\//i.test(s)) return true;

  return false;
}

/**
 * Normalize a stored path or URL to an absolute browser/PDF URL.
 * @param {string} ref
 * @param {string} [staticOrigin] - e.g. http://localhost:5000 (no trailing slash)
 */
function resolveAuthoritySignatureImageUrl(ref, staticOrigin = '') {
  if (ref == null || ref === '') return null;
  const s = String(ref).trim();
  if (!s) return null;

  if (/^https?:\/\//i.test(s)) return s;
  if (/^\/\//.test(s)) return `https:${s}`;
  const bare = s.replace(/^\/+/, '');
  if (/^(res\.)?cloudinary\.com/i.test(bare)) {
    return `https://${bare}`;
  }

  let clean = s.startsWith('/') ? s.slice(1) : s;
  if (clean.startsWith('static/')) clean = clean.slice('static/'.length);

  const origin = (staticOrigin || '').trim().replace(/\/api\/?$/i, '').replace(/\/$/, '');
  const rel = clean.startsWith('uploads/') ? `/static/${clean}` : `/static/${clean}`;

  return origin ? `${origin}${rel}` : rel;
}

/**
 * @param {object|null|undefined} authorityData
 * @param {string} [staticOrigin]
 * @returns {string|null}
 */
function getAuthoritySignatureImageUrl(authorityData, staticOrigin = '') {
  if (!authorityData) return null;

  const imagePath = authorityData.signature_image_path?.trim();
  if (imagePath && isValidAuthoritySignatureImageRef(imagePath)) {
    return resolveAuthoritySignatureImageUrl(imagePath, staticOrigin);
  }

  const textField = authorityData.signature?.trim();
  if (textField && isLikelyImageRef(textField) && isValidAuthoritySignatureImageRef(textField)) {
    return resolveAuthoritySignatureImageUrl(textField, staticOrigin);
  }

  return null;
}

/**
 * Plain-text signature for the SAHIHI cell when no valid image is configured.
 * @param {object|null|undefined} authorityData
 * @returns {string}
 */
function getAuthoritySignatureText(authorityData) {
  if (!authorityData) return '';

  const imagePath = authorityData.signature_image_path?.trim();
  const hasValidImage =
    (imagePath && isValidAuthoritySignatureImageRef(imagePath)) ||
    (authorityData.signature?.trim() &&
      isLikelyImageRef(authorityData.signature) &&
      isValidAuthoritySignatureImageRef(authorityData.signature));

  const textField = authorityData.signature?.trim() || '';
  if (hasValidImage) return '';
  if (textField && isLikelyImageRef(textField)) return '';
  return textField;
}

/**
 * Clear invalid signature_image_path values (e.g. student photo paths).
 * @param {object|null|undefined} row
 * @param {Function} [queryFn] - optional DB query; when provided, invalid paths are cleared
 * @returns {Promise<object|null|undefined>}
 */
async function sanitizeAuthorityDataRow(row, queryFn) {
  if (!row) return row;

  const path = row.signature_image_path?.trim();
  if (!path || isValidAuthoritySignatureImageRef(path)) return row;

  if (queryFn) {
    try {
      await queryFn(
        'UPDATE authority_data SET signature_image_path = $1, updated_at = NOW() WHERE id = 1',
        ['']
      );
    } catch (err) {
      console.warn('[authority] Could not clear invalid signature_image_path:', err.message);
    }
  }

  return { ...row, signature_image_path: '' };
}

module.exports = {
  isLikelyImageRef,
  isValidAuthoritySignatureImageRef,
  resolveAuthoritySignatureImageUrl,
  getAuthoritySignatureImageUrl,
  getAuthoritySignatureText,
  sanitizeAuthorityDataRow,
};
