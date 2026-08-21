const mongoose = require('mongoose');

/**
 * One Review = one doctor's independent, anonymous opinion on a Case.
 * A Case normally accumulates exactly 3 of these before AI synthesis runs.
 */
const reviewSchema = new mongoose.Schema(
  {
    case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    decision: {
      type: String,
      enum: ['safe', 'revisit_doctor'],
      required: true,
    },
    reasoning: {
      type: String,
      required: [true, 'Reasoning is required for every review'],
      trim: true,
    },
    flaggedConcerns: [{ type: String }],
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

/* A doctor can only submit one review per case */
reviewSchema.index({ case: 1, doctor: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
