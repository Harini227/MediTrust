const { body, param } = require('express-validator');

const chiefReviewValidator = [
  param('id').isMongoId().withMessage('Invalid case ID'),
  body('recommendation')
    .isIn(['safe', 'revisit_doctor'])
    .withMessage('Recommendation must be either "safe" or "revisit_doctor"'),
  body('summary')
    .trim()
    .isLength({ min: 10, max: 3000 })
    .withMessage('Summary must be between 10 and 3000 characters'),
];

module.exports = { chiefReviewValidator };
