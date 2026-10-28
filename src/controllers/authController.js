// src/controllers/authController.js
const bcrypt = require('bcrypt');
const adminModel = require('../models/adminModel');
const { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } = require('../utils/tokens');

const REFRESH_COOKIE = 'admin_refresh_token';
const isProd = process.env.NODE_ENV === 'production';

function refreshExpiryDate() {
  // Mirrors JWT_REFRESH_EXPIRES ("30d" style) -> ms. Simple parser, days only, good enough here.
  const raw = process.env.JWT_REFRESH_EXPIRES || '30d';
  const days = parseInt(raw, 10) || 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Owner-only: create an editor (or another owner) account.
 * The very first owner account should be seeded directly in the DB /
 * via a one-off script, since nobody is authenticated to call this yet.
 */
async function register(req, res) {
  const { password, fullName, role } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'email, password and fullName are required' });
  }
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (role && !['owner', 'editor'].includes(role)) return res.status(400).json({ error: 'role must be owner or editor' });
  const existing = await adminModel.findByEmail(email);
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await adminModel.create({ email, passwordHash, fullName, role: role || 'editor' });
  res.status(201).json({ admin });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const admin = await adminModel.findByEmail(email);
  if (!admin || !admin.is_active) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = signAccessToken({ sub: admin.id, role: admin.role, type: 'admin' });
  const refreshToken = signRefreshToken({ sub: admin.id, type: 'admin' });

  await adminModel.storeRefreshToken({
    adminUserId: admin.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiryDate(),
  });
  await adminModel.touchLastLogin(admin.id);

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: refreshExpiryDate().getTime() - Date.now(),
  });

  res.json({
    accessToken,
    admin: { id: admin.id, email: admin.email, fullName: admin.full_name, role: admin.role },
  });
}

async function refresh(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const stored = await adminModel.findValidRefreshToken(hashToken(token));
  if (!stored) return res.status(401).json({ error: 'Refresh token revoked or expired' });

  const admin = await adminModel.findById(payload.sub);
  if (!admin || !admin.is_active) return res.status(401).json({ error: 'Account inactive' });

  const accessToken = signAccessToken({ sub: admin.id, role: admin.role, type: 'admin' });
  res.json({ accessToken });
}

async function logout(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) await adminModel.revokeRefreshToken(hashToken(token));
  res.clearCookie(REFRESH_COOKIE);
  res.json({ message: 'Logged out' });
}

async function me(req, res) {
  const admin = await adminModel.findById(req.admin.id);
  res.json({ admin });
}

async function listAdmins(req, res) {
  const admins = await adminModel.list();
  res.json({ admins });
}

module.exports = { register, login, refresh, logout, me, listAdmins };
