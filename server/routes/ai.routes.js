const express = require('express');
const router = express.Router();

const aiController = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth');

router.post('/test-synthesis', protect, aiController.testSynthesis);

module.exports = router;
