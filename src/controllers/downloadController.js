// src/controllers/downloadController.js
const path = require('path');
const { query } = require('../config/db');
const downloadTokenModel = require('../models/downloadTokenModel');
const mediaModel = require('../models/mediaModel');
const { uploadDir } = require('../middleware/upload');

async function download(req, res) {
  const tokenRow = await downloadTokenModel.findValidByToken(req.params.token);
  if (!tokenRow) return res.status(410).json({ error: 'This download link is invalid, expired, or exhausted' });

  const { rows } = await query(
    `SELECT oi.book_id FROM order_items oi WHERE oi.id = $1`,
    [tokenRow.order_item_id]
  );
  const bookId = rows[0]?.book_id;
  if (!bookId) return res.status(404).json({ error: 'File not found' });

  const { rows: bookRows } = await query(`SELECT digital_file_id FROM books WHERE id = $1`, [bookId]);
  const digitalFileId = bookRows[0]?.digital_file_id;
  if (!digitalFileId) return res.status(404).json({ error: 'File not found' });

  const media = await mediaModel.findById(digitalFileId);
  if (!media) return res.status(404).json({ error: 'File not found' });

  await downloadTokenModel.incrementDownloadCount(tokenRow.id);

  const filePath = path.join(uploadDir, media.file_name);
  res.download(filePath, media.original_file_name);
}

module.exports = { download };
