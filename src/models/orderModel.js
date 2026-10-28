// src/models/orderModel.js
const { query, withTransaction } = require('../config/db');

function generateOrderNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${year}-${rand}`;
}

/**
 * Creates an order + its order_items atomically, computing totals from
 * the items so the client can never smuggle in a fake total_cents.
 * `items` = [{ itemType, bookId?, postId?, podcastId?, titleSnapshot,
 *              unitPriceCents, quantity, isDigital }]
 */
async function createWithItems(args) {
  // Order numbers are random 6 digit values, so two orders can occasionally
  // collide. Retry with a fresh number instead of failing the checkout.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await insertOrder(args);
    } catch (err) {
      const isNumberClash = err.code === '23505' && /order_number/.test(`${err.constraint || ''} ${err.detail || ''}`);
      if (!isNumberClash || attempt === 4) throw err;
    }
  }
}

async function insertOrder({ customerId, guestEmail, guestFullName, items, shippingAddress, billingAddress, shippingCents = 0, taxCents = 0, currency = 'USD' }) {
  return withTransaction(async (client) => {
    const subtotal = items.reduce((sum, it) => sum + it.unitPriceCents * it.quantity, 0);
    const total = subtotal + shippingCents + taxCents;
    const orderNumber = generateOrderNumber();

    const orderRes = await client.query(
      `INSERT INTO orders
         (order_number, customer_id, guest_email, guest_full_name, status,
          subtotal_cents, tax_cents, shipping_cents, total_cents, currency,
          shipping_address, billing_address)
       VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        orderNumber, customerId || null, guestEmail || null, guestFullName || null,
        subtotal, taxCents, shippingCents, total, currency,
        shippingAddress ? JSON.stringify(shippingAddress) : null,
        billingAddress ? JSON.stringify(billingAddress) : null,
      ]
    );
    const order = orderRes.rows[0];

    const insertedItems = [];
    for (const it of items) {
      const lineTotal = it.unitPriceCents * it.quantity;
      const itemRes = await client.query(
        `INSERT INTO order_items
           (order_id, item_type, book_id, post_id, podcast_id, title_snapshot,
            unit_price_cents, quantity, is_digital, line_total_cents)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [
          order.id, it.itemType, it.bookId || null, it.postId || null, it.podcastId || null,
          it.titleSnapshot, it.unitPriceCents, it.quantity, it.isDigital !== false, lineTotal,
        ]
      );
      insertedItems.push(itemRes.rows[0]);
    }

    return { order, items: insertedItems };
  });
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function findByOrderNumber(orderNumber) {
  const { rows } = await query(`SELECT * FROM orders WHERE order_number = $1`, [orderNumber]);
  return rows[0] || null;
}

async function findByStripeSessionId(sessionId) {
  const { rows } = await query(`SELECT * FROM orders WHERE stripe_checkout_session_id = $1`, [sessionId]);
  return rows[0] || null;
}

async function attachStripeSession(orderId, { sessionId, paymentIntentId }) {
  const { rows } = await query(
    `UPDATE orders SET stripe_checkout_session_id = $2, stripe_payment_intent_id = $3
     WHERE id = $1 RETURNING *`,
    [orderId, sessionId, paymentIntentId || null]
  );
  return rows[0];
}

async function updateStatus(orderId, status) {
  const { rows } = await query(
    `UPDATE orders SET status = $2 WHERE id = $1 RETURNING *`,
    [orderId, status]
  );
  return rows[0] || null;
}

async function getItems(orderId) {
  const { rows } = await query(`SELECT * FROM order_items WHERE order_id = $1`, [orderId]);
  return rows;
}

async function listForCustomer(customerId) {
  const { rows } = await query(
    `SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC`,
    [customerId]
  );
  return rows;
}

async function listAll({ status, page = 1, pageSize = 30 } = {}) {
  const conditions = [];
  const params = [];
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;
  params.push(pageSize, offset);
  const { rows } = await query(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

module.exports = {
  createWithItems,
  findById,
  findByOrderNumber,
  findByStripeSessionId,
  attachStripeSession,
  updateStatus,
  getItems,
  listForCustomer,
  listAll,
};
