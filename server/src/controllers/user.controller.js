/**
 * controllers/user.controller.js
 *
 * Handles user profile read and update operations.
 * Does NOT handle auth (login/register) — that's auth.controller.js.
 *
 * Endpoints covered:
 *   GET  /users/me           — own full profile (same as /auth/me but explicit)
 *   PATCH /users/me          — update own profile fields
 *   PATCH /users/me/avatar   — update own avatar (Cloudinary URL set by upload middleware)
 *   GET  /users/:id          — public profile of any user
 *   GET  /users/:id/requests — paginated list of a user's requests
 */
const User = require('../models/User');
const Request = require('../models/Request');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { PAGINATION } = require('../utils/constants');

/**
 * getMyProfile
 * GET /users/me  [auth required]
 * Returns the full profile of the currently authenticated user.
 */
const getMyProfile = async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, { user: req.user.toPublicJSON() }, 'Profile fetched')
  );
};

/**
 * updateMyProfile
 * PATCH /users/me  [auth required]
 * Allows the user to update name, bio, availability, skills, and location.
 * Only the provided fields are updated — omitted fields are unchanged.
 */
const updateMyProfile = async (req, res) => {
  // Whitelist of fields a user is allowed to update on themselves
  const allowedFields = ['name', 'bio', 'availability', 'skills'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Location update: expects { lat, lng, address } in the body.
  // GeoJSON stores [longitude, latitude] — note the order!
  if (req.body.lat !== undefined && req.body.lng !== undefined) {
    updates.location = {
      type: 'Point',
      // [longitude, latitude] — reversed from the human-readable convention!
      coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)],
      address: req.body.address || '',
    };
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  res.status(200).json(
    new ApiResponse(200, { user: updatedUser.toPublicJSON() }, 'Profile updated')
  );
};

/**
 * updateMyAvatar
 * PATCH /users/me/avatar  [auth required]
 * The upload middleware streams the file to Cloudinary and sets req.avatarUrl.
 * This controller just writes that URL to the DB and responds.
 */
const updateMyAvatar = async (req, res) => {
  if (!req.avatarUrl) {
    throw new ApiError(400, 'No image file provided.');
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: req.avatarUrl },
    { new: true }
  );

  res.status(200).json(
    new ApiResponse(200, { user: updatedUser.toPublicJSON() }, 'Avatar updated')
  );
};

/**
 * getUserProfile
 * GET /users/:id  [auth required]
 * Returns the public profile of any user. Strips sensitive fields via
 * toPublicJSON to make sure private data isn't accidentally exposed.
 */
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  res.status(200).json(
    new ApiResponse(200, { user: user.toPublicJSON() }, 'User profile fetched')
  );
};

/**
 * getUserRequests
 * GET /users/:id/requests  [auth required]
 * Returns a paginated list of help requests created by the specified user.
 */
const getUserRequests = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    Request.find({ owner: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('owner', 'name avatar'),
    Request.countDocuments({ owner: req.params.id }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        data: requests,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      'User requests fetched'
    )
  );
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  updateMyAvatar,
  getUserProfile,
  getUserRequests,
};
