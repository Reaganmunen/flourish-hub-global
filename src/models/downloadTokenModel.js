// src/models/downloadTokenModel.js
// Secure, expiring, limited-use links for the actual digital FILE behind
// a purchased book (distinct from content_access, which gates viewing
// premium posts/podcasts on-page rather than downloading a file).
const { query } = require('../config/db');
const { generateOpaqueToken } = require('../utils/tokens');

async function create({ orderItemId, expiryDays = 7, maxDownloads = 5 }) {
  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  const { rows } = await query(
    `INSERT INTO download_tokens (order_item_id, token, expires_at, max_downloads)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [orderItemId, token, expiresAt, maxDownloads]
  );
  return rows[0];
}

async function findValidByToken(token) {
  const { rows } = await query(
    `SELECT * FROM download_tokens
     WHERE token = $1 AND expires_at > now() AND download_count < max_downloads`,
    [token]
  );
  return rows[0] || null;
}

async function incrementDownloadCount(id) {
  const { rows } = await query(
    `UPDATE download_tokens SET download_count = download_count + 1 WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0];
}

async function listForOrderItem(orderItemId) {
  const { rows } = await query(
    `SELECT * FROM download_tokens WHERE order_item_id = $1 ORDER BY created_at DESC`,
    [orderItemId]
  );
  return rows;
}

module.exports = { create, findValidByToken, incrementDownloadCount, listForOrderItem };
