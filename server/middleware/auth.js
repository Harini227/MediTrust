const { verifyAccessToken } = require('../utils/token');
const { AppError } = require('./errorHandler');
const User = require('../database/models/User.model');
const catchAsync = require('../utils/catchAsync');

/**
 * Verifies the Bearer token in the Authorization header and attaches
 * the authenticated user's { id, role } to req.user.
 * Use on any route that requires login.
 */
exports.protect = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Not authenticated. Please log in.', 401));
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    return next(new AppError('Invalid or expired token. Please log in again.', 401));
  }

  const user = await User.findById(payload.id);
  if (!user || !user.isActive) {
    return next(new AppError('User no longer exists or is inactive', 401));
  }

  req.user = { id: user._id.toString(), role: user.role };
  next();
});

/**
 * Restricts a route to specific role(s). Use after `protect`.
 * Example: router.get('/admin-only', protect, restrictTo('admin'), handler)
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
