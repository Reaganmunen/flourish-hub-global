// src/models/contentAccessModel.js
const { query } = require('../config/db');
const { generateOpaqueToken } = require('../utils/tokens');

/**
 * Grant access after a payment succeeds. Logged-in customers get a
 * permanent grant (expires_at NULL). Guests get a bearer access_token
 * with an expiry — the checkout confirmation email carries a link
 * containing this token so they don't need an account.
 */
async function grant({ orderItemId, customerId, guestEmail, contentType, postId, podcastId, guestExpiryDays = 30 }) {
  const isGuest = !customerId;
  const accessToken = isGuest ? generateOpaqueToken() : null;
  const expiresAt = isGuest ? new Date(Date.now() + guestExpiryDays * 24 * 60 * 60 * 1000) : null;

  const { rows } = await query(
    `INSERT INTO content_access
       (order_item_id, customer_id, guest_email, content_type, post_id, podcast_id, access_token, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      orderItemId, customerId || null, guestEmail || null, contentType,
      postId || null, podcastId || null, accessToken, expiresAt,
    ]
  );
  return rows[0];
}

async function findByCustomerAndContent(customerId, contentType, contentId) {
  const col = contentType === 'post' ? 'post_id' : 'podcast_id';
  const { rows } = await query(
    `SELECT * FROM content_access
     WHERE customer_id = $1 AND content_type = $2 AND ${col} = $3
     LIMIT 1`,
    [customerId, contentType, contentId]
  );
  return rows[0] || null;
}

async function findValidByToken(token, contentType, contentId) {
  const col = contentType === 'post' ? 'post_id' : 'podcast_id';
  const { rows } = await query(
    `SELECT * FROM content_access
     WHERE access_token = $1 AND content_type = $2 AND ${col} = $3
       AND (expires_at IS NULL OR expires_at > now())
     LIMIT 1`,
    [token, contentType, contentId]
  );
  return rows[0] || null;
}

async function listForCustomer(customerId) {
  const { rows } = await query(
    `SELECT * FROM content_access WHERE customer_id = $1 ORDER BY granted_at DESC`,
    [customerId]
  );
  return rows;
}

module.exports = { grant, findByCustomerAndContent, findValidByToken, listForCustomer };
