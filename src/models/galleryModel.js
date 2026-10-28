// src/models/galleryModel.js
const { query } = require('../config/db');

const SELECT = `
  SELECT g.*, m.file_url, m.file_type, m.mime_type, m.alt_text
  FROM gallery_items g
  JOIN media_library m ON m.id = g.media_id`;

async function create(data) {
  const { rows } = await query(
    `INSERT INTO gallery_items (media_id, title, caption, album, event_date, sort_order, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      data.mediaId, data.title || null, data.caption || null, data.album || null,
      data.eventDate || null, Number(data.sortOrder) || 0, data.status || 'published', data.createdBy || null,
    ]
  );
  return findById(rows[0].id);
}

async function findById(id) {
  const { rows } = await query(`${SELECT} WHERE g.id = $1`, [id]);
  return rows[0] || null;
}

async function update(id, data) {
  const fields = [];
  const params = [];
  const map = {
    title: 'title', caption: 'caption', album: 'album', eventDate: 'event_date',
    sortOrder: 'sort_order', status: 'status',
  };
  for (const [key, col] of Object.entries(map)) {
    if (data[key] !== undefined) {
      params.push(data[key] === '' ? null : data[key]);
      fields.push(`${col} = $${params.length}`);
    }
  }
  if (!fields.length) return findById(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE gallery_items SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING id`,
    params
  );
  return rows[0] ? findById(rows[0].id) : null;
}

async function remove(id) {
  const { rows } = await query(`DELETE FROM gallery_items WHERE id = $1 RETURNING *`, [id]);
  return rows[0] || null;
}

async function list({ album, publishedOnly = false, page = 1, pageSize = 24 } = {}) {
  const conditions = [];
  const params = [];
  if (publishedOnly) conditions.push(`g.status = 'published'`);
  if (album) {
    params.push(album);
    conditions.push(`g.album = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(pageSize, (page - 1) * pageSize);
  const { rows } = await query(
    `${SELECT} ${where}
     ORDER BY g.sort_order DESC, g.event_date DESC NULLS LAST, g.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function listAlbums({ publishedOnly = true } = {}) {
  const { rows } = await query(
    `SELECT g.album, COUNT(*)::int AS item_count, MAX(g.event_date) AS latest_event
     FROM gallery_items g
     WHERE g.album IS NOT NULL AND g.album <> '' ${publishedOnly ? `AND g.status = 'published'` : ''}
     GROUP BY g.album
     ORDER BY MAX(g.event_date) DESC NULLS LAST, g.album`
  );
  return rows;
}

module.exports = { create, findById, update, remove, list, listAlbums };
