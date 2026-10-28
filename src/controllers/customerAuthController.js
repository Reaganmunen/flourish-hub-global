// src/controllers/customerAuthController.js
const bcrypt = require('bcrypt');
const customerModel = require('../models/customerModel');
const { query } = require('../config/db');
const { signAccessToken } = require('../utils/tokens');

// Customers get a simpler single access-token flow (no refresh/rotation).
// Lower stakes than admin accounts, and it keeps guest checkout simple.
// Their token lives much longer than the 15 minute admin token, otherwise a
// logged-in shopper silently turns into a guest while the browser still
// thinks they are signed in.
const CUSTOMER_TOKEN_EXPIRES = process.env.JWT_CUSTOMER_EXPIRES || '30d';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function register(req, res) {
  const email = cleanEmail(req.body.email);
  const { password, fullName, phone } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const existing = await customerModel.findByEmail(email);
  if (existing && existing.password_hash) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let customer;
  if (existing) {
    // They checked out as a guest before, so upgrade that record to a full account.
    customer = existing;
    await query(
      `UPDATE customers SET password_hash = $2, full_name = COALESCE($3, full_name), phone = COALESCE($4, phone) WHERE id = $1`,
      [existing.id, passwordHash, fullName || null, phone || null]
    );
  } else {
    customer = await customerModel.create({ email, passwordHash, fullName: fullName || null, phone: phone || null });
  }

  const accessToken = signAccessToken({ sub: customer.id, email, type: 'customer' }, CUSTOMER_TOKEN_EXPIRES);
  res.status(201).json({
    accessToken,
    customer: { id: customer.id, email, fullName: fullName || customer.full_name || null },
  });
}

async function login(req, res) {
  const email = cleanEmail(req.body.email);
  const { password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const customer = await customerModel.findByEmail(email);
  if (!customer || !customer.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, customer.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = signAccessToken(
    { sub: customer.id, email: customer.email, type: 'customer' },
    CUSTOMER_TOKEN_EXPIRES
  );
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
