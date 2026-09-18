// src/models/adminModel.js
const { query } = require('../config/db');

async function create({ email, passwordHash, fullName, role = 'editor' }) {
  const { rows } = await query(
    `INSERT INTO admin_users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, role, is_active, created_at`,
    [email, passwordHash, fullName, role]
  );
  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await query(`SELECT * FROM admin_users WHERE email = $1`, [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT id, email, full_name, role, is_active, last_login_at, created_at
     FROM admin_users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function touchLastLogin(id) {
  await query(`UPDATE admin_users SET last_login_at = now() WHERE id = $1`, [id]);
}

async function list() {
  const { rows } = await query(
    `SELECT id, email, full_name, role, is_active, last_login_at, created_at
     FROM admin_users ORDER BY created_at DESC`
  );
  return rows;
}

// ---- Refresh tokens (rotated on every /refresh call, revocable on logout) ----

async function storeRefreshToken({ adminUserId, tokenHash, expiresAt }) {
  await query(
    `INSERT INTO admin_refresh_tokens (admin_user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [adminUserId, tokenHash, expiresAt]
  );
}

async function findValidRefreshToken(tokenHash) {
  const { rows } = await query(
    `SELECT * FROM admin_refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function revokeRefreshToken(tokenHash) {
  await query(
    `UPDATE admin_refresh_tokens SET revoked_at = now() WHERE token_hash = $1`,
    [tokenHash]
  );
}

module.exports = {
  create,
  findByEmail,
  findById,
  touchLastLogin,
  list,
  storeRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
};
