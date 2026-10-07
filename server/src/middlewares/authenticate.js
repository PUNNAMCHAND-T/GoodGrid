/**
 * middlewares/authenticate.js
 *
 * Verifies the Bearer access token on every protected route. On success,
 * loads the full user from MongoDB and attaches it to req.user. On failure,
 * throws an ApiError that the global error handler turns into a 401 response.
 *
 * Also checks isBanned: a banned user's token is still cryptographically valid
 * but they must not be allowed through any protected endpoint.
 *
 * The JWT verification logic (verifyAccessToken) is imported from tokenService
 * so it is not duplicated here and in the Socket.IO handshake handler.
 */
const { verifyAccessToken } = require('../services/tokenService');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  // Extract token from "Authorization: Bearer <token>" header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication required. Please log in.');
  }

  const token = authHeader.split(' ')[1];

  // verifyAccessToken throws JsonWebTokenError / TokenExpiredError on failure;
  // errorHandler converts those into clean 401 responses.
  const decoded = verifyAccessToken(token);

  // Load the user from the DB to get current ban status and role.
  // We don't trust the role in the token alone because an admin could have
  // demoted a user between the time the token was issued and now.
  const user = await User.findById(decoded.userId);

  if (!user) {
    throw new ApiError(401, 'User no longer exists. Please log in again.');
  }

  if (user.isBanned) {
    throw new ApiError(
      403,
      `Your account has been banned. Reason: ${user.banReason || 'Not specified.'}`
    );
  }

  // Attach the user document so downstream controllers don't need to re-fetch
  req.user = user;
  next();
});

module.exports = authenticate;
