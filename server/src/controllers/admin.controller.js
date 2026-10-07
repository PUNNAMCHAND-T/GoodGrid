/**
 * controllers/admin.controller.js
 *
 * Admin-only and moderator endpoints for platform management.
 * All routes in this controller are protected by authenticate +
 * authorizeRoles('admin') or authorizeRoles('admin', 'moderator').
 *
 * Every action calls the real endpoint and returns the actual result —
 * no locally-simulated state changes.
 */
const User = require('../models/User');
const Request = require('../models/Request');
const Notification = require('../models/Notification');
const VolunteerApplication = require('../models/VolunteerApplication');
const Message = require('../models/Message');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { ROLES, PAGINATION } = require('../utils/constants');

/**
 * getStats
 * GET /admin/stats  [admin or moderator]
 * Returns platform-wide counts: users, requests by status, applications,
 * notifications, messages. Used for the admin dashboard overview.
 */
const getStats = async (req, res) => {
  const [
    totalUsers,
    bannedUsers,
    totalRequests,
    openRequests,
    inProgressRequests,
    completedRequests,
    closedRequests,
    totalApplications,
    totalMessages,
    totalNotifications,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isBanned: true }),
    Request.countDocuments(),
    Request.countDocuments({ status: 'open' }),
    Request.countDocuments({ status: 'in_progress' }),
    Request.countDocuments({ status: 'completed' }),
    Request.countDocuments({ status: 'closed' }),
    VolunteerApplication.countDocuments(),
    Message.countDocuments(),
    Notification.countDocuments(),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        users: { total: totalUsers, banned: bannedUsers },
        requests: {
          total: totalRequests,
          open: openRequests,
          inProgress: inProgressRequests,
          completed: completedRequests,
          closed: closedRequests,
        },
        applications: { total: totalApplications },
        messages: { total: totalMessages },
        notifications: { total: totalNotifications },
      },
      'Stats fetched'
    )
  );
};

/**
 * listUsers
 * GET /admin/users  [admin or moderator]
 * Paginated user list with optional search (name/email) and role filter.
 */
const listUsers = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      { data: users.map((u) => u.toPublicJSON()), page, limit, total, totalPages: Math.ceil(total / limit) },
      'Users fetched'
    )
  );
};

/**
 * banUser
 * PATCH /admin/users/:id/ban  [admin only]
 * Bans a user and records the reason. Cannot ban another admin.
 */
const banUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  // Protect admin accounts from being banned by other admins
  if (user.role === ROLES.ADMIN) {
    throw new ApiError(403, 'Cannot ban an admin account.');
  }

  user.isBanned = true;
  user.banReason = req.body.reason || 'No reason provided.';
  await user.save();

  res.status(200).json(new ApiResponse(200, { user: user.toPublicJSON() }, 'User banned'));
};

/**
 * unbanUser
 * PATCH /admin/users/:id/unban  [admin only]
 * Lifts the ban on a user and clears the ban reason.
 */
const unbanUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  user.isBanned = false;
  user.banReason = '';
  await user.save();

  res.status(200).json(new ApiResponse(200, { user: user.toPublicJSON() }, 'User unbanned'));
};

/**
 * changeUserRole
 * PATCH /admin/users/:id/role  [admin only]
 * Changes a user's role. Only admin can promote/demote to moderator or user.
 * Cannot change another admin's role (prevents privilege escalation via the API).
 */
const changeUserRole = async (req, res) => {
  const { role } = req.body;

  if (!Object.values(ROLES).includes(role)) {
    throw new ApiError(400, `Invalid role. Must be one of: ${Object.values(ROLES).join(', ')}`);
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  // Prevent changing another admin's role to avoid privilege escalation
  if (user.role === ROLES.ADMIN && req.user._id.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Cannot change the role of another admin.');
  }

  user.role = role;
  await user.save();

  res.status(200).json(new ApiResponse(200, { user: user.toPublicJSON() }, `User role updated to ${role}`));
};

/**
 * listRequestsAdmin
 * GET /admin/requests  [admin or moderator]
 * Paginated view of all requests for moderation. Supports category and status filters.
 */
const listRequestsAdmin = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;

  const [requests, total] = await Promise.all([
    Request.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('owner', 'name email avatar'),
    Request.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      { data: requests, page, limit, total, totalPages: Math.ceil(total / limit) },
      'Admin requests fetched'
    )
  );
};

/**
 * deleteRequestAdmin
 * DELETE /admin/requests/:id  [admin or moderator]
 * Removes a request for policy violations. Hard delete — no soft-delete
 * needed for this student project scope.
 */
const deleteRequestAdmin = async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Request not found.');

  await request.deleteOne();

  // Decrement the owner's request count
  await User.findByIdAndUpdate(request.owner, { $inc: { requestsCount: -1 } });

  res.status(200).json(new ApiResponse(200, null, 'Request deleted by admin'));
};

module.exports = {
  getStats,
  listUsers,
  banUser,
  unbanUser,
  changeUserRole,
  listRequestsAdmin,
  deleteRequestAdmin,
};
