/**
 * controllers/notification.controller.js
 *
 * Handles reading and marking notifications for the authenticated user.
 * Notifications are created by other controllers (request, volunteer) —
 * this controller only handles retrieval and read-status updates.
 */
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { PAGINATION } = require('../utils/constants');

/**
 * getNotifications
 * GET /notifications  [auth required]
 * Returns a paginated list of notifications for the current user,
 * newest first.
 */
const getNotifications = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name avatar'),
    Notification.countDocuments({ recipient: req.user._id }),
  ]);

  res.status(200).json(
    new ApiResponse(200, { data: notifications, page, limit, total, totalPages: Math.ceil(total / limit) }, 'Notifications fetched')
  );
};

/**
 * getUnreadCount
 * GET /notifications/unread-count  [auth required]
 * Fast count query used to update the navbar badge without fetching all notifications.
 */
const getUnreadCount = async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  res.status(200).json(new ApiResponse(200, { count }, 'Unread count fetched'));
};

/**
 * markAllRead
 * PATCH /notifications/read-all  [auth required]
 * Marks every notification for the current user as read in one write.
 */
const markAllRead = async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
};

/**
 * markOneRead
 * PATCH /notifications/:id/read  [auth required]
 * Marks a single notification as read. Verifies the recipient matches
 * the current user so users can't mark each other's notifications.
 */
const markOneRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) throw new ApiError(404, 'Notification not found.');

  res.status(200).json(new ApiResponse(200, { notification }, 'Notification marked as read'));
};

module.exports = { getNotifications, getUnreadCount, markAllRead, markOneRead };
