const express = require('express');
const router = express.Router();

const chiefController = require('../controllers/chief.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { chiefReviewValidator } = require('../validators/chief.validator');

router.use(protect, restrictTo('chief'));

router.get('/cases', chiefController.getConflictCases);
router.get('/cases/history', chiefController.getRulingHistory);
router.get('/cases/:id', chiefController.getCaseForFinalReview);
router.post(
  '/cases/:id/final-review',
  chiefReviewValidator,
  validate,
  chiefController.submitFinalReview
);

module.exports = router;
