const Notification = require('../database/models/Notification.model');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/notifications
 * All notifications for the logged-in user (any role), newest first.
 * Backs the frontend's notification panel, replacing its current
 * client-only fake notifications.
 */
exports.getMyNotifications = catchAsync(async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50);

  const unreadCount = await Notification.countDocuments({
    user: req.user.id,
    isRead: false,
  });

  res.status(200).json({ success: true, data: { notifications, unreadCount } });
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read (e.g. when the user clicks it).
 */
exports.markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }

  res.status(200).json({ success: true, data: { notification } });
});

/**
 * PATCH /api/notifications/read-all
 * Mark every notification for this user as read (e.g. "clear all" button).
 */
exports.markAllAsRead = catchAsync(async (req, res) => {
  await Notification.updateMany(
    { user: req.user.id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});
