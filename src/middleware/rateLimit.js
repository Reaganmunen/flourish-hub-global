// src/middleware/rateLimit.js
// Tiny in-memory limiter for public forms, so the contact form cannot be used
// to flood the database. Per process; fine for a single server.
function rateLimit({ windowMs = 10 * 60 * 1000, max = 6 } = {}) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ error: 'Too many submissions. Please try again in a few minutes.' });
    }
    next();
  };
}

module.exports = { rateLimit };
