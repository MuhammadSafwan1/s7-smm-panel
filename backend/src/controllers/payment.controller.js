const { db } = require('../config/firebaseAdmin');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * Create a payment intent (simplified for demo)
 */
const createPaymentIntent = async (req, res, next) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return sendError(res, 'Order ID and amount are required', 400);
    }

    // In production, integrate with Stripe/PayPal here
    // For demo, we simulate payment confirmation
    const paymentIntent = {
      id: `pi_${Date.now()}`,
      amount,
      currency: 'usd',
      status: 'succeeded',
      orderId,
      createdAt: new Date().toISOString(),
    };

    // Update order status
    await db.collection('orders').doc(orderId).update({
      paymentId: paymentIntent.id,
      paymentStatus: 'completed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create notification
    const orderDoc = await db.collection('orders').doc(orderId).get();
    const orderData = orderDoc.data();
    if (orderData) {
      await db.collection('notifications').add({
        userId: orderData.userId,
        title: 'Payment Confirmed',
        message: `Your payment of $${amount} has been confirmed.`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    sendSuccess(res, paymentIntent, 'Payment successful');
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm payment
 */
const confirmPayment = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return sendError(res, 'Payment intent ID is required', 400);
    }

    // In production, verify with Stripe/PayPal
    sendSuccess(res, { status: 'confirmed' }, 'Payment confirmed');
  } catch (error) {
    next(error);
  }
};

module.exports = { createPaymentIntent, confirmPayment };