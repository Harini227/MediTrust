const logger = require('../utils/logger');

/**
 * Custom application error class - use this in controllers/services
 * to throw errors with a defined HTTP status code.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/* 404 handler - must be registered after all routes */
function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
}

/* Global error handler - must be registered last */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  if (!isOperational) {
    logger.error(err);
  } else {
    logger.warn(`${statusCode} - ${err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = { AppError, notFound, errorHandler };
