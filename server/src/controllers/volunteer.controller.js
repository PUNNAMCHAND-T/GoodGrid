/**
 * controllers/volunteer.controller.js
 *
 * Handles the volunteer application lifecycle:
 *   POST   /requests/:id/volunteer           — apply to volunteer
 *   GET    /requests/:id/volunteers           — owner views all applications
 *   PATCH  /requests/:id/volunteers/:appId/accept — owner accepts one applicant
 *
 * The accept flow is the most complex operation in the backend:
 * it touches Request, VolunteerApplication, Chat, and Notification in one
 * coordinated sequence. Each step is awaited in order; if any throws, the
 * error propagates to the global handler. (Mongo Atlas M0 free tier doesn't
 * support multi-document transactions so we use carefully sequenced awaits
 * and accept the small window of inconsistency — this is acceptable for a
 * student project and is documented here explicitly.)
 */
const mongoose = require('mongoose');
const Request = require('../models/Request');
const VolunteerApplication = require('../models/VolunteerApplication');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { REQUEST_STATUS, APPLICATION_STATUS, NOTIFICATION_TYPES } = require('../utils/constants');

/**
 * applyToVolunteer
 * POST /requests/:id/volunteer  [auth required]
 * Creates a pending VolunteerApplication. If a duplicate exists (same
 * user+request), the DB-level unique index throws a code-11000 error which
 * the global errorHandler converts to a clean 409 response.
 *
 * Also notifies the request owner of the new applicant.
 */
const applyToVolunteer = async (req, res) => {
  const requestId = req.params.id;
  const volunteerId = req.user._id;

  const helpRequest = await Request.findById(requestId);
  if (!helpRequest) throw new ApiError(404, 'Request not found.');

  // Cannot volunteer for own request
  if (helpRequest.owner.toString() === volunteerId.toString()) {
    throw new ApiError(400, 'You cannot volunteer for your own request.');
  }

  // Cannot volunteer for a closed/completed/in-progress request
  if (helpRequest.status !== REQUEST_STATUS.OPEN) {
    throw new ApiError(400, `Cannot apply — request is ${helpRequest.status}.`);
  }

  // Create the application — the unique compound index on {request, volunteer}
  // means Mongoose will throw a duplicate-key error (code 11000) if this user
  // already applied. The errorHandler converts that to a 409 response.
  const application = await VolunteerApplication.create({
    request: requestId,
    volunteer: volunteerId,
    message: req.body.message || '',
  });

  // Increment the denormalised volunteer count on the request
  await Request.findByIdAndUpdate(requestId, { $inc: { volunteerCount: 1 } });

  // Notify the request owner about the new application
  await Notification.create({
    recipient: helpRequest.owner,
    sender: volunteerId,
    type: NOTIFICATION_TYPES.NEW_VOLUNTEER,
    message: `${req.user.name} applied to volunteer for your request "${helpRequest.title}".`,
    link: `/requests/${requestId}`,
    data: { applicationId: application._id },
  });

  res.status(201).json(new ApiResponse(201, { application }, 'Application submitted'));
};

/**
 * getVolunteers
 * GET /requests/:id/volunteers  [auth required, owner only]
 * Returns all applications for the request so the owner can review them.
 */
const getVolunteers = async (req, res) => {
  const helpRequest = await Request.findById(req.params.id);
  if (!helpRequest) throw new ApiError(404, 'Request not found.');

  if (helpRequest.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the request owner can view applications.');
  }

  const applications = await VolunteerApplication.find({ request: req.params.id })
    .populate('volunteer', 'name avatar bio skills availability')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, { data: applications }, 'Volunteers fetched'));
};

/**
 * acceptVolunteer
 * PATCH /requests/:id/volunteers/:appId/accept  [auth required, owner only]
 *
 * The full accept sequence (order matters; failure at any step leaves data
 * partially updated — this is documented as an acceptable limitation on M0):
 *
 *   1. Validate ownership and that request is still open
 *   2. Mark accepted application → "accepted"
 *   3. Mark all other pending applications for this request → "rejected"
 *   4. Set request status → "in_progress", set acceptedVolunteer
 *   5. Find-or-create the Chat for this request
 *   6. Send "volunteer_accepted" notification to the winner
 *   7. Send "volunteer_rejected" to all other applicants
 */
const acceptVolunteer = async (req, res) => {
  const { id: requestId, appId } = req.params;

  const helpRequest = await Request.findById(requestId);
  if (!helpRequest) throw new ApiError(404, 'Request not found.');

  if (helpRequest.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the request owner can accept volunteers.');
  }

  if (helpRequest.status !== REQUEST_STATUS.OPEN) {
    throw new ApiError(400, `Request is already ${helpRequest.status} — cannot accept another volunteer.`);
  }

  // Fetch the application being accepted
  const acceptedApp = await VolunteerApplication.findOne({
    _id: appId,
    request: requestId,
  });

  if (!acceptedApp) throw new ApiError(404, 'Application not found.');
  if (acceptedApp.status === APPLICATION_STATUS.REJECTED) {
    throw new ApiError(400, 'This application has already been rejected.');
  }

  // Step 2: Accept the chosen application
  acceptedApp.status = APPLICATION_STATUS.ACCEPTED;
  await acceptedApp.save();

  // Step 3: Reject all other PENDING applications for this request
  const rejectedApps = await VolunteerApplication.find({
    request: requestId,
    _id: { $ne: appId },
    status: APPLICATION_STATUS.PENDING,
  });

  await VolunteerApplication.updateMany(
    { request: requestId, _id: { $ne: appId }, status: APPLICATION_STATUS.PENDING },
    { $set: { status: APPLICATION_STATUS.REJECTED } }
  );

  // Step 4: Update the request
  helpRequest.status = REQUEST_STATUS.IN_PROGRESS;
  helpRequest.acceptedVolunteer = acceptedApp.volunteer;
  await helpRequest.save();

  // Step 5: Find-or-create the chat for this request
  // Using findOneAndUpdate with upsert so this is safe to call multiple times
  const chat = await Chat.findOneAndUpdate(
    { request: requestId },
    {
      $setOnInsert: {
        request: requestId,
        participants: [helpRequest.owner, acceptedApp.volunteer],
      },
    },
    { upsert: true, new: true }
  );

  // Step 6: Notify the accepted volunteer
  await Notification.create({
    recipient: acceptedApp.volunteer,
    sender: req.user._id,
    type: NOTIFICATION_TYPES.VOLUNTEER_ACCEPTED,
    message: `Your application for "${helpRequest.title}" was accepted! You can now chat with the requester.`,
    link: `/chat/${chat._id}`,
    data: { requestId, chatId: chat._id },
  });

  // Step 7: Notify all rejected applicants
  const rejectionNotifications = rejectedApps.map((app) => ({
    recipient: app.volunteer,
    sender: req.user._id,
    type: NOTIFICATION_TYPES.VOLUNTEER_REJECTED,
    message: `Your application for "${helpRequest.title}" was not selected this time.`,
    link: `/requests/${requestId}`,
    data: { requestId },
  }));

  if (rejectionNotifications.length > 0) {
    await Notification.insertMany(rejectionNotifications);
  }

  res.status(200).json(
    new ApiResponse(
      200,
      { request: helpRequest, acceptedApplication: acceptedApp, chat },
      'Volunteer accepted successfully'
    )
  );
};

module.exports = { applyToVolunteer, getVolunteers, acceptVolunteer };
