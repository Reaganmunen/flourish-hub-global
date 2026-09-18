// src/models/taxonomyModel.js
// categories are scoped per taxonomy_context ('book' | 'post' | 'podcast');
// tags are global. This file also owns the *_categories / *_tags join
// tables for all three catalog types, since the pattern is identical.
const { query, withTransaction } = require('../config/db');

// ---------- Categories ----------

async function createCategory({ context, name, slug, description, parentId }) {
  const { rows } = await query(
    `INSERT INTO categories (context, name, slug, description, parent_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [context, name, slug, description || null, parentId || null]
  );
  return rows[0];
}

async function listCategories(context) {
  const { rows } = await query(
    `SELECT * FROM categories WHERE context = $1 ORDER BY name`,
    [context]
  );
  return rows;
}

async function deleteCategory(id) {
  const { rows } = await query(`DELETE FROM categories WHERE id = $1 RETURNING *`, [id]);
  return rows[0] || null;
}

// ---------- Tags ----------

async function findOrCreateTag(name, slug) {
  const { rows } = await query(
    `INSERT INTO tags (name, slug) VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [name, slug]
  );
  return rows[0];
}

async function listTags() {
  const { rows } = await query(`SELECT * FROM tags ORDER BY name`);
  return rows;
}

// ---------- Generic join-table helpers (book/post/podcast x categories/tags) ----------
// entity: 'book' | 'post' | 'podcast'

const TABLES = {
  book: { categories: 'book_categories', tags: 'book_tags', idCol: 'book_id' },
  post: { categories: 'post_categories', tags: 'post_tags', idCol: 'post_id' },
  podcast: { categories: 'podcast_categories', tags: 'podcast_tags', idCol: 'podcast_id' },
};

async function setCategories(entity, entityId, categoryIds = []) {
  const t = TABLES[entity];
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM ${t.categories} WHERE ${t.idCol} = $1`, [entityId]);
    for (const catId of categoryIds) {
      await client.query(
        `INSERT INTO ${t.categories} (${t.idCol}, category_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [entityId, catId]
      );
    }
  });
}

async function setTags(entity, entityId, tagIds = []) {
  const t = TABLES[entity];
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM ${t.tags} WHERE ${t.idCol} = $1`, [entityId]);
    for (const tagId of tagIds) {
      await client.query(
        `INSERT INTO ${t.tags} (${t.idCol}, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [entityId, tagId]
      );
    }
  });
}

async function getCategoriesFor(entity, entityId) {
  const t = TABLES[entity];
  const { rows } = await query(
    `SELECT c.* FROM categories c
     JOIN ${t.categories} j ON j.category_id = c.id
     WHERE j.${t.idCol} = $1`,
    [entityId]
  );
  return rows;
}

async function getTagsFor(entity, entityId) {
  const t = TABLES[entity];
  const { rows } = await query(
    `SELECT tg.* FROM tags tg
     JOIN ${t.tags} j ON j.tag_id = tg.id
     WHERE j.${t.idCol} = $1`,
    [entityId]
  );
  return rows;
}

module.exports = {
  createCategory,
  listCategories,
  deleteCategory,
  findOrCreateTag,
  listTags,
  setCategories,
  setTags,
  getCategoriesFor,
  getTagsFor,
};
