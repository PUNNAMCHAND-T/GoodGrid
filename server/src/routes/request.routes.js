/**
 * routes/request.routes.js
 *
 * All request endpoints require authentication.
 * Specific routes (close, complete, delete, update) also require ownership,
 * enforced in the controller rather than middleware so the 403 message can
 * name the resource.
 *
 * NOTE: /nearby, /my, and /my/applications must be registered BEFORE /:id
 * because Express matches routes in order — otherwise "my" would be treated
 * as a MongoDB ObjectId and fail the isMongoId check.
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const requestController = require('../controllers/request.controller');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const { handleRequestImages } = require('../middlewares/upload');
const asyncHandler = require('../utils/asyncHandler');
const { REQUEST_CATEGORIES, URGENCY_LEVELS, REQUEST_STATUS } = require('../utils/constants');

// All request routes require authentication
router.use(authenticate);

// ── GET /requests ─────────────────────────────────────────────────────────────
router.get(
  '/',
  [
    query('category').optional().isIn(REQUEST_CATEGORIES).withMessage('Invalid category'),
    query('status').optional().isIn(Object.values(REQUEST_STATUS)).withMessage('Invalid status'),
    query('urgency').optional().isIn(Object.values(URGENCY_LEVELS)).withMessage('Invalid urgency'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  asyncHandler(requestController.listRequests)
);

// ── GET /requests/nearby ──────────────────────────────────────────────────────
router.get(
  '/nearby',
  [
    query('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    query('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
    query('distance').optional().isFloat({ min: 0.1 }).withMessage('Distance must be positive'),
  ],
  validate,
  asyncHandler(requestController.getNearbyRequests)
);

// ── GET /requests/my ─────────────────────────────────────────────────────────
router.get('/my', asyncHandler(requestController.getMyRequests));

// ── GET /requests/my/applications ────────────────────────────────────────────
router.get('/my/applications', asyncHandler(requestController.getMyApplications));

// ── POST /requests ────────────────────────────────────────────────────────────
router.post(
  '/',
  handleRequestImages, // Multer + Cloudinary, sets req.imageUrls
  [
    body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be 5–100 characters'),
    body('description').trim().isLength({ min: 1, max: 1000 }).withMessage('Description required (max 1000 chars)'),
    body('category').isIn(REQUEST_CATEGORIES).withMessage('Invalid category'),
    body('urgency').optional().isIn(Object.values(URGENCY_LEVELS)).withMessage('Invalid urgency'),
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  ],
  validate,
  asyncHandler(requestController.createRequest)
);

// ── GET /requests/:id ─────────────────────────────────────────────────────────
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid request ID')],
  validate,
  asyncHandler(requestController.getRequest)
);

// ── PATCH /requests/:id ───────────────────────────────────────────────────────
router.patch(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid request ID'),
    body('title').optional().trim().isLength({ min: 5, max: 100 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('category').optional().isIn(REQUEST_CATEGORIES),
    body('urgency').optional().isIn(Object.values(URGENCY_LEVELS)),
  ],
  validate,
  asyncHandler(requestController.updateRequest)
);

// ── DELETE /requests/:id ──────────────────────────────────────────────────────
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid request ID')],
  validate,
  asyncHandler(requestController.deleteRequest)
);

// ── PATCH /requests/:id/close ─────────────────────────────────────────────────
router.patch(
  '/:id/close',
  [param('id').isMongoId().withMessage('Invalid request ID')],
  validate,
  asyncHandler(requestController.closeRequest)
);

// ── PATCH /requests/:id/complete ──────────────────────────────────────────────
router.patch(
  '/:id/complete',
  [param('id').isMongoId().withMessage('Invalid request ID')],
  validate,
  asyncHandler(requestController.completeRequest)
);

// Volunteer-related sub-routes are defined in volunteer.controller and
// mounted here to keep this file focused on request CRUD
const volunteerController = require('../controllers/volunteer.controller');

// ── POST /requests/:id/volunteer ─────────────────────────────────────────────
router.post(
  '/:id/volunteer',
  [
    param('id').isMongoId().withMessage('Invalid request ID'),
    body('message').optional().trim().isLength({ max: 300 }),
  ],
  validate,
  asyncHandler(volunteerController.applyToVolunteer)
);

// ── GET /requests/:id/volunteers ─────────────────────────────────────────────
router.get(
  '/:id/volunteers',
  [param('id').isMongoId().withMessage('Invalid request ID')],
  validate,
  asyncHandler(volunteerController.getVolunteers)
);

// ── PATCH /requests/:id/volunteers/:appId/accept ──────────────────────────────
router.patch(
  '/:id/volunteers/:appId/accept',
  [
    param('id').isMongoId().withMessage('Invalid request ID'),
    param('appId').isMongoId().withMessage('Invalid application ID'),
  ],
  validate,
  asyncHandler(volunteerController.acceptVolunteer)
);

module.exports = router;
