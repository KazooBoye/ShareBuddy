/**
 * Payment Controller
 * Handles payment-related endpoints
 */

const { validationResult } = require('express-validator');
const paymentService = require('../services/paymentService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Get available credit packages
const getCreditPackages = async (req, res, next) => {
  try {
    const packages = await paymentService.getCreditPackages();

    res.json({
      success: true,
      data: {
        packages,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create payment intent
const createPaymentIntent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { packageId, currency } = req.body;
    const userId = req.user.user_id;

    const paymentData = await paymentService.createPaymentIntent(
      userId,
      packageId,
      currency || 'usd'
    );

    res.json({
      success: true,
      data: paymentData
    });
  } catch (error) {
    if (error.message.includes('không tồn tại') || error.message.includes('không còn hoạt động')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

// Handle Stripe webhook
const handleWebhook = async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({
        success: false,
        error: `Webhook Error: ${err.message}`
      });
    }

    // Handle the event
    await paymentService.handleWebhook(event);

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook handler failed'
    });
  }
};

// Get payment history
const getPaymentHistory = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const history = await paymentService.getPaymentHistory(userId, page, limit);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

// Verify payment status
const verifyPayment = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.params;
    const userId = req.user.user_id;

    // Verify ownership
    const result = await paymentService.verifyPayment(paymentIntentId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Get Stripe config (publishable key)
const getConfig = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCreditPackages,
  createPaymentIntent,
  handleWebhook,
  getPaymentHistory,
  verifyPayment,
  getConfig
};
