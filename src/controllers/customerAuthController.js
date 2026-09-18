// src/controllers/customerAuthController.js
const bcrypt = require('bcrypt');
const customerModel = require('../models/customerModel');
const { signAccessToken } = require('../utils/tokens');

// Customers get a simpler single access-token flow (no refresh/rotation) —
// lower stakes than admin accounts, and it keeps guest checkout simple.

async function register(req, res) {
  const { email, password, fullName, phone } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const existing = await customerModel.findByEmail(email);
  if (existing && existing.password_hash) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let customer;
  if (existing) {
    // They checked out as a guest before — upgrade that record to a full account.
    customer = existing;
    const { query } = require('../config/db');
    await query(
      `UPDATE customers SET password_hash = $2, full_name = COALESCE($3, full_name), phone = COALESCE($4, phone) WHERE id = $1`,
      [existing.id, passwordHash, fullName, phone]
    );
  } else {
    customer = await customerModel.create({ email, passwordHash, fullName, phone });
  }

  const accessToken = signAccessToken({ sub: customer.id, email, type: 'customer' });
  res.status(201).json({ accessToken, customer: { id: customer.id, email, fullName } });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const customer = await customerModel.findByEmail(email);
  if (!customer || !customer.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, customer.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = signAccessToken({ sub: customer.id, email: customer.email, type: 'customer' });
  res.json({
    accessToken,
    customer: { id: customer.id, email: customer.email, fullName: customer.full_name },
  });
}

async function me(req, res) {
  const customer = await customerModel.findById(req.customer.id);
  res.json({ customer });
}

module.exports = { register, login, me };
