const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Runs after express-validator body() checks - collects any validation
 * errors and throws a single 400 AppError with a readable message.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((e) => e.msg)
      .join(', ');
    return next(new AppError(message, 400));
  }
  next();
}

module.exports = validate;
