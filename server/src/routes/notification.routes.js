/**
 * routes/notification.routes.js
 *
 * All notification endpoints require authentication.
 * Specific paths (unread-count, read-all) are registered before /:id
 * so Express doesn't treat "unread-count" or "read-all" as a Mongo ObjectId.
 */
const express = require('express');
const { param } = require('express-validator');
const router = express.Router();

const notificationController = require('../controllers/notification.controller');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);

// ── GET /notifications ────────────────────────────────────────────────────────
router.get('/', asyncHandler(notificationController.getNotifications));

// ── GET /notifications/unread-count ──────────────────────────────────────────
router.get('/unread-count', asyncHandler(notificationController.getUnreadCount));

// ── PATCH /notifications/read-all ────────────────────────────────────────────
router.patch('/read-all', asyncHandler(notificationController.markAllRead));

// ── PATCH /notifications/:id/read ────────────────────────────────────────────
router.patch(
  '/:id/read',
  [param('id').isMongoId().withMessage('Invalid notification ID')],
  validate,
  asyncHandler(notificationController.markOneRead)
);

module.exports = router;
