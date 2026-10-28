// src/controllers/paymentController.js
// This is the ONLY place an order is ever marked 'paid'. The success_url
// redirect the customer's browser hits is just UX (a "thank you" page) -
// it must never itself grant access or mark anything paid, because it's
// fully client-controlled and trivially replayable. Fulfillment only
// happens here, after Stripe's signature is verified.
const { stripe } = require('../utils/stripe');
const orderModel = require('../models/orderModel');
const paymentModel = require('../models/paymentModel');
const bookModel = require('../models/bookModel');
const contentAccessModel = require('../models/contentAccessModel');
const downloadTokenModel = require('../models/downloadTokenModel');

async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    // req.body must be the raw Buffer here - see routes/webhookRoutes.js,
    // which mounts this with express.raw() instead of express.json().
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await fulfillOrder(event.data.object);
        break;
      case 'checkout.session.expired':
        await expireOrder(event.data.object);
        break;
      default:
        // Unhandled event types are fine to ignore - we only act on
        // the ones that change order state.
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Error handling webhook event:', err);
    // Return 500 so Stripe retries - fulfillment failures shouldn't be silently dropped.
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function fulfillOrder(session) {
  const order = await orderModel.findByStripeSessionId(session.id);
  if (!order) {
    console.error(`No order found for Stripe session ${session.id}`);
    return;
  }
  if (order.status === 'paid' || order.status === 'fulfilled') return; // idempotent, Stripe may resend events
  // Delayed payment methods complete the session before the money arrives.
  // Wait for the async_payment_succeeded event in that case.
  if (session.payment_status && session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return;

  await orderModel.attachStripeSession(order.id, {
    sessionId: session.id,
    paymentIntentId: session.payment_intent,
  });
  await orderModel.updateStatus(order.id, 'paid');

  await paymentModel.create({
    orderId: order.id,
    stripePaymentIntentId: session.payment_intent,
    amountCents: session.amount_total,
    currency: session.currency,
    status: 'succeeded',
    paymentMethodType: session.payment_method_types?.[0],
    rawResponse: session,
  });

  const items = await orderModel.getItems(order.id);

  for (const item of items) {
    if (item.item_type === 'book') {
      // A "print + digital" book is both: the buyer gets a download link AND
      // a physical copy ships. The order item only stores a single is_digital
      // flag, so look at the book itself to decide what to fulfil.
      const book = item.book_id ? await bookModel.findById(item.book_id) : null;
      const grantsDownload = book ? !!book.is_digital : !!item.is_digital;
      const shipsPhysical = book ? !!book.is_physical : !item.is_digital;
      if (grantsDownload) await downloadTokenModel.create({ orderItemId: item.id });
      if (shipsPhysical) await bookModel.decrementStock(item.book_id, item.quantity);
    } else if (item.item_type === 'post' || item.item_type === 'podcast') {
      await contentAccessModel.grant({
        orderItemId: item.id,
        customerId: order.customer_id,
        guestEmail: order.guest_email,
        contentType: item.item_type,
        postId: item.item_type === 'post' ? item.post_id : null,
        podcastId: item.item_type === 'podcast' ? item.podcast_id : null,
      });
    }
  }

  // TODO: send confirmation email (nodemailer) with download links /
  // guest content_access links here. Reagan already has nodemailer
  // experience from prior projects, so wiring this in should be quick.
}

async function expireOrder(session) {
  const order = await orderModel.findByStripeSessionId(session.id);
  if (!order || order.status !== 'pending') return;
  await orderModel.updateStatus(order.id, 'cancelled');
}

module.exports = { handleWebhook };
