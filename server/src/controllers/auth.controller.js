/**
 * controllers/auth.controller.js
 *
 * Handles all authentication flows:
 *   - register / login / logout
 *   - token refresh (silent, using httpOnly cookie)
 *   - email verification
 *   - forgot / reset password
 *   - GET /auth/me (session restore)
 *
 * Each function is wrapped with asyncHandler in the route file so errors
 * automatically reach the global error handler without explicit try/catch here.
 *
 * Security decisions documented inline where they matter.
 */
const crypto = require('crypto');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshCookieOptions,
  clearRefreshCookieOptions,
} = require('../services/tokenService');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * issueTokens
 * Generates both tokens, pushes the refresh token to the user's DB array,
 * sets the httpOnly cookie, and returns the access token.
 * This single function is called from both register and login so there's
 * no token-issuance logic copy-pasted between them.
 */
const issueTokens = async (user, res) => {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Store the refresh token in the DB so it can be revoked on logout
  // without invalidating all other active sessions (e.g. phone + laptop)
  await User.findByIdAndUpdate(user._id, {
    $push: { refreshTokens: refreshToken },
  });

  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());
  return accessToken;
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * register
 * POST /auth/register
 * Creates a new user account, sends a verification email, and issues tokens
 * so the user is immediately logged in after registration.
 */
const register = async (req, res) => {
  const { name, email, password } = req.body;

  // Check for existing account before attempting insert (cleaner 409 message)
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  // Generate a random verification token; store it plain-text so the email
  // link works without the user copying a hash. We don't hash it here because
  // the risk of a DB breach exposing unverified email tokens is low, and
  // keeping it simple reduces the surface for bugs.
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const user = await User.create({
    name,
    email,
    password, // pre-save hook hashes this before it touches the DB
    emailVerificationToken,
    emailVerificationExpires,
  });

  // Send verification email — if SMTP isn't configured, emailService logs
  // a warning and skips; the user can still use the app without verification
  await sendVerificationEmail(email, emailVerificationToken);

  const accessToken = await issueTokens(user, res);

  res.status(201).json(
    new ApiResponse(201, { user: user.toPublicJSON(), accessToken }, 'Account created successfully')
  );
};

/**
 * login
 * POST /auth/login
 * Verifies credentials and issues tokens. Uses a single generic error message
 * for both "user not found" and "wrong password" to prevent user enumeration.
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  // select('+password') is required because password has select:false in the schema
  const user = await User.findOne({ email }).select('+password');

  // Use a generic message — don't reveal whether the email exists
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (user.isBanned) {
    throw new ApiError(403, `Account banned: ${user.banReason || 'No reason provided.'}`);
  }

  const accessToken = await issueTokens(user, res);

  res.status(200).json(
    new ApiResponse(200, { user: user.toPublicJSON(), accessToken }, 'Logged in successfully')
  );
};

/**
 * logout
 * POST /auth/logout  [auth required]
 * Removes only the refresh token from this device's session so other devices
 * (phone, laptop) remain logged in. Clears the httpOnly cookie.
 */
const logout = async (req, res) => {
  const token = req.cookies.refreshToken;

  if (token) {
    // Remove just this token from the array — not all tokens
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: token },
    });
  }

  res.clearCookie('refreshToken', clearRefreshCookieOptions());
  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
};

/**
 * refreshToken
 * POST /auth/refresh-token  (uses cookie, no auth header needed)
 * Validates the refresh token, verifies it exists in the user's DB array
 * (prevents use of revoked tokens), and issues a new access token.
 *
 * Token rotation: removes the old refresh token and issues a new one.
 * This limits the window in which a stolen refresh token can be used.
 */
const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    throw new ApiError(401, 'No refresh token found. Please log in again.');
  }

  // Verify the token's signature and expiry — throws on failure
  const decoded = verifyRefreshToken(token);

  // Fetch with refreshTokens (select:false field) to check the token is in the DB
  const user = await User.findById(decoded.userId).select('+refreshTokens');

  if (!user || !user.refreshTokens.includes(token)) {
    // Token not in DB — either it was revoked on logout or this is a replay attack
    throw new ApiError(401, 'Invalid or expired session. Please log in again.');
  }

  if (user.isBanned) {
    throw new ApiError(403, `Account banned: ${user.banReason || 'No reason provided.'}`);
  }

  // Token rotation: revoke old token, issue new pair
  await User.findByIdAndUpdate(user._id, {
    $pull: { refreshTokens: token },
  });

  const accessToken = await issueTokens(user, res);

  res.status(200).json(new ApiResponse(200, { accessToken }, 'Token refreshed'));
};

/**
 * verifyEmail
 * GET /auth/verify-email/:token
 * Marks the user's email as verified if the token matches and hasn't expired.
 */
const verifyEmail = async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Email verification link is invalid or has expired.');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.status(200).json(new ApiResponse(200, null, 'Email verified successfully.'));
};

/**
 * forgotPassword
 * POST /auth/forgot-password  {email}
 * Always returns 200 — never reveals whether the email is registered.
 * This prevents user enumeration attacks.
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Still return 200 even if no user found — don't reveal email existence
  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await sendPasswordResetEmail(email, resetToken);
  }

  res.status(200).json(
    new ApiResponse(200, null, 'If an account exists for that email, a reset link has been sent.')
  );
};

/**
 * resetPassword
 * PATCH /auth/reset-password/:token  {password}
 * Sets the new password and invalidates the reset token and ALL refresh tokens
 * (forcing re-login on all devices after a password change — security best practice).
 */
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Password reset link is invalid or has expired.');
  }

  user.password = password; // pre-save hook will hash this
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // Invalidate all refresh tokens — force re-login on all devices
  user.refreshTokens = [];
  await user.save({ validateBeforeSave: false }); // select:false on refreshTokens needs this

  res.clearCookie('refreshToken', clearRefreshCookieOptions());
  res.status(200).json(new ApiResponse(200, null, 'Password reset successful. Please log in.'));
};

/**
 * getMe
 * GET /auth/me  [auth required]
 * Returns the current authenticated user's public profile.
 * Used by the frontend on every app load to restore the session.
 */
const getMe = async (req, res) => {
  // req.user is already loaded by the authenticate middleware
  res.status(200).json(
    new ApiResponse(200, { user: req.user.toPublicJSON() }, 'Current user fetched')
  );
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
};
