const User = require('../database/models/User.model');
const Case = require('../database/models/Case.model');
const Payment = require('../database/models/Payment.model');
const AuditLog = require('../database/models/AuditLog.model');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/admin/analytics
 * Dashboard summary numbers for the Admin's analytics screen.
 */
exports.getAnalytics = catchAsync(async (req, res) => {
  const [
    totalPatients,
    totalDoctors,
    totalCases,
    completedCases,
    conflictCases,
    pendingCases,
    revenueAgg,
  ] = await Promise.all([
    User.countDocuments({ role: 'patient' }),
    User.countDocuments({ role: 'doctor' }),
    Case.countDocuments(),
    Case.countDocuments({ status: 'completed' }),
    Case.countDocuments({ status: 'conflict' }),
    Case.countDocuments({ status: { $in: ['pending_review', 'in_review'] } }),
    Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalPatients,
      totalDoctors,
      totalCases,
      completedCases,
      conflictCases,
      pendingCases,
      totalRevenue: revenueAgg[0]?.total || 0,
    },
  });
});

/**
 * GET /api/admin/patients
 */
exports.getPatients = catchAsync(async (req, res) => {
  const patients = await User.find({ role: 'patient' }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: { patients } });
});

/**
 * GET /api/admin/doctors
 */
exports.getDoctors = catchAsync(async (req, res) => {
  const doctors = await User.find({ role: { $in: ['doctor', 'chief'] } }).sort({
    createdAt: -1,
  });
  res.status(200).json({ success: true, data: { doctors } });
});

/**
 * PATCH /api/admin/users/:id/status
 * Activate/deactivate any user account.
 */
exports.updateUserStatus = catchAsync(async (req, res, next) => {
  const { isActive } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true }
  );
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  res.status(200).json({ success: true, data: { user: user.toSafeObject() } });
});

/**
 * GET /api/admin/cases
 * All cases in the system, with optional status filter.
 */
exports.getAllCases = catchAsync(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};

  const cases = await Case.find(filter)
    .populate('patient', 'name email')
    .populate('selectedDoctors', 'name specialty')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: { cases } });
});

/**
 * GET /api/admin/payments
 */
exports.getAllPayments = catchAsync(async (req, res) => {
  const payments = await Payment.find()
    .populate('patient', 'name email')
    .populate('case', 'status')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: { payments } });
});

/**
 * GET /api/admin/audit-logs
 * Compliance trail - who did what, when.
 */
exports.getAuditLogs = catchAsync(async (req, res) => {
  const logs = await AuditLog.find()
    .populate('user', 'name role')
    .sort({ createdAt: -1 })
    .limit(200);

  res.status(200).json({ success: true, data: { logs } });
});
