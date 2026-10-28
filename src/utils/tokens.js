// src/utils/tokens.js
// Two different "token" concepts live here, kept separate on purpose:
//  1. JWTs for admin/customer login sessions (access + refresh)
//  2. Opaque random tokens for download links + guest content access,
//     which are stored/hashed in the DB and looked up by value, not decoded.
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function signAccessToken(payload, expiresIn) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: expiresIn || process.env.JWT_ACCESS_EXPIRES || '15m',
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '30d',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

/** Random URL-safe opaque token for download links / guest content access. */
function generateOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/** SHA-256 hash - we store hashes of refresh tokens, never the raw value. */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateOpaqueToken,
  hashToken,
};
