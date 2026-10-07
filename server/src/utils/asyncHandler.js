/**
 * asyncHandler.js
 *
 * Wraps an async Express route handler so rejected promises are automatically
 * forwarded to the global error handler via next(err). Without this wrapper
 * every controller would need its own try/catch just to call next(err).
 *
 * Usage:
 *   router.get('/foo', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
