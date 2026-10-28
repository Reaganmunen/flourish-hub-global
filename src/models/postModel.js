// src/models/postModel.js
// `content` and `preview_content` are JSONB arrays of editor blocks, e.g.
// [{ type: "paragraph", data: { text: "..." } }, { type: "image", data: { media_id: 12 } }]
// This model doesn't care what's inside a block - that's the CMS
// frontend's job (Editor.js). It just stores/returns the array as-is.
const { query } = require('../config/db');

async function create(data) {
  const { rows } = await query(
    `INSERT INTO posts
       (title, slug, type, excerpt, content, featured_image_id, status,
        published_at, is_premium, price_cents, preview_content, author_id,
        seo_title, seo_description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      data.title, data.slug, data.type || 'blog', data.excerpt || null,
      JSON.stringify(data.content || []), data.featuredImageId || null,
      data.status || 'draft', data.publishedAt || null, !!data.isPremium,
      data.priceCents ?? null, data.previewContent ? JSON.stringify(data.previewContent) : null,
      data.authorId || null, data.seoTitle || null, data.seoDescription || null,
    ]
  );
  return rows[0];
}

async function update(id, data) {
  const fields = [];
  const params = [];
  const jsonFields = new Set(['content', 'previewContent']);
  const map = {
    title: 'title', slug: 'slug', type: 'type', excerpt: 'excerpt',
    content: 'content', featuredImageId: 'featured_image_id', status: 'status',
    publishedAt: 'published_at', isPremium: 'is_premium', priceCents: 'price_cents',
    previewContent: 'preview_content', seoTitle: 'seo_title', seoDescription: 'seo_description',
  };
  for (const [key, col] of Object.entries(map)) {
    if (data[key] !== undefined) {
      params.push(jsonFields.has(key) ? JSON.stringify(data[key]) : data[key]);
      fields.push(`${col} = $${params.length}`);
    }
  }
  if (!fields.length) return findById(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE posts SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
}

// NOTE: posts only stores featured_image_id (a foreign key into
// media_library). This LEFT JOIN resolves it to a real featured_image_url
// alongside the id, the same fix applied to bookModel's cover and
// podcastModel's thumbnail/media. Unlike the podcast media swap, no
// gating logic is needed here - the featured image is a public thumbnail
// regardless of is_premium, same as a magazine's cover art showing even
// though the article inside is behind a paywall.

async function findById(id) {
  const { rows } = await query(
    `SELECT p.*, m.file_url AS featured_image_url
     FROM posts p
     LEFT JOIN media_library m ON m.id = p.featured_image_id
     WHERE p.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findBySlug(slug) {
  const { rows } = await query(
    `SELECT p.*, m.file_url AS featured_image_url
     FROM posts p
     LEFT JOIN media_library m ON m.id = p.featured_image_id
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
    `SELECT p.id, p.title, p.slug, p.type, p.excerpt, p.featured_image_id,
            m.file_url AS featured_image_url, p.status,
            p.published_at, p.is_premium, p.price_cents, p.author_id, p.created_at, p.updated_at
     FROM posts p
     LEFT JOIN media_library m ON m.id = p.featured_image_id
     ${where}
     ORDER BY COALESCE(p.published_at, p.created_at) DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function remove(id) {
  const { rows } = await query(`DELETE FROM posts WHERE id = $1 RETURNING *`, [id]);
  return rows[0] || null;
}

module.exports = { create, update, findById, findBySlug, list, remove };