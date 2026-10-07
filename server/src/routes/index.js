/**
 * routes/index.js
 *
 * Mounts every sub-router under /api/v1 and exposes the /health endpoint.
 * Adding a new feature set means adding one line here — no changes to app.js.
 */
const express = require('express');
const router = express.Router();

// ── Health check ─────────────────────────────────────────────────────────────
// Used by load balancers / uptime monitors. Returns immediately without hitting
// the DB so a fast response confirms the Node process is alive.
router.get('/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ── Feature routers (imported as they are built phase by phase) ──────────────
router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/requests', require('./request.routes'));
router.use('/chats', require('./chat.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
