const express = require('express');
const router = express.Router();

const doctorController = require('../controllers/doctor.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { submitReviewValidator } = require('../validators/review.validator');

router.use(protect, restrictTo('doctor'));

router.get('/cases', doctorController.getAssignedCases);
router.get('/cases/history', doctorController.getReviewHistory);
router.get('/cases/:id', doctorController.getCaseForReview);
router.post(
  '/cases/:id/review',
  submitReviewValidator,
  validate,
  doctorController.submitReview
);

module.exports = router;
