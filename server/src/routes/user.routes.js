/**
 * routes/user.routes.js
 *
 * All user/profile endpoints require authentication.
 * Avatar upload goes through the handleAvatarUpload middleware chain which
 * calls Multer then streams to Cloudinary before the controller runs.
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const userController = require('../controllers/user.controller');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const { handleAvatarUpload } = require('../middlewares/upload');
const asyncHandler = require('../utils/asyncHandler');
const { AVAILABILITY } = require('../utils/constants');

// All user routes require authentication
router.use(authenticate);

// ── GET /users/me ─────────────────────────────────────────────────────────────
router.get('/me', asyncHandler(userController.getMyProfile));

// ── PATCH /users/me ───────────────────────────────────────────────────────────
router.patch(
  '/me',
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be 2–50 characters'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 300 })
      .withMessage('Bio cannot exceed 300 characters'),
    body('availability')
      .optional()
      .isIn(Object.values(AVAILABILITY))
      .withMessage('Invalid availability value'),
    body('skills')
      .optional()
      .isArray()
      .withMessage('Skills must be an array'),
    body('lat')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('lng')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
  ],
  validate,
  asyncHandler(userController.updateMyProfile)
);

// ── PATCH /users/me/avatar ────────────────────────────────────────────────────
// handleAvatarUpload is an array of two middlewares: multer then Cloudinary stream
router.patch('/me/avatar', handleAvatarUpload, asyncHandler(userController.updateMyAvatar));

// ── GET /users/:id ────────────────────────────────────────────────────────────
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid user ID')],
  validate,
  asyncHandler(userController.getUserProfile)
);

// ── GET /users/:id/requests ───────────────────────────────────────────────────
router.get(
  '/:id/requests',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1–50'),
  ],
  validate,
  asyncHandler(userController.getUserRequests)
);

module.exports = router;
