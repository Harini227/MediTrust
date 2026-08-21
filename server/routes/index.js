const express = require('express');
const router = express.Router();

/**
 * Central route registry.
 * Each domain route file will be mounted here as it's built in later phases:
 *   Phase 3: /auth
 *   Phase 5: /patients
 *   Phase 6: /doctors
 *   Phase 7: /chief-doctor
 *   Phase 8: /admin
 *   Phase 9: /uploads
 *   Phase 12: /payments
 *   Phase 13: /notifications
 */

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MediTrust API is healthy',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', require('./auth.routes'));                // Phase 3
router.use('/patients', require('./patient.routes'));         // Phase 5
router.use('/ai', require('./ai.routes'));                    // AI/ML module (test endpoint)
router.use('/doctors', require('./doctor.routes'));           // Phase 6
router.use('/chief-doctor', require('./chief.routes'));       // Phase 7
router.use('/admin', require('./admin.routes'));              // Phase 8
// router.use('/uploads', require('./upload.routes'));      // Phase 9
// router.use('/payments', require('./payment.routes'));    // Phase 12
router.use('/notifications', require('./notification.routes')); // Phase 11

module.exports = router;
