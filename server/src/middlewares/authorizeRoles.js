/**
 * middlewares/authorizeRoles.js
 *
 * Role-based access control middleware factory. Returns a middleware that
 * allows through only users whose role is in the allowed list.
 *
 * Must always be used AFTER authenticate (which loads req.user).
 * Using it before authenticate would throw because req.user is undefined.
 *
 * Usage:
 *   router.patch('/ban', authenticate, authorizeRoles('admin'), banUser)
 *   router.get('/stats', authenticate, authorizeRoles('admin','moderator'), getStats)
 */
const ApiError = require('../utils/ApiError');

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user is set by authenticate — if it's missing, the middleware order
    // is wrong (bug in route setup, not in user input)
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
        )
      );
    }

    next();
  };
};

module.exports = authorizeRoles;
