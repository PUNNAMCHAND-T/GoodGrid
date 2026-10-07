/**
 * middlewares/validate.js
 *
 * Collects express-validator errors after the validation chain runs and
 * converts them into a single ApiError(422) with a per-field errors array.
 * This keeps the error format consistent with all other error responses
 * and removes boilerplate from every controller that uses validation.
 *
 * Usage (in a route file):
 *   const { body } = require('express-validator');
 *   router.post('/register',
 *     [body('email').isEmail(), body('password').isLength({ min: 6 })],
 *     validate,
 *     asyncHandler(authController.register)
 *   );
 */
const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (req, res, next) => {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    // Map to { field, message } shape for consistent client-side handling
    const errors = result.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return next(new ApiError(422, 'Validation failed', errors));
  }

  next();
};

module.exports = validate;
