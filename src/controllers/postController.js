// src/controllers/postController.js
const slugify = require('slugify');
const postModel = require('../models/postModel');
const taxonomyModel = require('../models/taxonomyModel');

async function create(req, res) {
  const body = req.body;
  const slug = slugify(body.slug || body.title || '', { lower: true, strict: true });
  if (!slug) return res.status(400).json({ error: 'A title is required' });
  if (body.status === 'published' && !body.publishedAt) body.publishedAt = new Date();

  const post = await postModel.create({ ...body, slug, authorId: req.admin.id });

  if (body.categoryIds?.length) await taxonomyModel.setCategories('post', post.id, body.categoryIds);
  if (body.tagIds?.length) await taxonomyModel.setTags('post', post.id, body.tagIds);

  res.status(201).json({ post });
}

/**
 * Autosave-friendly update - the CMS drag-and-drop editor (Editor.js on
 * the frontend) calls this repeatedly with just `content` as the user
 * edits, and separately with `status: 'published'` when they hit Publish.
 */
async function update(req, res) {
  const body = req.body;
  if (body.slug) body.slug = slugify(body.slug, { lower: true, strict: true });
  // Only stamp the publish date the first time an article goes live. Doing it
  // on every save moved the date forward each time a published article was
  // edited or autosaved.
  if (body.status === 'published' && !body.publishedAt) {
    const existing = await postModel.findById(req.params.id);
    if (existing && !existing.published_at) body.publishedAt = new Date();
  }

  const post = await postModel.update(req.params.id, body);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  if (body.categoryIds) await taxonomyModel.setCategories('post', post.id, body.categoryIds);
  if (body.tagIds) await taxonomyModel.setTags('post', post.id, body.tagIds);

  res.json({ post });
}

/** Admin editor view - always full content, regardless of premium status. */
async function getById(req, res) {
  const post = await postModel.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const [categories, tags] = await Promise.all([
    taxonomyModel.getCategoriesFor('post', post.id),
    taxonomyModel.getTagsFor('post', post.id),
  ]);
  res.json({ post, categories, tags });
}

/** Loads the post by slug into req.item for the checkPremiumAccess middleware. */
async function loadPostBySlug(req, res, next) {
  const post = await postModel.findBySlug(req.params.slug);
  if (!post || post.status !== 'published') return res.status(404).json({ error: 'Post not found' });
  req.item = post;
  next();
}

/**
 * Public detail route. Runs AFTER loadPostBySlug + checkPremiumAccess,
 * which set req.item and req.hasFullAccess.
 */
async function getPublicBySlug(req, res) {
  const post = req.item;
  const [categories, tags] = await Promise.all([
    taxonomyModel.getCategoriesFor('post', post.id),
    taxonomyModel.getTagsFor('post', post.id),
  ]);

  const payload = { ...post };
  if (post.is_premium && !req.hasFullAccess) {
    payload.content = post.preview_content || [];
    payload.locked = true;
  } else {
    payload.locked = false;
  }
  delete payload.preview_content;

  res.json({ post: payload, categories, tags });
}

async function list(req, res) {
  const { type, status, isPremium, page, pageSize } = req.query;
  const posts = await postModel.list({
    type, status,
    isPremium: isPremium === undefined ? undefined : isPremium === 'true',
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 20,
  });
  res.json({ posts });
}

async function listPublic(req, res) {
  const { type, page, pageSize } = req.query;
  const posts = await postModel.list({
    type, publishedOnly: true,
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 20,
  });
  res.json({ posts });
}

async function remove(req, res) {
  const post = await postModel.remove(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json({ message: 'Deleted' });
}

module.exports = { create, update, getById, loadPostBySlug, getPublicBySlug, list, listPublic, remove };
