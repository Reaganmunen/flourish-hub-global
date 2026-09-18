// src/controllers/podcastController.js
const slugify = require('slugify');
const podcastModel = require('../models/podcastModel');
const taxonomyModel = require('../models/taxonomyModel');

async function create(req, res) {
  const body = req.body;
  const slug = body.slug ? slugify(body.slug, { lower: true }) : slugify(body.title, { lower: true, strict: true });

  const podcast = await podcastModel.create({ ...body, slug, uploadedBy: req.admin.id });

  if (body.categoryIds?.length) await taxonomyModel.setCategories('podcast', podcast.id, body.categoryIds);
  if (body.tagIds?.length) await taxonomyModel.setTags('podcast', podcast.id, body.tagIds);

  res.status(201).json({ podcast });
}

async function update(req, res) {
  const body = req.body;
  if (body.slug) body.slug = slugify(body.slug, { lower: true });
  if (body.status === 'published' && !body.publishedAt) body.publishedAt = new Date();

  const podcast = await podcastModel.update(req.params.id, body);
  if (!podcast) return res.status(404).json({ error: 'Podcast not found' });

  if (body.categoryIds) await taxonomyModel.setCategories('podcast', podcast.id, body.categoryIds);
  if (body.tagIds) await taxonomyModel.setTags('podcast', podcast.id, body.tagIds);

  res.json({ podcast });
}

async function getById(req, res) {
  const podcast = await podcastModel.findById(req.params.id);
  if (!podcast) return res.status(404).json({ error: 'Podcast not found' });
  res.json({ podcast });
}

async function loadPodcastBySlug(req, res, next) {
  const podcast = await podcastModel.findBySlug(req.params.slug);
  if (!podcast || podcast.status !== 'published') return res.status(404).json({ error: 'Podcast not found' });
  req.item = podcast;
  next();
}

/**
 * Public detail — swaps media_id for preview_media_id when the viewer lacks
 * access, and (now that podcastModel resolves ids to real URLs) does the
 * same for media_url/preview_media_url. This second swap matters: without
 * it, a locked episode's payload would still carry the FULL episode's
 * playable URL even while media_id correctly pointed at the preview —
 * the frontend would only need to read the wrong field to bypass the gate.
 */
async function getPublicBySlug(req, res) {
  const podcast = req.item;
  const [categories, tags] = await Promise.all([
    taxonomyModel.getCategoriesFor('podcast', podcast.id),
    taxonomyModel.getTagsFor('podcast', podcast.id),
  ]);

  const payload = { ...podcast };
  if (podcast.is_premium && !req.hasFullAccess) {
    payload.media_id = podcast.preview_media_id;
    payload.media_url = podcast.preview_media_url;
    payload.transcript = null;
    payload.locked = true;
  } else {
    payload.locked = false;
  }
  delete payload.preview_media_id;
  delete payload.preview_media_url;

  res.json({ podcast: payload, categories, tags });
}

async function list(req, res) {
  const { type, status, isPremium, page, pageSize } = req.query;
  const podcasts = await podcastModel.list({
    type, status,
    isPremium: isPremium === undefined ? undefined : isPremium === 'true',
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 20,
  });
  res.json({ podcasts });
}

async function listPublic(req, res) {
  const { type, page, pageSize } = req.query;
  const podcasts = await podcastModel.list({
    type, publishedOnly: true,
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 20,
  });
  res.json({ podcasts });
}

async function remove(req, res) {
  const podcast = await podcastModel.remove(req.params.id);
  if (!podcast) return res.status(404).json({ error: 'Podcast not found' });
  res.json({ message: 'Deleted' });
}

module.exports = {
  create, update, getById, loadPodcastBySlug, getPublicBySlug, list, listPublic, remove,
};