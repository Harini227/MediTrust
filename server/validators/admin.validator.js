const { body, param } = require('express-validator');

const updateUserStatusValidator = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('isActive').isBoolean().withMessage('isActive must be true or false'),
];

module.exports = { updateUserStatusValidator };
