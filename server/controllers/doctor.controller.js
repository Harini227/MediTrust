const Case = require('../database/models/Case.model');
const Review = require('../database/models/Review.model');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { maybeFinalizeCase } = require('../services/caseWorkflow');

/**
 * GET /api/doctors/cases
 * All cases assigned to the logged-in doctor that still need their review.
 */
exports.getAssignedCases = catchAsync(async (req, res) => {
  const cases = await Case.find({
    selectedDoctors: req.user.id,
    status: { $in: ['pending_review', 'in_review'] },
  })
    .select('-selectedDoctors') // doctors stay anonymous to each other
    .populate('patient', 'name age gender')
    .sort({ createdAt: -1 });

  // Exclude cases this doctor has already reviewed
  const alreadyReviewed = await Review.find({ doctor: req.user.id }).distinct('case');
  const alreadyReviewedIds = new Set(alreadyReviewed.map((id) => id.toString()));
  const pending = cases.filter((c) => !alreadyReviewedIds.has(c._id.toString()));

  res.status(200).json({ success: true, data: { cases: pending } });
});

/**
 * GET /api/doctors/cases/:id
 * Full case detail for review - prescription, OCR result, symptoms.
 * Does NOT expose other doctors' reviews (keeps reviews independent/anonymous).
 */
exports.getCaseForReview = catchAsync(async (req, res, next) => {
  const existingCase = await Case.findOne({
    _id: req.params.id,
    selectedDoctors: req.user.id,
  })
    .select('-selectedDoctors')
    .populate('patient', 'name age gender');

  if (!existingCase) {
    return next(new AppError('Case not found or not assigned to you', 404));
  }

  res.status(200).json({ success: true, data: { case: existingCase } });
});

/**
 * POST /api/doctors/cases/:id/review
 * Submit an independent Safe / Revisit Doctor decision + reasoning.
 * Once all 3 doctors have reviewed, automatically triggers AI synthesis
 * and either closes the case or escalates to a Chief Doctor.
 */
exports.submitReview = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { decision, reasoning, flaggedConcerns } = req.body;

  const existingCase = await Case.findOne({
    _id: id,
    selectedDoctors: req.user.id,
  });
  if (!existingCase) {
    return next(new AppError('Case not found or not assigned to you', 404));
  }
  if (!['pending_review', 'in_review'].includes(existingCase.status)) {
    return next(new AppError('This case is not currently open for review', 400));
  }

  const alreadyReviewed = await Review.findOne({ case: id, doctor: req.user.id });
  if (alreadyReviewed) {
    return next(new AppError('You have already reviewed this case', 409));
  }

  const review = await Review.create({
    case: id,
    doctor: req.user.id,
    decision,
    reasoning,
    flaggedConcerns: flaggedConcerns || [],
  });

  const result = await maybeFinalizeCase(id);

  res.status(201).json({
    success: true,
    message: result.finalized
      ? 'Review submitted. All doctors have reviewed - report generated.'
      : result.escalated
      ? 'Review submitted. Doctors disagreed - case escalated to Chief Doctor.'
      : 'Review submitted. Waiting on remaining doctor(s).',
    data: { review },
  });
});

/**
 * GET /api/doctors/cases/history
 * Cases this doctor has already reviewed (for their dashboard history view).
 */
exports.getReviewHistory = catchAsync(async (req, res) => {
  const reviews = await Review.find({ doctor: req.user.id })
    .populate({
      path: 'case',
      select: 'status finalRecommendation createdAt',
    })
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: { reviews } });
});
