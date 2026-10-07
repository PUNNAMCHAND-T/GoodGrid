/**
 * services/emailService.js
 *
 * Sends transactional emails (verification, password reset) via Nodemailer.
 * If SMTP credentials are not configured, every send call logs a warning and
 * returns without crashing — the app is still fully usable without email.
 *
 * Template functions build the email HTML; they live here so the auth
 * controller stays focused on request/response logic.
 */
const nodemailer = require('nodemailer');
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, CLIENT_URL } = require('../config/env');

// ── Build the transporter once (or null if SMTP is not configured) ────────────
let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT || 587,
    secure: SMTP_PORT === 465, // true for port 465 (SSL), false for 587 (TLS)
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  console.log('[Email] SMTP transporter configured — email sending enabled.');
} else {
  console.warn('[Email] SMTP_HOST / SMTP_USER / SMTP_PASS not set — email sending is DISABLED.');
}

/**
 * sendEmail
 * Low-level send helper. Callers (e.g. sendVerificationEmail) use this.
 * If the transporter isn't configured, logs that the email was skipped
 * (with the subject and recipient) so the developer can see what would
 * have been sent during local testing.
 *
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    console.log(`[Email] SKIPPED (SMTP not configured) → To: ${to} | Subject: ${subject}`);
    return;
  }

  await transporter.sendMail({
    from: EMAIL_FROM || SMTP_USER,
    to,
    subject,
    html,
  });
};

/**
 * sendVerificationEmail
 * Sends an account email-verification link to a newly registered user.
 * The token is a random hex string stored hashed in the DB; the URL
 * hits GET /auth/verify-email/:token.
 *
 * @param {string} email
 * @param {string} token - Plain-text verification token (not hashed)
 */
const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${CLIENT_URL}/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: 'GoodGrid — Verify your email address',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to GoodGrid!</h2>
        <p>Please verify your email address by clicking the button below.
           This link expires in 24 hours.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:12px 24px;background:#4f46e5;
                  color:#fff;text-decoration:none;border-radius:6px;">
          Verify Email
        </a>
        <p style="margin-top:16px;color:#666;font-size:13px;">
          Or copy this URL into your browser:<br>${verifyUrl}
        </p>
      </div>
    `,
  });
};

/**
 * sendPasswordResetEmail
 * Sends a password-reset link. The token hits PATCH /auth/reset-password/:token.
 * Expires in 1 hour. The response to forgot-password is always 200 regardless
 * of whether the email exists — this prevents user enumeration.
 *
 * @param {string} email
 * @param {string} token - Plain-text reset token (not hashed)
 */
const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${CLIENT_URL}/reset-password/${token}`;

  await sendEmail({
    to: email,
    subject: 'GoodGrid — Reset your password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You (or someone else) requested a password reset for your GoodGrid account.
           Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 24px;background:#4f46e5;
                  color:#fff;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
        <p style="margin-top:16px;color:#666;font-size:13px;">
          If you didn't request this, you can safely ignore this email.<br>
          Or copy this URL: ${resetUrl}
        </p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
