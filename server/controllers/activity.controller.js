const ActivitySession = require('../database/models/ActivitySession.model');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');

/**
 * POST /api/activity/session
 * Save a completed tracking session
 */
exports.saveSession = catchAsync(async (req, res, next) => {
  const { steps, distanceKm, estimatedCalories, durationMinutes } = req.body;

  // Validation (also enforced by validator, but safe to check here)
  if (steps === undefined || distanceKm === undefined || estimatedCalories === undefined || durationMinutes === undefined) {
    return next(new AppError('Please provide steps, distanceKm, estimatedCalories, and durationMinutes', 400));
  }

  // Ensure positive values
  if (steps < 0 || distanceKm < 0 || estimatedCalories < 0 || durationMinutes < 0) {
    return next(new AppError('Values cannot be negative', 400));
  }

  const dateStr = req.body.date || new Date().toISOString().split('T')[0];

  const session = await ActivitySession.create({
    userId: req.user.id,
    date: dateStr,
    steps: Number(steps),
    distanceKm: Number(distanceKm),
    estimatedCalories: Number(estimatedCalories),
    durationMinutes: Number(durationMinutes)
  });

  res.status(201).json({
    success: true,
    message: 'Activity session saved successfully',
    data: { session }
  });
});

/**
 * GET /api/activity/today
 * Retrieve the aggregated activity data for "today"
 */
exports.getTodayActivity = catchAsync(async (req, res, next) => {
  const dateStr = req.query.date || new Date().toISOString().split('T')[0];

  // Aggregate all sessions for today for this user
  const sessions = await ActivitySession.find({
    userId: req.user.id,
    date: dateStr
  });

  const summary = sessions.reduce(
    (acc, curr) => {
      acc.steps += curr.steps;
      acc.distanceKm += curr.distanceKm;
      acc.estimatedCalories += curr.estimatedCalories;
      acc.durationMinutes += curr.durationMinutes;
      return acc;
    },
    { steps: 0, distanceKm: 0, estimatedCalories: 0, durationMinutes: 0 }
  );

  // Round distance and calories to 2 decimal places
  summary.distanceKm = Math.round(summary.distanceKm * 100) / 100;
  summary.estimatedCalories = Math.round(summary.estimatedCalories * 100) / 100;

  res.status(200).json({
    success: true,
    data: {
      date: dateStr,
      summary,
      sessionsCount: sessions.length
    }
  });
});

/**
 * GET /api/activity/history
 * Retrieve the history of activity sessions
 */
exports.getActivityHistory = catchAsync(async (req, res, next) => {
  // Return the last 30 sessions, sorted newest first
  const sessions = await ActivitySession.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(30);

  res.status(200).json({
    success: true,
    data: { sessions }
  });
});
