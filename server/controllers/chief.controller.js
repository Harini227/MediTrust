const Case = require('../database/models/Case.model');
const Review = require('../database/models/Review.model');
const Report = require('../database/models/Report.model');
const Notification = require('../database/models/Notification.model');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/chief-doctor/cases
 * All cases escalated to this Chief Doctor because the 3 reviews conflicted.
 */
exports.getConflictCases = catchAsync(async (req, res) => {
  const cases = await Case.find({
    chiefDoctor: req.user.id,
    status: 'conflict',
  })
    .populate('patient', 'name age gender')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: { cases } });
});

/**
 * GET /api/chief-doctor/cases/:id
 * Full case detail INCLUDING all 3 doctors' reviews + the AI's conflict
 * summary - the Chief Doctor sees everything, unlike individual doctors.
 */
exports.getCaseForFinalReview = catchAsync(async (req, res, next) => {
  const existingCase = await Case.findOne({
    _id: req.params.id,
    chiefDoctor: req.user.id,
  }).populate('patient', 'name age gender');

  if (!existingCase) {
    return next(new AppError('Case not found or not assigned to you', 404));
  }

  const reviews = await Review.find({ case: existingCase._id }).populate(
    'doctor',
    'name specialty'
  );

  res.status(200).json({ success: true, data: { case: existingCase, reviews } });
});

/**
 * POST /api/chief-doctor/cases/:id/final-review
 * The Chief Doctor's authoritative ruling - closes the case and generates
 * the final Report, overriding the unresolved AI/doctor conflict.
 */
exports.submitFinalReview = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { recommendation, summary } = req.body;

  const existingCase = await Case.findOne({
    _id: id,
    chiefDoctor: req.user.id,
  });
  if (!existingCase) {
    return next(new AppError('Case not found or not assigned to you', 404));
  }
  if (existingCase.status !== 'conflict') {
    return next(new AppError('This case is not awaiting Chief Doctor review', 400));
  }

  const reviews = await Review.find({ case: id });

  const report = await Report.create({
    case: existingCase._id,
    patient: existingCase.patient,
    source: 'chief_doctor',
    chiefDoctor: req.user.id,
    recommendation,
    summary,
    doctorOpinionsSnapshot: reviews.map((r) => ({
      doctor: r.doctor,
      decision: r.decision,
      reasoning: r.reasoning,
    })),
    drugInteractionWarnings: existingCase.aiSummary?.drugInteractionWarnings || [],
  });

  existingCase.status = 'completed';
  existingCase.finalRecommendation = recommendation;
  existingCase.finalReportSummary = summary;
  existingCase.completedAt = new Date();
  await existingCase.save();

  await Notification.create({
    user: existingCase.patient,
    title: 'Your report is ready',
    message: 'The Chief Doctor has issued a final ruling on your case.',
    type: 'report_ready',
    relatedCase: existingCase._id,
  });

  res.status(201).json({
    success: true,
    message: 'Final ruling submitted. Case closed.',
    data: { report },
  });
});

/**
 * GET /api/chief-doctor/cases/history
 * Cases this Chief Doctor has already ruled on.
 */
exports.getRulingHistory = catchAsync(async (req, res) => {
  const cases = await Case.find({
    chiefDoctor: req.user.id,
    status: 'completed',
  }).sort({ completedAt: -1 });

  res.status(200).json({ success: true, data: { cases } });
});
