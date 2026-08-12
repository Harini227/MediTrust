const User = require('../database/models/User.model');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/token');

/**
 * POST /api/auth/register
 * Creates a new user for a given role. Password is hashed automatically
 * by the User model's pre-save hook.
 */
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, role, ...rest } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return next(new AppError('An account with this email already exists', 409));
  }

  const user = await User.create({ name, email, password, role, ...rest });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
    },
  });
});

/**
 * POST /api/auth/login
 * Matches the frontend's role-tab login (Patient/Doctor/Chief/Admin).
 * Role must match what's stored on the account - prevents a patient
 * account from logging in through the doctor tab, etc.
 */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password, role } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  if (user.role !== role) {
    return next(new AppError(`No ${role} account found with this email`, 401));
  }

  if (!user.isActive) {
    return next(new AppError('This account has been deactivated', 403));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid email or password', 401));
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
    },
  });
});

/**
 * POST /api/auth/refresh
 * Exchanges a valid refresh token for a new access token.
 */
exports.refresh = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return next(new AppError('Refresh token is required', 400));
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    return next(new AppError('Invalid or expired refresh token', 401));
  }

  const user = await User.findById(payload.id);
  if (!user || !user.isActive) {
    return next(new AppError('User no longer exists or is inactive', 401));
  }

  const accessToken = signAccessToken(user);

  res.status(200).json({
    success: true,
    data: { accessToken },
  });
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user (requires `protect` middleware).
 */
exports.me = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  res.status(200).json({ success: true, data: { user: user.toSafeObject() } });
});

/**
 * POST /api/auth/logout
 * Stateless JWT - logout is handled client-side by discarding tokens.
 * This endpoint exists for symmetry / future token-blacklisting.
 */
exports.logout = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});
