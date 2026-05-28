/**
 * Inline remote report images as data: URIs for reliable Puppeteer PDF rendering.
 */
const axios = require('axios');

function publicOriginFromApiUrl(apiUrl) {
  const u = (apiUrl || '').trim().replace(/\/api\/?$/i, '').replace(/\/$/, '');
  return u || 'http://localhost:5000';
}

function toAbsoluteAssetUrl(src, origin) {
  if (!src || /^data:/i.test(String(src).trim())) return null;
  const t = String(src).trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (/^\/\//.test(t)) return `https:${t}`;
  const o = origin.replace(/\/$/, '');
  if (t.startsWith('/')) return `${o}${t}`;
  return `${o}/${t}`;
}

/**
 * Fetch every <img src="..."> (except data:) and replace with data: URIs.
 */
async function inlineReportImages(html, origin, authToken, logPrefix = 'PDF') {
  const srcSet = new Set();
  const re = /<img\b[^>]*?\bsrc="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!m[1].startsWith('data:')) srcSet.add(m[1]);
  }
  if (srcSet.size === 0) return html;

  const headers = { Accept: 'image/*,*/*' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const srcToData = new Map();
  const urls = [...srcSet];
  const batchSize = 10;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (srcAttr) => {
        const absolute = toAbsoluteAssetUrl(srcAttr, origin);
        if (!absolute) return;
        try {
          const res = await axios.get(absolute, {
            responseType: 'arraybuffer',
            headers,
            timeout: 60000,
            maxContentLength: 10 * 1024 * 1024,
            maxBodyLength: 10 * 1024 * 1024,
            validateStatus: (s) => s === 200,
          });
          const ct = (res.headers['content-type'] || 'application/octet-stream').split(';')[0].trim();
          const mime = /^image\//i.test(ct) ? ct : 'image/jpeg';
          const b64 = Buffer.from(res.data).toString('base64');
          srcToData.set(srcAttr, `data:${mime};base64,${b64}`);
        } catch (e) {
          console.warn(`[${logPrefix}] Could not inline image:`, absolute, e.message);
        }
      })
    );
  }

  let out = html;
  for (const [orig, dataUri] of srcToData) {
    const safe = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`src="${safe}"`, 'g'), () => `src="${dataUri}"`);
  }
  console.log(`[${logPrefix}] Inlined ${srcToData.size}/${srcSet.size} distinct image src values into HTML`);
  return out;
}

module.exports = {
  publicOriginFromApiUrl,
  toAbsoluteAssetUrl,
  inlineReportImages,
};
