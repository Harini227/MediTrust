const mongoose = require('mongoose');

/**
 * Tracks the consultation fee payment for a Case.
 * MVP uses a dummy ₹500 success flow; `provider`/`providerPaymentId` are
 * pre-wired so swapping in Razorpay later only touches services/payment.
 */
const paymentSchema = new mongoose.Schema(
  {
    case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 500,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
    },
    provider: {
      type: String,
      enum: ['dummy', 'razorpay'],
      default: 'dummy',
    },
    providerPaymentId: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
