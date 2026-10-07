/**
 * ApiResponse.js
 *
 * Wraps every successful response in a consistent shape so the frontend
 * always knows exactly where to find data, pagination info, and the status.
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code (2xx)
   * @param {*}      data       - Payload to send (object, array, null, etc.)
   * @param {string} message    - Human-readable success message
   */
  constructor(statusCode, data, message = 'Success') {
    this.success = true;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}

module.exports = ApiResponse;
