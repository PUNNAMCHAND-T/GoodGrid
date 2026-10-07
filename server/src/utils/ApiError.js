/**
 * ApiError.js
 *
 * Custom error class that carries an HTTP status code. Every controller
 * throws this so the global errorHandler knows how to respond — no
 * hand-rolled response shapes scattered through controllers.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g. 400, 401, 404)
   * @param {string} message    - Human-readable error message sent to the client
   * @param {Array}  errors     - Optional per-field validation errors array
   */
  constructor(statusCode, message = 'Something went wrong', errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.success = false;

    // Captures the correct stack trace, omitting the ApiError constructor itself
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
