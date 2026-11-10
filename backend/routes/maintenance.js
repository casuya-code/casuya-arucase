/**
 * Maintenance mode API.
 *
 * GET /api/maintenance/status   public — used by the frontend gate.
 * GET /api/maintenance/settings superadmin — full settings + live status.
 * PUT /api/maintenance/settings superadmin — save settings/schedule.
 */
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  ensureMaintenanceTable,
  getMaintenanceSettings,
  getMaintenanceState,
  updateMaintenanceSettings,
  statusView,
} = require('../utils/maintenance');

const router = express.Router();

router.get('/status', async (req, res) => {
  const status = await getMaintenanceState();
  res.json(status);
});

router.get('/settings', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    await ensureMaintenanceTable();
    const settings = await getMaintenanceSettings({ force: true });
    res.json({ settings, status: statusView(settings) });
  } catch (error) {
    console.error('[maintenance] failed to load settings:', error.message);
    res.status(500).json({ message: 'Failed to load maintenance settings' });
  }
});

router.put('/settings', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const settings = await updateMaintenanceSettings(req.body || {}, req.user?.user_id || null);
    res.json({ settings, status: statusView(settings) });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    console.error('[maintenance] failed to save settings:', error.message);
    return res.status(500).json({ message: 'Failed to save maintenance settings' });
  }
});

module.exports = router;
