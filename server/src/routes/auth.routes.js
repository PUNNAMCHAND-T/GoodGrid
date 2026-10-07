/**
 * routes/auth.routes.js
 *
 * Mounts all authentication endpoints under /api/v1/auth.
 * Every route that accepts a body is validated with express-validator chains
 * before the validate middleware collects them into an ApiError(422).
 *
 * The authLimiter is applied to the entire router (tighter than the global
 * apiLimiter) to slow brute-force login/register attempts.
 */
const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { authLimiter } = require('../middlewares/rateLimiter');

// Apply tighter rate limit to all auth routes
router.use(authLimiter);

// ── POST /auth/register ───────────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be 2–50 characters'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  validate,
  asyncHandler(authController.register)
);

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  asyncHandler(authController.login)
);

// ── POST /auth/logout  [auth required] ────────────────────────────────────────
router.post('/logout', authenticate, asyncHandler(authController.logout));

// ── POST /auth/refresh-token  (uses httpOnly cookie) ─────────────────────────
router.post('/refresh-token', asyncHandler(authController.refreshToken));

// ── GET /auth/verify-email/:token ─────────────────────────────────────────────
router.get(
  '/verify-email/:token',
  [param('token').notEmpty().withMessage('Verification token is required')],
  validate,
  asyncHandler(authController.verifyEmail)
);

// ── POST /auth/forgot-password ────────────────────────────────────────────────
router.post(
  '/forgot-password',
  [body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail()],
  validate,
  asyncHandler(authController.forgotPassword)
);

// ── PATCH /auth/reset-password/:token ────────────────────────────────────────
router.patch(
  '/reset-password/:token',
  [
    param('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  validate,
  asyncHandler(authController.resetPassword)
);

// ── GET /auth/me  [auth required] ─────────────────────────────────────────────
router.get('/me', authenticate, asyncHandler(authController.getMe));

module.exports = router;
