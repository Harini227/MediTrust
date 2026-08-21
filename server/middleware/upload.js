const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { uploadDir } = require('../services/storage/local.storage');
const { AppError } = require('./errorHandler');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new AppError('Only JPG, PNG, WEBP, and PDF files are allowed', 400),
      false
    );
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSizeMb * 1024 * 1024,
  },
});

module.exports = upload;
