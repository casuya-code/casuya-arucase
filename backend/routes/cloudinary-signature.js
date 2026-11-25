const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { sendError } = require('../utils/safeError');
const { requireAuth, requireRole } = require('../middleware/auth');

const ALLOWED_FOLDERS = new Set([
  'staff-photos',
  'school-logos',
  'authority-signatures',
  'patron-saint-images',
  'arucase-gallery',
  'admission-letters',
  'admission-preform-letters',
  'alumni-photos',
  'administrator-photos',
]);

const TIMESTAMP_TOLERANCE_SECONDS = 60 * 60;

// Configure Cloudinary with backend credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Generate Cloudinary signature for frontend uploads.
// Restricted to trusted admin roles and a server-defined folder allowlist.
router.post('/signature', requireAuth, requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { folder, public_id, timestamp } = req.body || {};

    // Validate required parameters
    if (!folder || !timestamp) {
      return res.status(400).json({
        error: 'Missing required parameters: folder, timestamp'
      });
    }

    if (!ALLOWED_FOLDERS.has(String(folder))) {
      return res.status(400).json({
        error: 'Invalid folder'
      });
    }

    const numericTimestamp = Number(timestamp);
    if (!Number.isInteger(numericTimestamp) || Math.abs(numericTimestamp - Math.round(Date.now() / 1000)) > TIMESTAMP_TOLERANCE_SECONDS) {
      return res.status(400).json({
        error: 'Invalid or stale timestamp'
      });
    }

    if (public_id !== undefined && public_id !== null) {
      if (typeof public_id !== 'string' || public_id.length > 200 || !/^[a-zA-Z0-9/_-]+$/.test(public_id)) {
        return res.status(400).json({
          error: 'Invalid public_id'
        });
      }
    }

    // Generate signature
    const signature = cloudinary.utils.api_sign_request({
      timestamp: numericTimestamp,
      folder: folder,
      public_id: public_id
    }, process.env.CLOUDINARY_API_SECRET);

    res.json({
      signature: signature,
      timestamp: numericTimestamp,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      folder: folder
    });

  } catch (error) {
    console.error('Cloudinary signature error:', error);
    return sendError(res, error, 500);
  }
});

// Test Cloudinary connection
router.get('/test', async (req, res) => {
  try {
    const result = await cloudinary.api.ping();
    res.json({
      status: 'connected',
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      result: result
    });
  } catch (error) {
    console.error('Cloudinary test error:', error);
    res.status(500).json({
      status: 'disconnected',
      error: error.message
    });
  }
});

module.exports = router;
