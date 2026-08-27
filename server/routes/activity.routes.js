const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { saveSessionValidator } = require('../validators/activity.validator');

// All activity routes require authentication & the patient role
router.use(protect, restrictTo('patient'));

router.post('/session', saveSessionValidator, validate, activityController.saveSession);
router.get('/today', activityController.getTodayActivity);
router.get('/history', activityController.getActivityHistory);

module.exports = router;
