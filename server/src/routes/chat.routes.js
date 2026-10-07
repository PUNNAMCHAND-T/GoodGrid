/**
 * routes/chat.routes.js
 *
 * Chat HTTP endpoints — all require authentication.
 * Real-time events (join, leave, send, typing) are handled in sockets/index.js.
 */
const express = require('express');
const { param, body } = require('express-validator');
const router = express.Router();

const chatController = require('../controllers/chat.controller');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);

// ── GET /chats ────────────────────────────────────────────────────────────────
router.get('/', asyncHandler(chatController.getMyChats));

// ── GET /chats/:id ────────────────────────────────────────────────────────────
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid chat ID')],
  validate,
  asyncHandler(chatController.getChatById)
);

// ── POST /chats/:id/messages  (HTTP fallback) ─────────────────────────────────
router.post(
  '/:id/messages',
  [
    param('id').isMongoId().withMessage('Invalid chat ID'),
    body('text')
      .trim()
      .notEmpty()
      .withMessage('Message text is required')
      .isLength({ max: 1000 })
      .withMessage('Message cannot exceed 1000 characters'),
  ],
  validate,
  asyncHandler(chatController.sendMessage)
);

module.exports = router;
