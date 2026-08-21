const crypto = require('crypto');
const config = require('../../config');
const razorpayProvider = require('./razorpay.provider');

/**
 * Dummy payment - creates a fake order and always verifies successfully.
 * Used when PAYMENT_PROVIDER=dummy (no real checkout, no signup needed).
 */
async function dummyCreateOrder({ amount }) {
  return {
    orderId: `DUMMY-ORDER-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
    amount: amount * 100,
    currency: 'INR',
    keyId: null, // null tells the frontend: skip real checkout, auto-confirm
    isDummy: true,
  };
}

function dummyVerify() {
  return true;
}

/**
 * Single entry point the rest of the app calls. Both providers expose the
 * same 2-step shape (createOrder -> verifySignature) so patient.controller.js
 * doesn't need to know which one is active. Controlled by PAYMENT_PROVIDER
 * in .env: 'razorpay' for real test-mode checkout, anything else = dummy.
 */
async function createOrder(params) {
  if (config.providers.payment === 'razorpay') {
    return razorpayProvider.createOrder(params);
  }
  return dummyCreateOrder(params);
}

function verifySignature(params) {
  if (config.providers.payment === 'razorpay') {
    return razorpayProvider.verifySignature(params);
  }
  return dummyVerify();
}

module.exports = { createOrder, verifySignature };
