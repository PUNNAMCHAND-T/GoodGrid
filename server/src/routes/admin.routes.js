/**
 * routes/admin.routes.js
 *
 * Admin/moderator endpoints. All routes require authentication.
 * Role authorisation is applied per-route (admin vs admin+moderator) rather
 * than once on the router, because some actions (ban, role change) are
 * admin-only while others (stats, list, delete-request) allow moderators too.
 */
const express = require('express');
const { param, body, query } = require('express-validator');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const authenticate = require('../middlewares/authenticate');
const authorizeRoles = require('../middlewares/authorizeRoles');
const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES, REQUEST_CATEGORIES, REQUEST_STATUS } = require('../utils/constants');

// All admin routes require authentication
router.use(authenticate);

// ── GET /admin/stats  [admin or moderator] ────────────────────────────────────
router.get(
  '/stats',
  authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR),
  asyncHandler(adminController.getStats)
);

// ── GET /admin/users  [admin or moderator] ────────────────────────────────────
router.get(
  '/users',
  authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR),
  [
    query('role').optional().isIn(Object.values(ROLES)).withMessage('Invalid role filter'),
    query('search').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  asyncHandler(adminController.listUsers)
);

// ── PATCH /admin/users/:id/ban  [admin only] ──────────────────────────────────
router.patch(
  '/users/:id/ban',
  authorizeRoles(ROLES.ADMIN),
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('reason').optional().trim().isLength({ max: 300 }),
  ],
  validate,
  asyncHandler(adminController.banUser)
);

// ── PATCH /admin/users/:id/unban  [admin only] ────────────────────────────────
router.patch(
  '/users/:id/unban',
  authorizeRoles(ROLES.ADMIN),
  [param('id').isMongoId().withMessage('Invalid user ID')],
  validate,
  asyncHandler(adminController.unbanUser)
);

// ── PATCH /admin/users/:id/role  [admin only] ─────────────────────────────────
router.patch(
  '/users/:id/role',
  authorizeRoles(ROLES.ADMIN),
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('role')
      .isIn(Object.values(ROLES))
      .withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),
  ],
  validate,
  asyncHandler(adminController.changeUserRole)
);

// ── GET /admin/requests  [admin or moderator] ─────────────────────────────────
router.get(
  '/requests',
  authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR),
  [
    query('category').optional().isIn(REQUEST_CATEGORIES),
    query('status').optional().isIn(Object.values(REQUEST_STATUS)),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  asyncHandler(adminController.listRequestsAdmin)
);

// ── DELETE /admin/requests/:id  [admin or moderator] ─────────────────────────
router.delete(
  '/requests/:id',
  authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR),
  [param('id').isMongoId().withMessage('Invalid request ID')],
  validate,
  asyncHandler(adminController.deleteRequestAdmin)
);

module.exports = router;
