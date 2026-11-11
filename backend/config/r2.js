/**
 * Cloudflare R2 (S3-compatible) configuration for gallery photo storage.
 *
 * One upload becomes three ready-to-serve crops plus a normalised original:
 *   gallery/<photoId>/hero-1920x1080.jpg   → homepage hero carousel (16:9)
 *   gallery/<photoId>/gallery-1200x800.jpg → public gallery grid  (3:2)
 *   gallery/<photoId>/thumb-480x320.jpg    → small previews / admin grid
 *   gallery/<photoId>/original.jpg         → lightbox (max 2560px, EXIF stripped)
 *
 * Required environment variables:
 *   R2_ACCOUNT_ID         Cloudflare account id
 *   R2_ACCESS_KEY_ID      R2 API token access key id
 *   R2_SECRET_ACCESS_KEY  R2 API token secret access key
 *   R2_BUCKET             bucket name (e.g. arucase-gallery)
 *   R2_PUBLIC_BASE_URL    public bucket origin, e.g. https://pub-xxxx.r2.dev
 *                         or a custom domain such as https://media.example.org
 *
 * Uploads gracefully fall back to Cloudinary when these are not configured,
 * so local development and older deployments keep working.
 */
require('dotenv').config();

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');

const ACCOUNT_ID = (process.env.R2_ACCOUNT_ID || '').trim();
const ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID || '').trim();
const SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
const BUCKET = (process.env.R2_BUCKET || '').trim();
const PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');

const REQUIRED = { ACCOUNT_ID, ACCESS_KEY_ID, SECRET_ACCESS_KEY, BUCKET, PUBLIC_BASE_URL };
const missing = Object.entries(REQUIRED)
  .filter(([, value]) => !value)
  .map(([name]) => name);

let _client = null;

/** True when every R2 setting is present so uploads can go to Cloudflare. */
function isR2Configured() {
  return missing.length === 0;
}

function getClient() {
  if (!isR2Configured()) {
    throw new Error(
      `Cloudflare R2 is not configured (missing: ${missing.join(', ')}).`
    );
  }
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
    });
    console.log(`[r2] Configured for bucket "${BUCKET}" (${PUBLIC_BASE_URL})`);
  }
  return _client;
}

/** Upload one object to R2. body may be a Buffer or a stream. */
async function uploadObject(key, body, contentType = 'application/octet-stream', cacheControl) {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl || 'public, max-age=31536000, immutable',
    })
  );
  return publicUrl(key);
}

/** Build the public URL for an object key. */
function publicUrl(key) {
  return `${PUBLIC_BASE_URL}/${key.replace(/^\/+/, '')}`;
}

/** True when a stored URL points into this R2 bucket. */
function isR2Url(url) {
  return Boolean(url && PUBLIC_BASE_URL && String(url).startsWith(PUBLIC_BASE_URL));
}

/** List every object key under a prefix (handles pagination). */
async function listKeys(prefix) {
  const client = getClient();
  const keys = [];
  let continuationToken;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    (page.Contents || []).forEach((obj) => obj.Key && keys.push(obj.Key));
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

/** Delete every object under a prefix (e.g. gallery/<photoId>/). */
async function deletePrefix(prefix) {
  if (!isR2Configured()) return 0;
  const keys = await listKeys(prefix);
  if (keys.length === 0) return 0;
  const client = getClient();
  let deleted = 0;
  // DeleteObjects accepts at most 1000 keys per request.
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000).map((Key) => ({ Key }));
    await client.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: batch, Quiet: true },
      })
    );
    deleted += batch.length;
  }
  return deleted;
}

module.exports = {
  isR2Configured,
  uploadObject,
  publicUrl,
  isR2Url,
  listKeys,
  deletePrefix,
  bucket: BUCKET,
  publicBaseUrl: PUBLIC_BASE_URL,
};
