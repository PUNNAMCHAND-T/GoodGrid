/**
 * config/env.js
 *
 * Validates that every required environment variable is present at startup.
 * If any are missing the server exits immediately with a clear error message
 * naming exactly which variable is absent — failing fast is better than
 * running silently broken (e.g. with an undefined JWT_ACCESS_SECRET).
 *
 * Optional variables are loaded here too; callers import from this module
 * rather than reading process.env directly, so there's one place to look.
 */
require('dotenv').config();

const REQUIRED_VARS = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CLIENT_URL',
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `\n[CONFIG ERROR] The following required environment variables are missing:\n  ${missing.join('\n  ')}\n\nAdd them to your .env file. See .env.example for the full list.\n`
  );
  process.exit(1);
}

module.exports = {
  // ── Required ─────────────────────────────────────────────────────────────
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  CLIENT_URL: process.env.CLIENT_URL,

  // ── Optional with safe defaults ───────────────────────────────────────────
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Google OAuth — undefined if not set; passport strategy is skipped
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || null,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || null,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || null,

  // Cloudinary — undefined if not set; upload middleware returns 503
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || null,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || null,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || null,

  // SMTP — undefined if not set; emailService logs a warning and skips
  SMTP_HOST: process.env.SMTP_HOST || null,
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : null,
  SMTP_USER: process.env.SMTP_USER || null,
  SMTP_PASS: process.env.SMTP_PASS || null,
  EMAIL_FROM: process.env.EMAIL_FROM || null,
};
