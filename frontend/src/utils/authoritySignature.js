import { resolveStaticUrl } from './backendUrl';

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

/** Reject student-photo paths mistakenly stored as authority signatures. */
export function isValidAuthoritySignatureImageRef(ref) {
  if (ref == null || ref === '') return false;
  const s = String(ref).trim();
  if (!s) return false;

  if (/uploads\/photos\//i.test(s) || /\/photos\/[^/]+\.(jpe?g|png|gif|webp)/i.test(s)) {
    return false;
  }

  if (/^https?:\/\//i.test(s) || /^\/\//.test(s) || /cloudinary\.com/i.test(s)) return true;
  if (/authority-signatures/i.test(s)) return true;
  if (/^uploads\//i.test(s) && !/uploads\/photos\//i.test(s)) return true;

  return false;
}

/**
 * Image URL for authority signature, or null if text-only / none / invalid path.
 * @param {object|null|undefined} authorityData
 * @returns {string|null}
 */
export function getAuthoritySignatureImageUrl(authorityData) {
  if (!authorityData) return null;

  const imagePath = authorityData.signature_image_path?.trim();
  if (imagePath && isValidAuthoritySignatureImageRef(imagePath)) {
    return resolveStaticUrl(imagePath);
  }

  const textField = authorityData.signature?.trim();
  if (textField && isLikelyImageRef(textField) && isValidAuthoritySignatureImageRef(textField)) {
    return resolveStaticUrl(textField);
  }

  return null;
}

/**
 * Plain-text signature when no valid image should be shown.
 * @param {object|null|undefined} authorityData
 * @returns {string}
 */
export function getAuthoritySignatureText(authorityData) {
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

export { isLikelyImageRef };
