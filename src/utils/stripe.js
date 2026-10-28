// src/utils/stripe.js
require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Build a Stripe Checkout Session from an order + its items.
 * We pass order.id in metadata so the webhook can find the order again
 * without trusting anything the client sends us.
 *
 * @param {object} order - row from `orders`
 * @param {Array}  items - rows from `order_items`
 */
async function createCheckoutSession(order, items) {
  const line_items = items.map((item) => ({
    price_data: {
      currency: order.currency.toLowerCase(),
      product_data: { name: item.title_snapshot },
      unit_amount: item.unit_price_cents,
    },
    quantity: item.quantity,
  }));

  if (Number(order.shipping_cents) > 0) {
    line_items.push({
      price_data: {
        currency: order.currency.toLowerCase(),
        product_data: { name: 'Shipping' },
        unit_amount: Number(order.shipping_cents),
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items,
    customer_email: order.guest_email || undefined,
    success_url: process.env.STRIPE_SUCCESS_URL,
    cancel_url: process.env.STRIPE_CANCEL_URL,
    metadata: {
      order_id: String(order.id),
      order_number: order.order_number,
    },
  });

  return session;
}

module.exports = { stripe, createCheckoutSession };
