/**
 * middlewares/errorHandler.js
 *
 * Global error handler — must be the LAST middleware registered in app.js.
 * Express identifies it as an error handler because it accepts four arguments
 * (err, req, res, next). All unhandled errors (ApiError or unexpected) flow
 * here so controllers never hand-roll their own error response format.
 *
 * In production, stack traces are logged server-side only — not exposed to
 * the client, which would leak implementation details.
 */
const ApiError = require('../utils/ApiError');
const { NODE_ENV } = require('../config/env');

const errorHandler = (err, req, res, next) => {
  // ── Determine status code and message ────────────────────────────────────
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Mongoose CastError (e.g. invalid ObjectId in a route param)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field '${err.path}': ${err.value}`;
  }

  // Mongoose duplicate key error (e.g. duplicate email on register)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with that ${field} already exists.`;
  }

  // Mongoose validation error (schema-level, not express-validator)
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired. Please log in again.';
  }

  // Always log full stack server-side so nothing is silently lost
  if (NODE_ENV !== 'test') {
    console.error(`[ERROR] ${statusCode} — ${message}`, err.stack || '');
  }

  // ── Build response ────────────────────────────────────────────────────────
  const response = {
    success: false,
    statusCode,
    message,
    errors,
  };

  // In development, attach the stack trace to help debugging
  if (NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
