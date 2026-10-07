/**
 * middlewares/notFound.js
 *
 * Catch-all for any request that didn't match a registered route.
 * Must be registered after all routes in app.js, before errorHandler.
 * Passes an ApiError to the error handler so the response shape is consistent
 * with all other error responses.
 */
const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = notFound;
