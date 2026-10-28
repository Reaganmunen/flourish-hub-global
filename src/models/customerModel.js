// src/models/customerModel.js
const { query } = require('../config/db');

async function create({ email, passwordHash = null, fullName = null, phone = null }) {
  const { rows } = await query(
    `INSERT INTO customers (email, password_hash, full_name, phone)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, phone, created_at`,
    [email, passwordHash, fullName, phone]
  );
  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await query(`SELECT * FROM customers WHERE lower(email) = lower($1)`, [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT id, email, full_name, phone, created_at FROM customers WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

/** Find an existing customer by email, or create a bare record (no password = guest-only account). */
async function findOrCreateGuest(email, fullName = null) {
  const clean = String(email).trim().toLowerCase();
  const existing = await findByEmail(clean);
  if (existing) return existing;
  return create({ email: clean, fullName });
}

async function addAddress(customerId, addr) {
  const { rows } = await query(
    `INSERT INTO customer_addresses
       (customer_id, label, line1, line2, city, state_region, postal_code, country, is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      customerId, addr.label, addr.line1, addr.line2 || null, addr.city,
      addr.stateRegion || null, addr.postalCode || null, addr.country, !!addr.isDefault,
    ]
  );
  return rows[0];
}

async function listAddresses(customerId) {
  const { rows } = await query(
    `SELECT * FROM customer_addresses WHERE customer_id = $1 ORDER BY is_default DESC, id DESC`,
    [customerId]
  );
  return rows;
}

module.exports = { create, findByEmail, findById, findOrCreateGuest, addAddress, listAddresses };
