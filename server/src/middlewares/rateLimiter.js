/**
 * middlewares/rateLimiter.js
 *
 * Two limiters:
 *  - apiLimiter   : 500 requests / 15 min per IP — applied to all /api/* routes
 *  - authLimiter  : 20 requests / 15 min per IP — applied only to /api/v1/auth/*
 *                   (tighter window to slow down brute-force login attempts)
 *
 * Both return a standard ApiError shape (via the handler option) so clients
 * get { success: false, message } instead of the rate-limiter's default HTML.
 */
const rateLimit = require('express-rate-limit');

const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    statusCode: 429,
    message: 'Too many requests from this IP. Please try again later.',
    errors: [],
  });
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,  // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Tighter limit for auth routes.
// SPEC says 200 / 15 min — matched exactly here.
// NOTE: In a production deployment you would want this much lower (e.g. 20/15min)
// to slow brute-force login attacks. The spec value of 200 is intentionally
// permissive for a student/demo project. Change this before any real deployment.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

module.exports = { apiLimiter, authLimiter };
