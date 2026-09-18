// src/models/mediaModel.js
const { query } = require('../config/db');

async function create({ fileName, originalFileName, fileUrl, fileType, mimeType, fileSizeBytes, altText, uploadedBy }) {
  const { rows } = await query(
    `INSERT INTO media_library
       (file_name, original_file_name, file_url, file_type, mime_type, file_size_bytes, alt_text, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [fileName, originalFileName, fileUrl, fileType, mimeType, fileSizeBytes, altText || null, uploadedBy || null]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM media_library WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function list({ fileType, page = 1, pageSize = 30 } = {}) {
  const conditions = [];
  const params = [];
  if (fileType) {
    params.push(fileType);
    conditions.push(`file_type = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;
  params.push(pageSize, offset);

  const { rows } = await query(
    `SELECT * FROM media_library ${where}
     ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function remove(id) {
  const { rows } = await query(`DELETE FROM media_library WHERE id = $1 RETURNING *`, [id]);
  return rows[0] || null;
}

module.exports = { create, findById, list, remove };
