/**
 * models/User.js
 *
 * Represents a GoodGrid user. Can be a regular user, moderator, or admin.
 * Stores auth credentials (hashed password + refresh tokens), profile info,
 * geolocation for nearby request search, and optional OAuth identifiers.
 *
 * Security notes:
 *  - password has select:false so it is never accidentally returned in queries
 *  - refreshTokens has select:false for the same reason
 *  - The pre-save hook only re-hashes if password was actually modified,
 *    preventing double-hashing on unrelated updates
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, AVAILABILITY, BCRYPT_SALT_ROUNDS } = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    // select:false — never returned unless explicitly .select('+password')
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: '', // Cloudinary URL once uploaded
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
    },
    bio: {
      type: String,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
      default: '',
    },
    skills: {
      type: [String],
      default: [],
    },
    availability: {
      type: String,
      enum: Object.values(AVAILABILITY),
      default: AVAILABILITY.AVAILABLE,
    },
    // GeoJSON Point — coordinates are [longitude, latitude] (NOT lat/lng)
    // This order is a common source of bugs; it is enforced everywhere coords
    // are read from the request body.
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      // [longitude, latitude] — note the order!
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
      address: {
        type: String,
        default: '',
      },
    },
    // Google OAuth ID — sparse so null values don't collide in the unique index
    googleId: {
      type: String,
      sparse: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    // One entry per active device/session — select:false so tokens are never
    // accidentally returned in API responses
    refreshTokens: {
      type: [String],
      select: false,
      default: [],
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: '',
    },
    // Denormalised counts — updated when requests/volunteer records are created
    // or deleted. Faster for dashboard display than running aggregation queries.
    requestsCount: {
      type: Number,
      default: 0,
    },
    volunteersCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// 2dsphere index on location enables geospatial $near queries
userSchema.index({ location: '2dsphere' });
// googleId sparse unique index is declared inline on the field (sparse:true) — no duplicate needed
// email unique index is declared inline on the field (unique:true) — no duplicate needed

// ── Pre-save hook ─────────────────────────────────────────────────────────────
// Hash the password before saving — but only if it was actually changed.
// Without the isModified check, every save (e.g. updating bio) would trigger
// a bcrypt hash of an already-hashed string, corrupting the password.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  // BCRYPT_SALT_ROUNDS = 12 (defined in constants.js)
  this.password = await bcrypt.hash(this.password, BCRYPT_SALT_ROUNDS);
  next();
});

// ── Instance methods ──────────────────────────────────────────────────────────

/**
 * comparePassword
 * Checks a plain-text candidate against the stored bcrypt hash.
 * Returns true if they match, false otherwise.
 * Must be called on a user document fetched with .select('+password').
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * toPublicJSON
 * Returns a plain object with sensitive fields stripped.
 * Use this before sending any user data to the client — never send the raw
 * Mongoose document which could include password, tokens, etc. if .select
 * wasn't used correctly throughout.
 */
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
