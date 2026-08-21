const Case = require('../database/models/Case.model');
const Review = require('../database/models/Review.model');
const Report = require('../database/models/Report.model');
const User = require('../database/models/User.model');
const Notification = require('../database/models/Notification.model');
const aiService = require('./ai');

/**
 * Called after a doctor submits a review. Checks whether all 3 reviews
 * for the case are now in - if so, runs AI synthesis and either:
 *   - marks the case completed (consensus) + creates the final Report, or
 *   - escalates to a Chief Doctor (conflict detected)
 * Mirrors the workflow diagram: 3 reviews -> AI synthesis -> consensus or
 * Chief Doctor escalation -> final report.
 */
async function maybeFinalizeCase(caseId) {
  const existingCase = await Case.findById(caseId);
  const reviews = await Review.find({ case: caseId });

  if (reviews.length < 3) {
    // Still waiting on more doctors
    existingCase.status = 'in_review';
    await existingCase.save();
    return { finalized: false };
  }

  const safeCount = reviews.filter((r) => r.decision === 'safe').length;
  const isConflict = safeCount > 0 && safeCount < reviews.length;

  const aiResult = await aiService.synthesize({
    symptoms: existingCase.symptoms,
    medicines: existingCase.ocrResult?.medicines || [],
    reviews: reviews.map((r) => ({ decision: r.decision, reasoning: r.reasoning })),
  });

  existingCase.aiSummary = {
    synthesis: aiResult.synthesis,
    conflictDetected: isConflict,
    drugInteractionWarnings: aiResult.drugInteractionWarnings,
    processedAt: aiResult.processedAt,
  };

  if (isConflict) {
    // Escalate to any available Chief Doctor
    const chief = await User.findOne({ role: 'chief', isActive: true });
    existingCase.status = 'conflict';
    existingCase.chiefDoctor = chief ? chief._id : undefined;
    await existingCase.save();

    if (chief) {
      await Notification.create({
        user: chief._id,
        title: 'Case escalated for your review',
        message: 'Doctors disagreed on a case - your final ruling is needed.',
        type: 'case_conflict',
        relatedCase: existingCase._id,
      });
    }

    return { finalized: false, escalated: true };
  }

  // Consensus reached - determine majority recommendation and close the case
  const recommendation = safeCount > reviews.length / 2 ? 'safe' : 'revisit_doctor';

  const report = await Report.create({
    case: existingCase._id,
    patient: existingCase.patient,
    source: 'ai_consensus',
    recommendation,
    summary: aiResult.synthesis,
    doctorOpinionsSnapshot: reviews.map((r) => ({
      doctor: r.doctor,
      decision: r.decision,
      reasoning: r.reasoning,
    })),
    drugInteractionWarnings: aiResult.drugInteractionWarnings,
  });

  existingCase.status = 'completed';
  existingCase.finalRecommendation = recommendation;
  existingCase.finalReportSummary = aiResult.synthesis;
  existingCase.completedAt = new Date();
  await existingCase.save();

  await Notification.create({
    user: existingCase.patient,
    title: 'Your report is ready',
    message: 'All doctors have reviewed your case. Your final report is available.',
    type: 'report_ready',
    relatedCase: existingCase._id,
  });

  return { finalized: true, report };
}

module.exports = { maybeFinalizeCase };
