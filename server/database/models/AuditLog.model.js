const mongoose = require('mongoose');

/**
 * Records who did what, when - required for a compliance-minded healthcare
 * product (mirrors the blueprint's "auditable, trustworthy review trail").
 * Written to by controllers whenever a sensitive action occurs
 * (login, case status change, review submission, payment, etc.)
 */
const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    action: {
      type: String,
      required: true, // e.g. 'LOGIN', 'CASE_CREATED', 'REVIEW_SUBMITTED'
    },
    entityType: {
      type: String, // e.g. 'Case', 'Review', 'Payment'
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    ipAddress: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
