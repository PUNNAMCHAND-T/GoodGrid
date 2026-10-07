/**
 * constants.js
 *
 * Single source of truth for all enums and role names used across the
 * codebase. Importing from here (instead of hard-coding strings) means
 * a typo is caught immediately rather than silently misbehaving at runtime.
 */

const ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
};

const REQUEST_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CLOSED: 'closed',
};

const REQUEST_CATEGORIES = [
  'tutoring',
  'repair',
  'medical',
  'volunteers',
  'moving',
  'technology',
  'gardening',
  'pet_care',
  'cooking',
  'other',
];

const URGENCY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

const AVAILABILITY = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  AWAY: 'away',
};

const APPLICATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

const NOTIFICATION_TYPES = {
  NEW_VOLUNTEER: 'new_volunteer',
  VOLUNTEER_ACCEPTED: 'volunteer_accepted',
  VOLUNTEER_REJECTED: 'volunteer_rejected',
  NEW_MESSAGE: 'new_message',
  REQUEST_COMPLETED: 'request_completed',
  REQUEST_CLOSED: 'request_closed',
  SYSTEM: 'system',
};

// Socket event names — same constants used by server and (potentially) docs
const SOCKET_EVENTS = {
  // client → server
  JOIN_CHAT: 'join_chat',
  LEAVE_CHAT: 'leave_chat',
  SEND_MESSAGE: 'send_message',
  TYPING: 'typing',
  STOP_TYPING: 'stop_typing',
  // server → client
  NEW_MESSAGE: 'new_message',
  USER_TYPING: 'user_typing',
  USER_STOP_TYPING: 'user_stop_typing',
  NOTIFICATION: 'notification',
  ERROR: 'error',
};

// Pagination defaults — enforced in list controllers
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
};

// Bcrypt cost factor — high enough to be secure, low enough not to block the event loop
const BCRYPT_SALT_ROUNDS = 12;

// Max image uploads per request post
const MAX_IMAGES_PER_REQUEST = 4;

// Max file size for uploads (5 MB in bytes)
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

module.exports = {
  ROLES,
  REQUEST_STATUS,
  REQUEST_CATEGORIES,
  URGENCY_LEVELS,
  AVAILABILITY,
  APPLICATION_STATUS,
  NOTIFICATION_TYPES,
  SOCKET_EVENTS,
  PAGINATION,
  BCRYPT_SALT_ROUNDS,
  MAX_IMAGES_PER_REQUEST,
  MAX_FILE_SIZE_BYTES,
};
