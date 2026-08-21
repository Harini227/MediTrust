const mongoose = require('mongoose');

/**
 * In-app notifications shown in the frontend's notification panel.
 * Populated by real events later (case assigned, review submitted, etc.)
 * replacing the frontend's current client-only fake notifications.
 */
const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        'case_assigned',
        'review_submitted',
        'case_conflict',
        'report_ready',
        'payment_received',
        'system',
      ],
      default: 'system',
    },
    relatedCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
