/**
 * config/cloudinary.js
 *
 * Initialises the Cloudinary SDK with credentials from env.
 * If any Cloudinary env var is missing the module logs a one-line warning
 * and exports null — callers (upload middleware) check for null and return
 * a 503 instead of crashing or silently dropping images.
 */
const cloudinary = require('cloudinary').v2;
const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = require('./env');

let cloudinaryClient = null;

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });

  cloudinaryClient = cloudinary;
  console.log('[Cloudinary] Initialised — image uploads enabled.');
} else {
  console.warn(
    '[Cloudinary] CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET not set — image uploads are DISABLED.'
  );
}

module.exports = cloudinaryClient;
