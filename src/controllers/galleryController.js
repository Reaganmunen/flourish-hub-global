// src/controllers/galleryController.js
const galleryModel = require('../models/galleryModel');
const mediaModel = require('../models/mediaModel');

const STATUSES = ['draft', 'published'];

async function listPublic(req, res) {
  const { album, page, pageSize } = req.query;
  const items = await galleryModel.list({
    album: album || undefined,
    publishedOnly: true,
    page: Math.max(Number(page) || 1, 1),
    pageSize: Math.min(Number(pageSize) || 24, 100),
  });
  res.json({ items });
}

async function listAlbumsPublic(req, res) {
  const albums = await galleryModel.listAlbums({ publishedOnly: true });
  res.json({ albums });
}

async function list(req, res) {
  const { album, page, pageSize } = req.query;
  const items = await galleryModel.list({
    album: album || undefined,
    page: Math.max(Number(page) || 1, 1),
    pageSize: Math.min(Number(pageSize) || 30, 100),
  });
  const albums = await galleryModel.listAlbums({ publishedOnly: false });
  res.json({ items, albums });
}

async function create(req, res) {
  const body = req.body;
  if (!body.mediaId) return res.status(400).json({ error: 'mediaId is required' });
  const media = await mediaModel.findById(body.mediaId);
  if (!media) return res.status(404).json({ error: 'That file is not in the media library' });
  if (!['image', 'video'].includes(media.file_type)) {
    return res.status(400).json({ error: 'The gallery accepts images and videos only' });
  }
  if (body.status && !STATUSES.includes(body.status)) return res.status(400).json({ error: 'Invalid status' });

  const item = await galleryModel.create({ ...body, createdBy: req.admin.id });
  res.status(201).json({ item });
}

async function update(req, res) {
  const body = req.body;
  if (body.status && !STATUSES.includes(body.status)) return res.status(400).json({ error: 'Invalid status' });
  const item = await galleryModel.update(req.params.id, body);
  if (!item) return res.status(404).json({ error: 'Gallery item not found' });
  res.json({ item });
}

async function remove(req, res) {
  const item = await galleryModel.remove(req.params.id);
  if (!item) return res.status(404).json({ error: 'Gallery item not found' });
  res.json({ message: 'Deleted' });
}

module.exports = { listPublic, listAlbumsPublic, list, create, update, remove };
