// src/models/enquiryModel.js
const { query } = require('../config/db');

async function create(data) {
  const { rows } = await query(
    `INSERT INTO enquiries (name, organization, email, phone, topic, message, consent, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      data.name || null, data.organization || null, data.email, data.phone || null,
      data.topic || null, data.message || null, !!data.consent, data.source || 'contact',
    ]
  );
  return rows[0];
}

async function list({ status, source, page = 1, pageSize = 30 } = {}) {
  const conditions = [];
  const params = [];
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (source) { params.push(source); conditions.push(`source = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(pageSize, (page - 1) * pageSize);
  const { rows } = await query(
    `SELECT * FROM enquiries ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function countNew() {
  const { rows } = await query(`SELECT COUNT(*)::int AS n FROM enquiries WHERE status = 'new'`);
  return rows[0].n;
}

async function updateStatus(id, status) {
  const { rows } = await query(`UPDATE enquiries SET status = $2 WHERE id = $1 RETURNING *`, [id, status]);
  return rows[0] || null;
}

async function remove(id) {
  const { rows } = await query(`DELETE FROM enquiries WHERE id = $1 RETURNING *`, [id]);
  return rows[0] || null;
}

module.exports = { create, list, countNew, updateStatus, remove };
