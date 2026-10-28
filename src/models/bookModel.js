// src/models/bookModel.js
const { query } = require('../config/db');

async function create(data) {
  const { rows } = await query(
    `INSERT INTO books
       (title, slug, subtitle, book_author_name, description, isbn,
        is_digital, is_physical, price_cents, currency, cover_image_id,
        digital_file_id, physical_stock_qty, weight_grams, status,
        published_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING *`,
    [
      data.title, data.slug, data.subtitle || null, data.bookAuthorName || null,
      data.description || null, data.isbn || null, !!data.isDigital, !!data.isPhysical,
      data.priceCents, data.currency || 'USD', data.coverImageId || null,
      data.digitalFileId || null, data.physicalStockQty ?? null, data.weightGrams || null,
      data.status || 'draft', data.publishedAt || null, data.createdBy || null,
    ]
  );
  return rows[0];
}

async function update(id, data) {
  const fields = [];
  const params = [];
  const map = {
    title: 'title', subtitle: 'subtitle', bookAuthorName: 'book_author_name',
    description: 'description', isbn: 'isbn', isDigital: 'is_digital',
    isPhysical: 'is_physical', priceCents: 'price_cents', currency: 'currency',
    coverImageId: 'cover_image_id', digitalFileId: 'digital_file_id',
    physicalStockQty: 'physical_stock_qty', weightGrams: 'weight_grams',
    status: 'status', publishedAt: 'published_at', slug: 'slug',
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
    `UPDATE books SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
}

// NOTE on the cover_url / cover joins below:
// books only stores cover_image_id (a foreign key into media_library).
// Without this join, the API only ever returns that numeric id, and the
// storefront has no way to know what image it points at - it silently
// falls back to a placeholder no matter what's actually uploaded. The
// LEFT JOIN resolves it to a real, directly-usable URL alongside the id.
// digital_file_id is deliberately NOT joined here: that file is only meant
// to be reachable through the gated /api/downloads/:token flow, and
// resolving+returning its URL in a book payload (especially the public
// one) would hand out a direct link that bypasses that gate.

async function findById(id) {
  const { rows } = await query(
    `SELECT b.*, m.file_url AS cover_url
     FROM books b
     LEFT JOIN media_library m ON m.id = b.cover_image_id
     WHERE b.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findBySlug(slug) {
  const { rows } = await query(
    `SELECT b.*, m.file_url AS cover_url
     FROM books b
     LEFT JOIN media_library m ON m.id = b.cover_image_id
     WHERE b.slug = $1`,
    [slug]
  );
  return rows[0] || null;
}

/**
 * Public/admin listing with basic filters + pagination.
 * `publishedOnly` is what the public storefront route passes; the admin
 * listing route omits it so drafts show up too.
 */
async function list({ status, categoryId, search, publishedOnly = false, page = 1, pageSize = 20 } = {}) {
  const conditions = [];
  const params = [];

  if (publishedOnly) {
    conditions.push(`b.status = 'published'`);
  } else if (status) {
    params.push(status);
    conditions.push(`b.status = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(b.title ILIKE $${params.length} OR b.book_author_name ILIKE $${params.length})`);
  }

  let categoryJoin = '';
  if (categoryId) {
    params.push(categoryId);
    categoryJoin = `JOIN book_categories bc ON bc.book_id = b.id AND bc.category_id = $${params.length}`;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;
  params.push(pageSize, offset);

  const { rows } = await query(
    `SELECT b.*, m.file_url AS cover_url
     FROM books b
     LEFT JOIN media_library m ON m.id = b.cover_image_id
     ${categoryJoin} ${where}
     ORDER BY b.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function remove(id) {
  const { rows } = await query(`DELETE FROM books WHERE id = $1 RETURNING *`, [id]);
  return rows[0] || null;
}

async function decrementStock(id, qty) {
  const { rows } = await query(
    `UPDATE books SET physical_stock_qty = physical_stock_qty - $2
     WHERE id = $1 AND physical_stock_qty >= $2 RETURNING *`,
    [id, qty]
  );
  return rows[0] || null; // null means insufficient stock - caller should treat as out-of-stock
}

module.exports = { create, update, findById, findBySlug, list, remove, decrementStock };