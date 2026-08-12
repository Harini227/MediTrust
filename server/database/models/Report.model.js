const mongoose = require('mongoose');

/**
 * The final, patient-facing report for a Case. Generated either from
 * AI-synthesized doctor consensus, or from the Chief Doctor's ruling
 * when the 3 reviews conflict.
 */
const reportSchema = new mongoose.Schema(
  {
    case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      unique: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['ai_consensus', 'chief_doctor'],
      required: true,
    },
    chiefDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    recommendation: {
      type: String,
      enum: ['safe', 'revisit_doctor'],
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    internalSynthesis: {
      type: String,
    },
    patientReport: {
      status: { type: String },
      summary: { type: String },
      whatThisMeans: { type: String },
      nextStep: { type: String },
      warningSigns: [{ type: String }],
    },
    doctorOpinionsSnapshot: [
      {
        doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        decision: { type: String },
        reasoning: { type: String },
      },
    ],
    drugInteractionWarnings: [{ type: String }],
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
