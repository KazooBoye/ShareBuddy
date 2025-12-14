/**
 * Payment Routes
 * Routes for Stripe payment integration
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Get available credit packages (public)
router.get('/packages', paymentController.getCreditPackages);

// Get Stripe config (public)
router.get('/config', paymentController.getConfig);

// Create payment intent (authenticated)
router.post(
  '/create-intent',
  protect,
  [
    body('packageId').isUUID().withMessage('Package ID không hợp lệ'),
    body('currency').optional().isIn(['usd', 'vnd']).withMessage('Currency phải là usd hoặc vnd')
  ],
  paymentController.createPaymentIntent
);

// Get payment history (authenticated)
router.get('/history', protect, paymentController.getPaymentHistory);

// Verify payment (authenticated)
router.get('/verify/:paymentIntentId', protect, paymentController.verifyPayment);

// Stripe webhook (raw body needed)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;
