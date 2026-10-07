/**
 * models/Request.js
 *
 * Represents a help request posted by a user. Tracks its full lifecycle:
 *   open → in_progress (volunteer accepted) → completed | closed
 *
 * The location field is a GeoJSON Point so MongoDB can run 2dsphere queries
 * for "find requests near me". Coordinates are [longitude, latitude] — the
 * reversed order from what most humans expect. This is called out explicitly
 * to prevent the single most common geospatial bug in this project.
 */
const mongoose = require('mongoose');
const {
  REQUEST_STATUS,
  REQUEST_CATEGORIES,
  URGENCY_LEVELS,
  MAX_IMAGES_PER_REQUEST,
} = require('../utils/constants');

const requestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: REQUEST_CATEGORIES,
    },
    urgency: {
      type: String,
      enum: Object.values(URGENCY_LEVELS),
      default: URGENCY_LEVELS.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(REQUEST_STATUS),
      default: REQUEST_STATUS.OPEN,
    },
    // Cloudinary URLs — max 4 (enforced by upload middleware, also here for safety)
    images: {
      type: [String],
      validate: {
        validator: (arr) => arr.length <= MAX_IMAGES_PER_REQUEST,
        message: `Cannot attach more than ${MAX_IMAGES_PER_REQUEST} images`,
      },
      default: [],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Request must have an owner'],
    },
    // Null until a volunteer is accepted
    acceptedVolunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // GeoJSON Point — coordinates are [longitude, latitude] (NOT lat/lng)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      // [longitude, latitude] — reversed from the human-readable convention!
      coordinates: {
        type: [Number],
        required: [true, 'Location coordinates are required'],
      },
      address: {
        type: String,
        default: '',
      },
    },
    // Denormalised count of volunteer applications — cheaper to display than aggregating
    volunteerCount: {
      type: Number,
      default: 0,
    },
    isReported: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// 2dsphere enables the $near geospatial query in GET /requests/nearby
requestSchema.index({ location: '2dsphere' });
// Compound index speeds up the filtered list endpoint (category + status filters)
requestSchema.index({ status: 1, category: 1 });
// Speeds up GET /requests/my (fetch all requests by a specific user)
requestSchema.index({ owner: 1 });

const Request = mongoose.model('Request', requestSchema);

module.exports = Request;
