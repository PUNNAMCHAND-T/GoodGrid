/**
 * services/tokenService.js
 *
 * Centralises all JWT and cookie logic so auth controller, authenticate
 * middleware, and socket auth all use the exact same token functions.
 * Never duplicate JWT signing/verifying in multiple places.
 */
const jwt = require('jsonwebtoken');
const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  NODE_ENV,
} = require('../config/env');

/**
 * generateAccessToken
 * Signs a short-lived access token with {userId, role} in the payload.
 * The payload is NOT encrypted — only signed. Never put sensitive data here.
 */
const generateAccessToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  });
};

/**
 * generateRefreshToken
 * Signs a longer-lived refresh token with only {userId}.
 * The token is stored in the user's refreshTokens[] array in MongoDB so it
 * can be revoked per-device on logout. It is sent only as an httpOnly cookie.
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
};

/**
 * verifyAccessToken
 * Verifies and decodes an access token. Throws if the token is expired or invalid.
 * Returns the decoded payload {userId, role}.
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_ACCESS_SECRET);
};

/**
 * verifyRefreshToken
 * Verifies and decodes a refresh token. Throws if expired or invalid.
 * Returns the decoded payload {userId}.
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

/**
 * getRefreshCookieOptions
 * Returns the httpOnly cookie options for the refresh token.
 * secure:true is only set in production (HTTPS required) so development
 * over plain HTTP still works.
 */
const getRefreshCookieOptions = () => ({
  httpOnly: true,           // JavaScript cannot read this cookie — XSS protection
  secure: NODE_ENV === 'production', // HTTPS-only in prod; plain HTTP allowed in dev
  sameSite: 'strict',       // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
});

/**
 * clearRefreshCookieOptions
 * Cookie options for clearing the refresh token on logout.
 * Must match the set-options exactly (same path/domain) for the browser to
 * recognise it as the same cookie.
 */
const clearRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: 'strict',
});

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshCookieOptions,
  clearRefreshCookieOptions,
};
