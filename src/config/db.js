// src/config/db.js
// Single shared pg Pool. Every model imports `query` (or `pool` for
// transactions) from here instead of creating its own connection.
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Uncomment if your Postgres host requires SSL (e.g. most managed DBs):
  // ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  // A background/idle client crashed. Log it, don't crash the whole app.
  console.error('Unexpected error on idle Postgres client', err);
});

/**
 * query(text, params) -> Promise<QueryResult>
 * Thin wrapper so every model calls the same thing and we can add
 * logging/slow-query detection in one place later.
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.NODE_ENV !== 'production') {
    const ms = Date.now() - start;
    if (ms > 200) console.warn(`[slow query] ${ms}ms: ${text}`);
  }
  return res;
}

/**
 * withTransaction(fn) -> runs fn(client) inside BEGIN/COMMIT, ROLLBACK on throw.
 * Use this anywhere you touch more than one table that must succeed/fail
 * together (e.g. creating an order + its order_items).
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
