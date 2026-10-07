/**
 * utils/constants.js
 * Mirrors the backend constants — single source of truth for the frontend.
 * Always keep in sync with server/src/utils/constants.js.
 */

export const ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
};

export const REQUEST_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CLOSED: 'closed',
};

export const REQUEST_CATEGORIES = [
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

export const URGENCY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

export const AVAILABILITY = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  AWAY: 'away',
};

export const APPLICATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

export const NOTIFICATION_TYPES = {
  NEW_VOLUNTEER: 'new_volunteer',
  VOLUNTEER_ACCEPTED: 'volunteer_accepted',
  VOLUNTEER_REJECTED: 'volunteer_rejected',
  NEW_MESSAGE: 'new_message',
  REQUEST_COMPLETED: 'request_completed',
  REQUEST_CLOSED: 'request_closed',
  SYSTEM: 'system',
};
