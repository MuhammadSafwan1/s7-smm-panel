const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// ==================== ON ORDER CREATED ====================
exports.onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const orderId = context.params.orderId;

    console.log(`New order created: ${orderId}`);

    try {
      // Create notification for the user
      await db.collection('notifications').add({
        userId: order.userId,
        title: 'Order Created',
        message: `Your order #${orderId.slice(0, 8)} has been created and is pending processing.`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        orderId,
      });

      // If the account exists, mark it as pending
      if (order.accountId) {
        await db.collection('accounts').doc(order.accountId).update({
          status: 'pending',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      console.log(`Order ${orderId} processed successfully`);
    } catch (error) {
      console.error(`Error processing order ${orderId}:`, error);
    }
  });

// ==================== ON PAYMENT CONFIRMED ====================
exports.onPaymentConfirmed = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // Only trigger when payment status changes to 'completed'
    if (before.paymentStatus !== 'completed' && after.paymentStatus === 'completed') {
      console.log(`Payment confirmed for order: ${orderId}`);

      try {
        // Update order status
        await db.collection('orders').doc(orderId).update({
          status: 'processing',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Create notification
        await db.collection('notifications').add({
          userId: after.userId,
          title: 'Payment Confirmed',
          message: `Your payment for order #${orderId.slice(0, 8)} has been confirmed. Your account details will be delivered shortly.`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          orderId,
        });

        console.log(`Payment for order ${orderId} processed successfully`);
      } catch (error) {
        console.error(`Error processing payment for order ${orderId}:`, error);
      }
    }
  });

// ==================== SEND EMAIL (Helper Function) ====================
exports.sendEmail = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to send email'
    );
  }

  const { to, subject, htmlContent } = data;

  if (!to || !subject || !htmlContent) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Recipient email, subject, and content are required'
    );
  }

  try {
    // In production, integrate with a real email service like SendGrid, Mailgun, etc.
    // For now, we log the email details
    console.log('========================');
    console.log('EMAIL NOTIFICATION');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Content:', htmlContent);
    console.log('========================');

    // Store email in Firestore for history
    await db.collection('emails').add({
      to,
      subject,
      content: htmlContent,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: context.auth.uid,
    });

    return { success: true, message: 'Email queued for delivery' };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email');
  }
});