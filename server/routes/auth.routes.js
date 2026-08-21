const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { registerValidator, loginValidator } = require('../validators/auth.validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, registerValidator, validate, authController.register);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.me);

module.exports = router;
