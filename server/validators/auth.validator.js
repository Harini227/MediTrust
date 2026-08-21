const { body } = require('express-validator');

const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .isIn(['patient', 'doctor', 'chief', 'admin'])
    .withMessage('Role must be one of patient, doctor, chief, admin'),
];

const loginValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  body('role')
    .isIn(['patient', 'doctor', 'chief', 'admin'])
    .withMessage('Role must be one of patient, doctor, chief, admin'),
];

module.exports = { registerValidator, loginValidator };
