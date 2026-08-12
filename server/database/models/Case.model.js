const mongoose = require('mongoose');

/**
 * A Case represents one full patient journey through the MediTrust flow:
 * upload -> doctor selection -> payment -> 3 independent reviews ->
 * AI synthesis -> consensus or chief-doctor escalation -> final report.
 */
const caseSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /* Uploaded documents */
    prescriptionFile: { type: String }, // file path/URL
    labReportFiles: [{ type: String }],
    age: { type: Number, min: 0 },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    symptoms: { type: String, trim: true },
    sideEffects: { type: String, trim: true },
    medicalHistory: { type: String, trim: true },

    /* OCR + AI (dummy in MVP, swappable via services/ocr and services/ai) */
    ocrResult: {
      medicines: [{ type: String }],
      dosages: [{ type: String }],
      rawText: { type: String },
      processedAt: { type: Date },
    },
    aiSummary: {
      internalSynthesis: { type: String },
      status: { type: String },
      whatThisMeans: { type: String },
      nextStep: { type: String },
      warningSigns: [{ type: String }],
      conflictDetected: { type: Boolean, default: false },
      drugInteractionWarnings: [{ type: String }],
      processedAt: { type: Date },
    },

    /* Doctor selection - exactly 3 for the standard flow */
    selectedDoctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    /* Chief doctor assigned only if reviews conflict */
    chiefDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    status: {
      type: String,
      enum: [
        'draft', // patient still filling the wizard
        'pending_payment',
        'pending_review', // paid, waiting on doctors
        'in_review', // at least one review submitted
        'conflict', // reviews disagree, escalated
        'chief_review', // chief doctor reviewing
        'completed', // final report issued
        'cancelled',
      ],
      default: 'draft',
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    patientReport: {
      status: { type: String },
      summary: { type: String },
      whatThisMeans: { type: String },
      nextStep: { type: String },
      warningSigns: [{ type: String }],
    },
    finalReportSummary: { type: String },
    finalRecommendation: {
      type: String,
      enum: ['safe', 'revisit_doctor', null],
      default: null,
    },

    completedAt: { type: Date },
  },
  { timestamps: true }
);

caseSchema.index({ patient: 1, status: 1 });
caseSchema.index({ 'selectedDoctors': 1, status: 1 });

module.exports = mongoose.model('Case', caseSchema);
