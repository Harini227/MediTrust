const Case = require('../database/models/Case.model');
const Payment = require('../database/models/Payment.model');
const Report = require('../database/models/Report.model');
const User = require('../database/models/User.model');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');
const { getPublicPath } = require('../services/storage/local.storage');

/**
 * POST /api/patients/cases
 * Step 1 of the wizard - creates a draft case. Frontend calls this first,
 * then uses the returned case ID for subsequent upload/update calls.
 */
exports.createCase = catchAsync(async (req, res) => {
  const newCase = await Case.create({
    patient: req.user.id,
    status: 'draft',
  });

  res.status(201).json({
    success: true,
    message: 'Case created. Continue with document upload.',
    data: { case: newCase },
  });
});

/**
 * PUT /api/patients/cases/:id
 * Step 2 - age, gender, symptoms, side effects, medical history.
 */
exports.updateCase = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { age, gender, symptoms, sideEffects, medicalHistory } = req.body;

  const existing = await Case.findOne({ _id: id, patient: req.user.id });
  if (!existing) {
    return next(new AppError('Case not found', 404));
  }
  if (existing.status !== 'draft') {
    return next(new AppError('This case can no longer be edited', 400));
  }

  if (age !== undefined) existing.age = age;
  if (gender !== undefined) existing.gender = gender;
  if (symptoms !== undefined) existing.symptoms = symptoms;
  if (sideEffects !== undefined) existing.sideEffects = sideEffects;
  if (medicalHistory !== undefined) existing.medicalHistory = medicalHistory;
  await existing.save();

  res.status(200).json({ success: true, data: { case: existing } });
});

/**
 * POST /api/patients/cases/:id/upload
 * Step 3 - prescription (single) + lab reports (multiple).
 * Expects multipart/form-data with fields: prescription, labReports[]
 * Triggers the dummy OCR service automatically once a prescription lands.
 */
exports.uploadDocuments = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const existingCase = await Case.findOne({ _id: id, patient: req.user.id });
  if (!existingCase) {
    return next(new AppError('Case not found', 404));
  }

  const prescriptionFile = req.files?.prescription?.[0];
  const labReportFiles = req.files?.labReports || [];

  if (prescriptionFile) {
    existingCase.prescriptionFile = getPublicPath(prescriptionFile.filename);
  }
  if (labReportFiles.length > 0) {
    existingCase.labReportFiles = labReportFiles.map((f) => getPublicPath(f.filename));
  }

  // Run OCR (dummy provider for MVP) as soon as a prescription is uploaded
  if (prescriptionFile) {
    const ocrService = require('../services/ocr');
    existingCase.ocrResult = await ocrService.extract(existingCase.prescriptionFile);
  }

  await existingCase.save();

  res.status(200).json({
    success: true,
    message: 'Documents uploaded successfully',
    data: { case: existingCase },
  });
});

/**
 * GET /api/patients/doctors
 * Lists available doctors for the frontend's doctor-selection screen,
 * with optional specialty filter.
 */
exports.getAvailableDoctors = catchAsync(async (req, res) => {
  const { specialty } = req.query;
  const filter = { role: 'doctor', isActive: true };
  if (specialty) filter.specialty = specialty;

  const doctors = await User.find(filter).select(
    'name specialty experienceYears languages consultationFee rating'
  );

  res.status(200).json({ success: true, data: { doctors } });
});

/**
 * POST /api/patients/cases/:id/select-doctors
 * Step 4 - patient picks exactly 3 doctors.
 */
exports.selectDoctors = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { doctorIds } = req.body;

  const existingCase = await Case.findOne({ _id: id, patient: req.user.id });
  if (!existingCase) {
    return next(new AppError('Case not found', 404));
  }

  const uniqueIds = [...new Set(doctorIds)];
  if (uniqueIds.length !== 3) {
    return next(new AppError('Please select 3 different doctors', 400));
  }

  const doctors = await User.find({ _id: { $in: uniqueIds }, role: 'doctor' });
  if (doctors.length !== 3) {
    return next(new AppError('One or more selected doctors are invalid', 400));
  }

  existingCase.selectedDoctors = uniqueIds;
  existingCase.status = 'pending_payment';
  await existingCase.save();

  res.status(200).json({
    success: true,
    message: 'Doctors selected. Proceed to payment.',
    data: { case: existingCase },
  });
});

/**
 * POST /api/patients/cases/:id/payment/order
 * Step 5a - creates a payment order (Razorpay order in test mode, or a
 * dummy order if PAYMENT_PROVIDER=dummy). Frontend uses the returned
 * orderId + keyId to open Razorpay Checkout (or auto-confirm if dummy).
 */
exports.createPaymentOrder = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const existingCase = await Case.findOne({ _id: id, patient: req.user.id });
  if (!existingCase) {
    return next(new AppError('Case not found', 404));
  }
  if (existingCase.status !== 'pending_payment') {
    return next(new AppError('This case is not awaiting payment', 400));
  }

  const paymentService = require('../services/payment');
  const order = await paymentService.createOrder({
    amount: 500,
    receipt: `case_${existingCase._id}`,
  });

  const payment = await Payment.create({
    case: existingCase._id,
    patient: req.user.id,
    amount: 500,
    status: 'pending',
    provider: order.isDummy ? 'dummy' : 'razorpay',
    providerPaymentId: order.orderId,
  });

  res.status(201).json({
    success: true,
    data: {
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId, // null for dummy - frontend skips real checkout
      paymentRecordId: payment._id,
    },
  });
});

/**
 * POST /api/patients/cases/:id/payment/verify
 * Step 5b - called after Razorpay Checkout completes (or immediately for
 * dummy). Verifies the signature server-side before trusting the payment,
 * then unlocks the case for doctor review.
 */
exports.verifyPayment = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { orderId, paymentId, signature } = req.body;

  const existingCase = await Case.findOne({ _id: id, patient: req.user.id });
  if (!existingCase) {
    return next(new AppError('Case not found', 404));
  }

  const payment = await Payment.findOne({
    case: existingCase._id,
    providerPaymentId: orderId,
  });
  if (!payment) {
    return next(new AppError('Payment record not found', 404));
  }

  const paymentService = require('../services/payment');
  const isValid = paymentService.verifySignature({ orderId, paymentId, signature });

  if (!isValid) {
    payment.status = 'failed';
    await payment.save();
    return next(new AppError('Payment verification failed', 400));
  }

  payment.status = 'success';
  payment.paidAt = new Date();
  if (paymentId) payment.providerPaymentId = paymentId;
  await payment.save();

  existingCase.paymentStatus = 'paid';
  existingCase.status = 'pending_review';
  await existingCase.save();

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
    data: { case: existingCase, payment },
  });
});

/**
 * GET /api/patients/cases
 * All of the logged-in patient's cases, most recent first.
 */
exports.getMyCases = catchAsync(async (req, res) => {
  const cases = await Case.find({ patient: req.user.id })
    .populate('selectedDoctors', 'name specialty')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: { cases } });
});

/**
 * GET /api/patients/cases/:id
 * Single case detail, for the "Track Status" screen.
 */
exports.getCaseById = catchAsync(async (req, res, next) => {
  const existingCase = await Case.findOne({
    _id: req.params.id,
    patient: req.user.id,
  }).populate('selectedDoctors', 'name specialty');

  if (!existingCase) {
    return next(new AppError('Case not found', 404));
  }

  res.status(200).json({ success: true, data: { case: existingCase } });
});

/**
 * GET /api/patients/cases/:id/report
 * The final consolidated report, once the case is completed.
 */
exports.getCaseReport = catchAsync(async (req, res, next) => {
  const existingCase = await Case.findOne({
    _id: req.params.id,
    patient: req.user.id,
  });
  if (!existingCase) {
    return next(new AppError('Case not found', 404));
  }
  if (existingCase.status !== 'completed') {
    return next(new AppError('Report is not ready yet', 400));
  }

  const report = await Report.findOne({ case: existingCase._id });
  if (!report) {
    return next(new AppError('Report not found', 404));
  }

  res.status(200).json({ success: true, data: { report } });
});
