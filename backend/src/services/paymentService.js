/**
 * Payment Service - Stripe Integration
 * Handles credit purchases, payment processing, and transactions
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { query, withTransaction } = require('../config/database');

// Get available credit packages
const getCreditPackages = async () => {
  try {
    const result = await query(
      `SELECT package_id, credits, price_usd, price_vnd, bonus_credits, is_popular, display_order
       FROM credit_packages
       WHERE is_active = TRUE
       ORDER BY display_order ASC`
    );
    
    return result.rows;
  } catch (error) {
    throw error;
  }
};

// Create Stripe Payment Intent
const createPaymentIntent = async (userId, packageId, currency = 'usd') => {
  try {
    // Get package details
    const packageResult = await query(
      'SELECT * FROM credit_packages WHERE package_id = $1 AND is_active = TRUE',
      [packageId]
    );

    if (packageResult.rows.length === 0) {
      throw new Error('Package không tồn tại hoặc không còn hoạt động');
    }

    const pkg = packageResult.rows[0];
    const amount = currency === 'usd' ? pkg.price_usd : pkg.price_vnd / 23000; // Convert VND to USD for Stripe
    const totalCredits = pkg.credits + pkg.bonus_credits;

    // Get or create Stripe customer
    const userResult = await query(
      'SELECT email, username FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User không tồn tại');
    }

    const user = userResult.rows[0];

    // Check if user already has a Stripe customer ID
    let stripeCustomerId;
    const existingCustomer = await query(
      'SELECT stripe_customer_id FROM payment_transactions WHERE user_id = $1 AND stripe_customer_id IS NOT NULL LIMIT 1',
      [userId]
    );

    if (existingCustomer.rows.length > 0) {
      stripeCustomerId = existingCustomer.rows[0].stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: userId,
          username: user.username
        }
      });
      stripeCustomerId = customer.id;
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency: currency.toLowerCase(),
      customer: stripeCustomerId,
      metadata: {
        user_id: userId,
        package_id: packageId,
        credits: totalCredits.toString()
      },
      description: `Purchase ${totalCredits} credits for ShareBuddy`
    });

    // Save transaction to database
    await query(
      `INSERT INTO payment_transactions 
       (user_id, stripe_payment_intent_id, stripe_customer_id, amount, currency, credits_purchased, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, paymentIntent.id, stripeCustomerId, amount, currency, totalCredits, 'pending']
    );

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      currency: currency,
      credits: totalCredits
    };
  } catch (error) {
    console.error('Create payment intent error:', error);
    throw error;
  }
};

// Handle Stripe Webhook Events
const handleWebhook = async (event) => {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      
      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return { received: true };
  } catch (error) {
    console.error('Webhook handler error:', error);
    throw error;
  }
};

// Handle successful payment
const handlePaymentSuccess = async (paymentIntent) => {
  try {
    return await withTransaction(async (client) => {
      // Update payment transaction
      const txResult = await client.query(
        `UPDATE payment_transactions 
         SET payment_status = 'succeeded', updated_at = NOW()
         WHERE stripe_payment_intent_id = $1
         RETURNING user_id, credits_purchased`,
        [paymentIntent.id]
      );

      if (txResult.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      const { user_id, credits_purchased } = txResult.rows[0];

      // Add credits to user account
      await client.query(
        'UPDATE users SET credits = credits + $1 WHERE user_id = $2',
        [credits_purchased, user_id]
      );

      // Create credit transaction record
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, reference_id, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user_id,
          credits_purchased,
          'purchase',
          paymentIntent.id,
          `Purchased ${credits_purchased} credits via Stripe`
        ]
      );

      // Create notification
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, $2, $3, $4)`,
        [
          user_id,
          'payment_successful',
          'Payment Successful',
          `You have successfully purchased ${credits_purchased} credits!`
        ]
      );

      console.log(`Payment succeeded for user ${user_id}: ${credits_purchased} credits added`);
      return { success: true };
    });
  } catch (error) {
    console.error('Handle payment success error:', error);
    throw error;
  }
};

// Handle failed payment
const handlePaymentFailure = async (paymentIntent) => {
  try {
    // Update payment transaction
    await query(
      `UPDATE payment_transactions 
       SET payment_status = 'failed', error_message = $2, updated_at = NOW()
       WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id, paymentIntent.last_payment_error?.message || 'Payment failed']
    );

    // Get user ID
    const result = await query(
      'SELECT user_id FROM payment_transactions WHERE stripe_payment_intent_id = $1',
      [paymentIntent.id]
    );

    if (result.rows.length > 0) {
      // Create notification
      await query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, $2, $3, $4)`,
        [
          result.rows[0].user_id,
          'payment_failed',
          'Payment Failed',
          'Your payment could not be processed. Please try again.'
        ]
      );
    }

    console.log(`Payment failed for payment intent ${paymentIntent.id}`);
    return { success: true };
  } catch (error) {
    console.error('Handle payment failure error:', error);
    throw error;
  }
};

// Handle refund
const handleRefund = async (charge) => {
  try {
    const paymentIntentId = charge.payment_intent;

    return await withTransaction(async (client) => {
      // Get transaction details
      const txResult = await client.query(
        'SELECT user_id, credits_purchased FROM payment_transactions WHERE stripe_payment_intent_id = $1',
        [paymentIntentId]
      );

      if (txResult.rows.length === 0) {
        throw new Error('Transaction not found for refund');
      }

      const { user_id, credits_purchased } = txResult.rows[0];

      // Update payment transaction
      await client.query(
        `UPDATE payment_transactions 
         SET payment_status = 'refunded', updated_at = NOW()
         WHERE stripe_payment_intent_id = $1`,
        [paymentIntentId]
      );

      // Deduct credits from user account
      await client.query(
        'UPDATE users SET credits = credits - $1 WHERE user_id = $2 AND credits >= $1',
        [credits_purchased, user_id]
      );

      // Create credit transaction record
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, reference_id, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user_id,
          -credits_purchased,
          'penalty',
          paymentIntentId,
          `Refund: ${credits_purchased} credits deducted`
        ]
      );

      console.log(`Refund processed for user ${user_id}: ${credits_purchased} credits deducted`);
      return { success: true };
    });
  } catch (error) {
    console.error('Handle refund error:', error);
    throw error;
  }
};

// Get payment history for user
const getPaymentHistory = async (userId, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT 
        payment_id,
        stripe_payment_intent_id,
        amount,
        currency,
        credits_purchased,
        payment_status,
        payment_method,
        error_message,
        created_at
       FROM payment_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM payment_transactions WHERE user_id = $1',
      [userId]
    );

    return {
      transactions: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    };
  } catch (error) {
    throw error;
  }
};

// Verify payment status
const verifyPayment = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Update local database
    await query(
      `UPDATE payment_transactions 
       SET payment_status = $2, updated_at = NOW()
       WHERE stripe_payment_intent_id = $1`,
      [paymentIntentId, paymentIntent.status]
    );

    return {
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getCreditPackages,
  createPaymentIntent,
  handleWebhook,
  handlePaymentSuccess,
  handlePaymentFailure,
  handleRefund,
  getPaymentHistory,
  verifyPayment
};
