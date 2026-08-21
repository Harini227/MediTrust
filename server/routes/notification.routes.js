const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth');

/* Any logged-in role (patient/doctor/chief/admin) can access their own notifications */
router.use(protect);

router.get('/', notificationController.getMyNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
