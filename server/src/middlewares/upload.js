/**
 * middlewares/upload.js
 *
 * Multer memory-storage configuration + Cloudinary streaming pipeline.
 *
 * Memory storage is used instead of disk storage so the buffer can be
 * streamed directly to Cloudinary without writing a temporary file. This
 * is safer in cloud environments where the filesystem may be ephemeral.
 *
 * Constraints enforced here (and also in the Request model for belt-and-
 * suspenders safety):
 *   - Images only (MIME type check)
 *   - Max 5 MB per file
 *   - Max 4 files per upload (for request images)
 *
 * If Cloudinary is not configured, the upload handler returns a 503
 * instead of silently accepting the file and then losing it.
 */
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');
const { MAX_FILE_SIZE_BYTES, MAX_IMAGES_PER_REQUEST } = require('../utils/constants');

// ── Multer configuration ──────────────────────────────────────────────────────

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Only allow image MIME types
  if (!file.mimetype.startsWith('image/')) {
    return cb(new ApiError(400, 'Only image files are allowed.'), false);
  }
  cb(null, true);
};

// Single-file uploader (for avatar)
const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
}).single('avatar');

// Multi-file uploader (for request images, max 4)
const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_IMAGES_PER_REQUEST },
}).array('images', MAX_IMAGES_PER_REQUEST);

// ── Cloudinary streaming helper ───────────────────────────────────────────────

/**
 * uploadToCloudinary
 * Streams a file buffer to Cloudinary and resolves with the secure_url.
 * Using a stream avoids writing the buffer to disk.
 *
 * @param {Buffer} buffer - File buffer from Multer memory storage
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<string>} secure_url of the uploaded image
 */
const uploadToCloudinary = (buffer, folder = 'goodgrid') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        transformation: [
          { width: 800, crop: 'limit' }, // never store images wider than 800px
        ],
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(new ApiError(500, `Cloudinary upload failed: ${error.message}`));
        resolve(result.secure_url);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// ── Exported middleware wrappers ──────────────────────────────────────────────

/**
 * handleAvatarUpload
 * Middleware chain for single avatar upload. If Cloudinary is not configured,
 * returns 503 immediately — don't accept files that can't be stored.
 *
 * Attaches req.avatarUrl with the Cloudinary URL on success so the controller
 * just reads req.avatarUrl without repeating upload logic.
 */
const handleAvatarUpload = [
  (req, res, next) => {
    if (!cloudinary) {
      return next(
        new ApiError(503, 'Image uploads are currently disabled (Cloudinary not configured).')
      );
    }
    // Wrap Multer's callback-style middleware so errors go through next()
    uploadSingle(req, res, (err) => {
      if (err) return next(new ApiError(400, err.message));
      next();
    });
  },
  async (req, res, next) => {
    if (!req.file) return next(); // no file uploaded — controller handles no-op
    try {
      req.avatarUrl = await uploadToCloudinary(req.file.buffer, 'goodgrid/avatars');
      next();
    } catch (err) {
      next(err);
    }
  },
];

/**
 * handleRequestImages
 * Middleware chain for uploading up to 4 request images. Returns all
 * uploaded URLs in req.imageUrls as an array.
 */
const handleRequestImages = [
  (req, res, next) => {
    if (!cloudinary) {
      return next(
        new ApiError(503, 'Image uploads are currently disabled (Cloudinary not configured).')
      );
    }
    uploadMultiple(req, res, (err) => {
      if (err) return next(new ApiError(400, err.message));
      next();
    });
  },
  async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      req.imageUrls = [];
      return next();
    }
    try {
      req.imageUrls = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer, 'goodgrid/requests'))
      );
      next();
    } catch (err) {
      next(err);
    }
  },
];

module.exports = { handleAvatarUpload, handleRequestImages };
