const crypto = require('crypto');
const config = require('../../config');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

const RAZORPAY_API = 'https://api.razorpay.com/v1';

function authHeader() {
  const credentials = Buffer.from(
    `${config.razorpay.keyId}:${config.razorpay.keySecret}`
  ).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Creates a Razorpay Order - the first step of their checkout flow.
 * The frontend uses this order's id to open the Razorpay Checkout popup,
 * where the patient enters (test) card details.
 */
async function createOrder({ amount, receipt }) {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw new AppError('Razorpay is not configured', 500);
  }

  const response = await fetch(`${RAZORPAY_API}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      amount: amount * 100, // Razorpay uses paise, not rupees
      currency: 'INR',
      receipt,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    logger.error(`Razorpay order creation failed: ${response.status} ${errText}`);
    throw new AppError('Payment service is temporarily unavailable', 502);
  }

  const order = await response.json();
  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: config.razorpay.keyId, // safe to expose to frontend - it's the public key
  };
}

/**
 * Verifies the payment signature Razorpay sends back after checkout.
 * This is the critical security step - without it, anyone could fake a
 * "successful payment" callback. Uses HMAC-SHA256 exactly as Razorpay's
 * docs specify: hash of "order_id|payment_id" signed with the key secret.
 */
function verifySignature({ orderId, paymentId, signature }) {
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return expectedSignature === signature;
}

module.exports = { createOrder, verifySignature };
