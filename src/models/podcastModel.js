// src/models/podcastModel.js
const { query } = require('../config/db');

async function create(data) {
  const { rows } = await query(
    `INSERT INTO podcasts
       (title, slug, description, type, media_id, thumbnail_id, duration_seconds,
        transcript, status, published_at, is_premium, price_cents, preview_media_id, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      data.title, data.slug, data.description || null, data.type || 'audio',
      data.mediaId || null, data.thumbnailId || null, data.durationSeconds || null,
      data.transcript || null, data.status || 'draft', data.publishedAt || null,
      !!data.isPremium, data.priceCents ?? null, data.previewMediaId || null, data.uploadedBy || null,
    ]
  );
  return rows[0];
}

async function update(id, data) {
  const fields = [];
  const params = [];
  const map = {
    title: 'title', slug: 'slug', description: 'description', type: 'type',
    mediaId: 'media_id', thumbnailId: 'thumbnail_id', durationSeconds: 'duration_seconds',
    transcript: 'transcript', status: 'status', publishedAt: 'published_at',
    isPremium: 'is_premium', priceCents: 'price_cents', previewMediaId: 'preview_media_id',
  };
  for (const [key, col] of Object.entries(map)) {
    if (data[key] !== undefined) {
      params.push(data[key]);
      fields.push(`${col} = $${params.length}`);
    }
  }
  if (!fields.length) return findById(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE podcasts SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
}

// NOTE: podcasts only stores media_id / thumbnail_id / preview_media_id —
// foreign keys into media_library, not usable URLs. These LEFT JOINs
// resolve each one to a real file_url alongside its id, so both the
// storefront (thumbnails, the actual <audio>/<video> source) and the
// admin edit form (existing-thumbnail preview) have something to render.
// media_url/preview_media_url are exposed here regardless of premium
// status — podcastController.getPublicBySlug is what's responsible for
// swapping media_url -> preview_media_url (and stripping the full one)
// when the viewer doesn't have access, exactly as it already does for
// media_id. See the matching note in that controller.

async function findById(id) {
  const { rows } = await query(
    `SELECT p.*,
            m1.file_url AS media_url,
            m2.file_url AS preview_media_url,
            m3.file_url AS thumbnail_url
     FROM podcasts p
     LEFT JOIN media_library m1 ON m1.id = p.media_id
     LEFT JOIN media_library m2 ON m2.id = p.preview_media_id
     LEFT JOIN media_library m3 ON m3.id = p.thumbnail_id
     WHERE p.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findBySlug(slug) {
  const { rows } = await query(
    `SELECT p.*,
            m1.file_url AS media_url,
            m2.file_url AS preview_media_url,
            m3.file_url AS thumbnail_url
     FROM podcasts p
     LEFT JOIN media_library m1 ON m1.id = p.media_id
     LEFT JOIN media_library m2 ON m2.id = p.preview_media_id
     LEFT JOIN media_library m3 ON m3.id = p.thumbnail_id
     WHERE p.slug = $1`,
    [slug]
  );
  return rows[0] || null;
}

async function list({ type, status, isPremium, publishedOnly = false, page = 1, pageSize = 20 } = {}) {
  const conditions = [];
  const params = [];

  if (publishedOnly) {
    conditions.push(`p.status = 'published'`);
  } else if (status) {
    params.push(status);
    conditions.push(`p.status = $${params.length}`);
  }
  if (type) {
    params.push(type);
    conditions.push(`p.type = $${params.length}`);
  }
  if (isPremium !== undefined) {
    params.push(isPremium);
    conditions.push(`p.is_premium = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;
  params.push(pageSize, offset);

  const { rows } = await query(
    `SELECT p.id, p.title, p.slug, p.description, p.type, p.thumbnail_id,
            m3.file_url AS thumbnail_url, p.duration_seconds,
            p.status, p.published_at, p.is_premium, p.price_cents, p.created_at
     FROM podcasts p
     LEFT JOIN media_library m3 ON m3.id = p.thumbnail_id
     ${where}
     ORDER BY COALESCE(p.published_at, p.created_at) DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function remove(id) {
  const { rows } = await query(`DELETE FROM podcasts WHERE id = $1 RETURNING *`, [id]);
  return rows[0] || null;
}

module.exports = { create, update, findById, findBySlug, list, remove };