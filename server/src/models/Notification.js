/**
 * models/Notification.js
 *
 * A notification sent to a user when a relevant event happens
 * (e.g. someone volunteers for their request, their application is accepted).
 *
 * The compound index {recipient, isRead, createdAt:-1} optimises the two
 * most common queries:
 *   1. GET /notifications — all notifications for a user, newest first
 *   2. GET /notifications/unread-count — count unread for the badge
 */
const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../utils/constants');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must have a recipient'],
    },
    // Nullable — system notifications have no specific sender
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: [true, 'Notification type is required'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
    },
    // Deep-link URL sent to the frontend (e.g. /requests/:id)
    link: {
      type: String,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    // Any extra structured data the frontend might need (Mixed for flexibility)
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Optimises "unread notifications for user, newest first" queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
