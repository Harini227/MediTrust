const { body } = require('express-validator');

const saveSessionValidator = [
  body('steps').isInt({ min: 0 }).withMessage('Steps must be a non-negative integer'),
  body('distanceKm').isFloat({ min: 0 }).withMessage('Distance must be a non-negative number'),
  body('estimatedCalories').isFloat({ min: 0 }).withMessage('Calories must be a non-negative number'),
  body('durationMinutes').isFloat({ min: 0 }).withMessage('Duration must be a non-negative number'),
  body('date').optional().isDate().withMessage('Date must be a valid YYYY-MM-DD format'),
];

module.exports = { saveSessionValidator };
