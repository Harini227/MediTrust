const mongoose = require('mongoose');

const activitySessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD for easy daily lookup
      required: true,
      index: true,
    },
    steps: {
      type: Number,
      default: 0,
      min: 0,
    },
    distanceKm: {
      type: Number,
      default: 0,
      min: 0,
    },
    estimatedCalories: {
      type: Number,
      default: 0,
      min: 0,
    },
    durationMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Compound index to speed up daily lookup and aggregates per user
activitySessionSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('ActivitySession', activitySessionSchema);
