// src/middleware/auth.js
const { verifyAccessToken } = require('../utils/tokens');
const contentAccessModel = require('../models/contentAccessModel');

/** Requires a valid admin access token. Attaches req.admin = { id, role }. */
function authenticateAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Admin token required' });

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== 'admin') throw new Error('wrong token type');
    req.admin = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

/** Gate specific actions to the 'owner' role (e.g. managing other admin users). */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Customer auth is OPTIONAL almost everywhere because guest checkout is
 * supported. This middleware never rejects the request - it just attaches
 * req.customer if a valid token is present, so downstream code can branch
 * on "logged in vs guest".
 */
function attachCustomerIfPresent(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    if (payload.type === 'customer') req.customer = { id: payload.sub, email: payload.email };
  } catch (_) {
    // Bad/expired token on an optional route - just proceed as a guest.
  }
  next();
}

/** Use where a customer account is mandatory (e.g. viewing order history). */
function requireCustomer(req, res, next) {
  attachCustomerIfPresent(req, res, () => {
    if (!req.customer) return res.status(401).json({ error: 'Login required' });
    next();
  });
}

/**
 * Premium content gate for posts/podcasts.
 * Checks, in order: is the item even premium (if not, everyone gets full
 * content) -> is there a valid content_access row for this logged-in
 * customer -> is there a valid, unexpired access_token in the query string
 * (the guest link mailed after checkout).
 * Sets req.hasFullAccess = true/false; controllers decide what to send
 * (full content vs preview_content) based on that flag.
 */
function checkPremiumAccess(contentType) {
  return async (req, res, next) => {
    try {
      const item = req.item; // controller must load the post/podcast row first and set req.item
      if (!item) return res.status(404).json({ error: 'Content not found' });

      if (!item.is_premium) {
        req.hasFullAccess = true;
        return next();
      }

      // 1) Logged-in customer with a permanent access grant?
      if (req.customer) {
        const grant = await contentAccessModel.findByCustomerAndContent(
          req.customer.id,
          contentType,
          item.id
        );
        if (grant) {
          req.hasFullAccess = true;
          return next();
        }
      }

      // 2) Guest with a valid ?access_token=... link?
      const guestToken = req.query.access_token;
      if (guestToken) {
        const grant = await contentAccessModel.findValidByToken(guestToken, contentType, item.id);
        if (grant) {
          req.hasFullAccess = true;
          return next();
        }
      }

      req.hasFullAccess = false;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  authenticateAdmin,
  requireRole,
  attachCustomerIfPresent,
  requireCustomer,
  checkPremiumAccess,
};
