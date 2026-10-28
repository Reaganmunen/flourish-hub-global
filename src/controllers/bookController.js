// src/controllers/bookController.js
const slugify = require('slugify');
const bookModel = require('../models/bookModel');
const taxonomyModel = require('../models/taxonomyModel');

async function create(req, res) {
  const body = req.body;
  const slug = slugify(body.slug || body.title || '', { lower: true, strict: true });
  if (!slug) return res.status(400).json({ error: 'A title is required' });
  if (body.status === 'published' && !body.publishedAt) body.publishedAt = new Date();

  const book = await bookModel.create({
    ...body,
    slug,
    priceCents: Number(body.priceCents),
    createdBy: req.admin.id,
  });

  if (body.categoryIds?.length) await taxonomyModel.setCategories('book', book.id, body.categoryIds);
  if (body.tagIds?.length) await taxonomyModel.setTags('book', book.id, body.tagIds);

  res.status(201).json({ book });
}

async function update(req, res) {
  const body = req.body;
  if (body.slug) body.slug = slugify(body.slug, { lower: true, strict: true });
  if (body.status === 'published' && !body.publishedAt) {
    const existing = await bookModel.findById(req.params.id);
    if (existing && !existing.published_at) body.publishedAt = new Date();
  }

  const book = await bookModel.update(req.params.id, body);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  if (body.categoryIds) await taxonomyModel.setCategories('book', book.id, body.categoryIds);
  if (body.tagIds) await taxonomyModel.setTags('book', book.id, body.tagIds);

  res.json({ book });
}

/** Admin detail view - includes the protected digital_file_id, unlike getPublicBySlug. */
async function getById(req, res) {
  const book = await bookModel.findById(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  const [categories, tags] = await Promise.all([
    taxonomyModel.getCategoriesFor('book', book.id),
    taxonomyModel.getTagsFor('book', book.id),
  ]);
  res.json({ book, categories, tags });
}

/** Public storefront detail - strips the internal file reference. */
async function getPublicBySlug(req, res) {
  const book = await bookModel.findBySlug(req.params.slug);
  if (!book || book.status !== 'published') return res.status(404).json({ error: 'Book not found' });
  const { digital_file_id, ...publicBook } = book;
  const [categories, tags] = await Promise.all([
    taxonomyModel.getCategoriesFor('book', book.id),
    taxonomyModel.getTagsFor('book', book.id),
  ]);
  res.json({ book: publicBook, categories, tags });
}

async function list(req, res) {
  const { status, categoryId, search, page, pageSize } = req.query;
  const books = await bookModel.list({
    status, categoryId, search,
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 20,
  });
  res.json({ books });
}

async function listPublic(req, res) {
  const { categoryId, search, page, pageSize } = req.query;
  const rows = await bookModel.list({
    categoryId, search, publishedOnly: true,
    page: Number(page) || 1,
    pageSize: Math.min(Number(pageSize) || 20, 100),
  });
  // The public listing used to include digital_file_id, which the detail
  // route deliberately strips. Keep both consistent.
  const books = rows.map(({ digital_file_id, ...publicBook }) => publicBook);
  res.json({ books });
}

async function remove(req, res) {
  const book = await bookModel.remove(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json({ message: 'Deleted' });
}

module.exports = { create, update, getById, getPublicBySlug, list, listPublic, remove };
