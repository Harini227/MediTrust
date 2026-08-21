const fs = require('fs');
const path = require('path');
const config = require('../../config');

/**
 * Local disk storage for the MVP. To swap to Cloudinary or Azure Blob
 * later, only this file needs to change - controllers only call
 * `saveFile()` / `deleteFile()` and never touch the filesystem directly.
 */
const uploadDir = path.join(process.cwd(), config.upload.dir);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Given a multer file object, returns the public-ish relative path
 * that gets stored on the Case document (served via /uploads static route).
 */
function getPublicPath(filename) {
  return `/uploads/${filename}`;
}

function deleteFile(publicPath) {
  const filename = path.basename(publicPath);
  const fullPath = path.join(uploadDir, filename);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

module.exports = { uploadDir, getPublicPath, deleteFile };
