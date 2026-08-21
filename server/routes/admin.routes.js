const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateUserStatusValidator } = require('../validators/admin.validator');

router.use(protect, restrictTo('admin'));

router.get('/analytics', adminController.getAnalytics);
router.get('/patients', adminController.getPatients);
router.get('/doctors', adminController.getDoctors);
router.patch(
  '/users/:id/status',
  updateUserStatusValidator,
  validate,
  adminController.updateUserStatus
);
router.get('/cases', adminController.getAllCases);
router.get('/payments', adminController.getAllPayments);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
