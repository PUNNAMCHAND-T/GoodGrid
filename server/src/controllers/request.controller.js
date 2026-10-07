/**
 * controllers/request.controller.js
 *
 * Handles all help request CRUD operations plus the geospatial "nearby"
 * search and the request status lifecycle (open → in_progress → completed/closed).
 *
 * Geospatial note: MongoDB's $near operator expects coordinates in GeoJSON
 * order, which is [longitude, latitude] — NOT [latitude, longitude].
 * This is the single most common bug in this project and is called out
 * explicitly wherever coordinates are read from request.query or request.body.
 */
const Request = require('../models/Request');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const {
  REQUEST_STATUS,
  NOTIFICATION_TYPES,
  PAGINATION,
} = require('../utils/constants');

/**
 * listRequests
 * GET /requests  [auth required]
 * Returns a paginated, filterable list of requests.
 * Filters: category, status, urgency (all optional, ANDed together).
 */
const listRequests = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  // Build filter object from optional query params
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.urgency) filter.urgency = req.query.urgency;

  const [requests, total] = await Promise.all([
    Request.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('owner', 'name avatar'),
    Request.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, { data: requests, page, limit, total, totalPages: Math.ceil(total / limit) }, 'Requests fetched')
  );
};

/**
 * getNearbyRequests
 * GET /requests/nearby?lat=&lng=&distance=  [auth required]
 *
 * Uses MongoDB's $near geospatial operator to find open requests within
 * `distance` km of the given coordinates.
 *
 * IMPORTANT: GeoJSON coordinates are [longitude, latitude] — NOT [lat, lng].
 * The query params are named lat/lng for human readability, but they are
 * reversed when stored in the $geometry object below.
 */
const getNearbyRequests = async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const distanceKm = parseFloat(req.query.distance) || 10; // default 10 km
  const distanceMeters = distanceKm * 1000;

  const requests = await Request.find({
    status: REQUEST_STATUS.OPEN,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          // [longitude, latitude] — note the reversed order!
          coordinates: [lng, lat],
        },
        $maxDistance: distanceMeters,
      },
    },
  })
    .limit(PAGINATION.MAX_LIMIT)
    .populate('owner', 'name avatar');

  res.status(200).json(
    new ApiResponse(200, { data: requests, total: requests.length }, 'Nearby requests fetched')
  );
};

/**
 * getMyRequests
 * GET /requests/my  [auth required]
 * Returns the authenticated user's own requests (paginated).
 */
const getMyRequests = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    Request.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Request.countDocuments({ owner: req.user._id }),
  ]);

  res.status(200).json(
    new ApiResponse(200, { data: requests, page, limit, total, totalPages: Math.ceil(total / limit) }, 'My requests fetched')
  );
};

/**
 * getMyApplications
 * GET /requests/my/applications  [auth required]
 * Returns requests the user has applied to volunteer for.
 */
const getMyApplications = async (req, res) => {
  const VolunteerApplication = require('../models/VolunteerApplication');

  const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const [applications, total] = await Promise.all([
    VolunteerApplication.find({ volunteer: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'request',
        populate: { path: 'owner', select: 'name avatar' },
      }),
    VolunteerApplication.countDocuments({ volunteer: req.user._id }),
  ]);

  res.status(200).json(
    new ApiResponse(200, { data: applications, page, limit, total, totalPages: Math.ceil(total / limit) }, 'My applications fetched')
  );
};

/**
 * createRequest
 * POST /requests  [auth required]
 * Creates a new help request. Images (uploaded via handleRequestImages
 * middleware) arrive in req.imageUrls.
 *
 * Location comes as lat/lng/address in the multipart body — stored as
 * GeoJSON [longitude, latitude] (reversed from human-readable order).
 */
const createRequest = async (req, res) => {
  const { title, description, category, urgency, lat, lng, address } = req.body;

  const request = await Request.create({
    title,
    description,
    category,
    urgency,
    owner: req.user._id,
    images: req.imageUrls || [],
    location: {
      type: 'Point',
      // [longitude, latitude] — reversed from the human-readable convention!
      coordinates: [parseFloat(lng), parseFloat(lat)],
      address: address || '',
    },
  });

  // Increment the user's denormalised requestsCount
  await User.findByIdAndUpdate(req.user._id, { $inc: { requestsCount: 1 } });

  res.status(201).json(new ApiResponse(201, { request }, 'Request created'));
};

/**
 * getRequest
 * GET /requests/:id  [auth required]
 * Returns a single request with owner populated.
 */
const getRequest = async (req, res) => {
  const request = await Request.findById(req.params.id)
    .populate('owner', 'name avatar bio')
    .populate('acceptedVolunteer', 'name avatar');

  if (!request) throw new ApiError(404, 'Request not found.');

  res.status(200).json(new ApiResponse(200, { request }, 'Request fetched'));
};

/**
 * updateRequest
 * PATCH /requests/:id  [owner only]
 * Updates editable fields on a request. Cannot change status here
 * (status changes have dedicated close/complete endpoints).
 */
const updateRequest = async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Request not found.');

  // Ownership check before mutation — 403 for non-owners
  if (request.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only edit your own requests.');
  }

  const allowedFields = ['title', 'description', 'category', 'urgency'];
  const updates = {};
  allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const updated = await Request.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  res.status(200).json(new ApiResponse(200, { request: updated }, 'Request updated'));
};

/**
 * deleteRequest
 * DELETE /requests/:id  [owner only]
 * Deletes the request and decrements the user's requestsCount.
 */
const deleteRequest = async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Request not found.');

  if (request.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only delete your own requests.');
  }

  await request.deleteOne();
  await User.findByIdAndUpdate(req.user._id, { $inc: { requestsCount: -1 } });

  res.status(200).json(new ApiResponse(200, null, 'Request deleted'));
};

/**
 * closeRequest
 * PATCH /requests/:id/close  [owner only]
 * Moves a request to "closed" (owner decided not to proceed).
 * Only valid from "open" or "in_progress" state.
 */
const closeRequest = async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Request not found.');

  if (request.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the owner can close this request.');
  }
  if (request.status === REQUEST_STATUS.COMPLETED || request.status === REQUEST_STATUS.CLOSED) {
    throw new ApiError(400, `Request is already ${request.status}.`);
  }

  request.status = REQUEST_STATUS.CLOSED;
  await request.save();

  // Notify accepted volunteer (if any) that the request was closed
  if (request.acceptedVolunteer) {
    await Notification.create({
      recipient: request.acceptedVolunteer,
      sender: req.user._id,
      type: NOTIFICATION_TYPES.REQUEST_CLOSED,
      message: `The request "${request.title}" has been closed by the owner.`,
      link: `/requests/${request._id}`,
    });
  }

  res.status(200).json(new ApiResponse(200, { request }, 'Request closed'));
};

/**
 * completeRequest
 * PATCH /requests/:id/complete  [owner only]
 * Marks a request as completed. Only valid from "in_progress".
 */
const completeRequest = async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Request not found.');

  if (request.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the owner can complete this request.');
  }
  if (request.status !== REQUEST_STATUS.IN_PROGRESS) {
    throw new ApiError(400, 'Only in-progress requests can be marked as completed.');
  }

  request.status = REQUEST_STATUS.COMPLETED;
  await request.save();

  // Notify the volunteer their help was recognised as complete
  if (request.acceptedVolunteer) {
    await Notification.create({
      recipient: request.acceptedVolunteer,
      sender: req.user._id,
      type: NOTIFICATION_TYPES.REQUEST_COMPLETED,
      message: `The request "${request.title}" has been marked as completed. Thank you for helping!`,
      link: `/requests/${request._id}`,
    });

    // Increment volunteer's volunteersCount for this completion
    await User.findByIdAndUpdate(request.acceptedVolunteer, { $inc: { volunteersCount: 1 } });
  }

  res.status(200).json(new ApiResponse(200, { request }, 'Request marked as completed'));
};

module.exports = {
  listRequests,
  getNearbyRequests,
  getMyRequests,
  getMyApplications,
  createRequest,
  getRequest,
  updateRequest,
  deleteRequest,
  closeRequest,
  completeRequest,
};
