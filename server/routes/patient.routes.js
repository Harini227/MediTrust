const express = require('express');
const router = express.Router();

const patientController = require('../controllers/patient.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const {
  updateCaseValidator,
  selectDoctorsValidator,
  paymentValidator,
} = require('../validators/case.validator');

/* All patient routes require login + patient role */
router.use(protect, restrictTo('patient'));

router.get('/doctors', patientController.getAvailableDoctors);

router.post('/cases', patientController.createCase);
router.get('/cases', patientController.getMyCases);
router.get('/cases/:id', patientController.getCaseById);
router.put('/cases/:id', updateCaseValidator, validate, patientController.updateCase);

router.post(
  '/cases/:id/upload',
  upload.fields([
    { name: 'prescription', maxCount: 1 },
    { name: 'labReports', maxCount: 5 },
  ]),
  patientController.uploadDocuments
);

router.post(
  '/cases/:id/select-doctors',
  selectDoctorsValidator,
  validate,
  patientController.selectDoctors
);

router.post(
  '/cases/:id/payment/order',
  paymentValidator,
  validate,
  patientController.createPaymentOrder
);

router.post('/cases/:id/payment/verify', paymentValidator, validate, patientController.verifyPayment);

router.get('/cases/:id/report', patientController.getCaseReport);

module.exports = router;
