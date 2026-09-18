// src/models/paymentModel.js
const { query } = require('../config/db');

async function create({ orderId, stripePaymentIntentId, stripeChargeId, amountCents, currency, status, paymentMethodType, rawResponse }) {
  const { rows } = await query(
    `INSERT INTO payments
       (order_id, stripe_payment_intent_id, stripe_charge_id, amount_cents,
        currency, status, payment_method_type, raw_response)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      orderId, stripePaymentIntentId, stripeChargeId || null, amountCents,
      currency || 'USD', status, paymentMethodType || null,
      rawResponse ? JSON.stringify(rawResponse) : null,
    ]
  );
  return rows[0];
}

async function listForOrder(orderId) {
  const { rows } = await query(
    `SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC`,
    [orderId]
  );
  return rows;
}

async function findByPaymentIntentId(paymentIntentId) {
  const { rows } = await query(
    `SELECT * FROM payments WHERE stripe_payment_intent_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [paymentIntentId]
  );
  return rows[0] || null;
}

module.exports = { create, listForOrder, findByPaymentIntentId };
