// src/controllers/taxonomyController.js
const slugify = require('slugify');
const taxonomyModel = require('../models/taxonomyModel');

async function createCategory(req, res) {
  const { context, name, description, parentId } = req.body;
  if (!['book', 'post', 'podcast'].includes(context)) {
    return res.status(400).json({ error: 'context must be book, post, or podcast' });
  }
  const slug = slugify(name, { lower: true, strict: true });
  const category = await taxonomyModel.createCategory({ context, name, slug, description, parentId });
  res.status(201).json({ category });
}

async function listCategories(req, res) {
  const categories = await taxonomyModel.listCategories(req.params.context);
  res.json({ categories });
}

async function deleteCategory(req, res) {
  const category = await taxonomyModel.deleteCategory(req.params.id);
  if (!category) return res.status(404).json({ error: 'Category not found' });
  res.json({ message: 'Deleted' });
}

async function createTag(req, res) {
  const { name } = req.body;
  const slug = slugify(name, { lower: true, strict: true });
  const tag = await taxonomyModel.findOrCreateTag(name, slug);
  res.status(201).json({ tag });
}

async function listTags(req, res) {
  const tags = await taxonomyModel.listTags();
  res.json({ tags });
}

module.exports = { createCategory, listCategories, deleteCategory, createTag, listTags };
