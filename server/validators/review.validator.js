const { body, param } = require('express-validator');

const submitReviewValidator = [
  param('id').isMongoId().withMessage('Invalid case ID'),
  body('decision')
    .isIn(['safe', 'revisit_doctor'])
    .withMessage('Decision must be either "safe" or "revisit_doctor"'),
  body('reasoning')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Reasoning must be between 10 and 2000 characters'),
  body('flaggedConcerns').optional().isArray(),
];

module.exports = { submitReviewValidator };
