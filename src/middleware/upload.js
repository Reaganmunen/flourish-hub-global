// src/middleware/upload.js
// One multer instance, disk storage, used by any route that accepts a
// file (media library images, podcast audio/video, digital book files).
// Files land in UPLOAD_DIR; the mediaController is what actually creates
// the media_library row (file_type, mime_type, size, etc.) after upload.
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// __dirname here is <root>/src/middleware, so '..','..' gets back to the
// project root — uploads/ lives next to package.json, not inside src/.
const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const maxSizeBytes = (Number(process.env.MAX_UPLOAD_MB) || 200) * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: maxSizeBytes },
});

/** Maps a mime type to the media_type enum used in the DB. */
function resolveMediaType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf' || mimeType.includes('document')) return 'document';
  return 'other';
}

module.exports = { upload, uploadDir, resolveMediaType };
