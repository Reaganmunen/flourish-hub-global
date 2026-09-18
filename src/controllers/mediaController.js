// src/controllers/mediaController.js
const path = require('path');
const fs = require('fs');
const mediaModel = require('../models/mediaModel');
const { resolveMediaType, uploadDir } = require('../middleware/upload');

/**
 * Single shared upload endpoint used by: the CMS image/embed blocks,
 * podcast audio/video uploads, and digital book file uploads. The
 * `fileUrl` returned points at /uploads/<filename>, which app.js serves
 * statically for PUBLIC files (images, book covers). Podcast media and
 * digital book files are also stored under /uploads on disk, but are
 * only ever handed out through signed/gated routes — never link them
 * directly in public HTML.
 */
async function upload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const fileType = resolveMediaType(req.file.mimetype);
  const fileUrl = `/uploads/${req.file.filename}`;

  const media = await mediaModel.create({
    fileName: req.file.filename,
    originalFileName: req.file.originalname,
    fileUrl,
    fileType,
    mimeType: req.file.mimetype,
    fileSizeBytes: req.file.size,
    altText: req.body.altText,
    uploadedBy: req.admin.id,
  });

  res.status(201).json({ media });
}

async function list(req, res) {
  const { fileType, page, pageSize } = req.query;
  const media = await mediaModel.list({
    fileType,
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 30,
  });
  res.json({ media });
}

async function remove(req, res) {
  const media = await mediaModel.findById(req.params.id);
  if (!media) return res.status(404).json({ error: 'Not found' });

  await mediaModel.remove(media.id);

  const filePath = path.join(uploadDir, media.file_name);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') console.error('Failed to delete file from disk:', err);
  });

  res.json({ message: 'Deleted' });
}

module.exports = { upload, list, remove };
