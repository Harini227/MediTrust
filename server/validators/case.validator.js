const { body, param } = require('express-validator');

const updateCaseValidator = [
  param('id').isMongoId().withMessage('Invalid case ID'),
  body('age').optional().isInt({ min: 0, max: 150 }).withMessage('Age must be a valid number'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('symptoms').optional().trim().isLength({ max: 2000 }),
  body('sideEffects').optional().trim().isLength({ max: 2000 }),
  body('medicalHistory').optional().trim().isLength({ max: 2000 }),
];

const selectDoctorsValidator = [
  param('id').isMongoId().withMessage('Invalid case ID'),
  body('doctorIds')
    .isArray({ min: 3, max: 3 })
    .withMessage('Exactly 3 doctors must be selected'),
  body('doctorIds.*').isMongoId().withMessage('Each doctorId must be a valid ID'),
];

const paymentValidator = [
  param('id').isMongoId().withMessage('Invalid case ID'),
];

module.exports = { updateCaseValidator, selectDoctorsValidator, paymentValidator };
