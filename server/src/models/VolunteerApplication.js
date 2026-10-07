/**
 * models/VolunteerApplication.js
 *
 * Records a user's application to volunteer for a help request.
 *
 * The UNIQUE compound index on {request, volunteer} is the critical piece
 * that prevents duplicate applications. This must exist as a real database
 * index — application-level checks alone are not sufficient because two
 * simultaneous requests could both pass the check before either is written.
 *
 * The lifecycle:
 *   pending → accepted (all others for the same request → rejected)
 *   pending → rejected
 */
const mongoose = require('mongoose');
const { APPLICATION_STATUS } = require('../utils/constants');

const volunteerApplicationSchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: [true, 'Application must be linked to a request'],
    },
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Application must have a volunteer'],
    },
    message: {
      type: String,
      trim: true,
      maxlength: [300, 'Application message cannot exceed 300 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.PENDING,
    },
  },
  {
    timestamps: true,
  }
);

// DB-level unique constraint: one application per (request, volunteer) pair.
// Without this, two simultaneous requests could both insert successfully.
volunteerApplicationSchema.index(
  { request: 1, volunteer: 1 },
  { unique: true }
);

const VolunteerApplication = mongoose.model(
  'VolunteerApplication',
  volunteerApplicationSchema
);

module.exports = VolunteerApplication;
