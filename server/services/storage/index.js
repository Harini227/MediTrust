const config = require('../../config');
const localStorage = require('./local.storage');
const cloudinaryStorage = require('./cloudinary.storage');

/**
 * Unified interface for file storage.
 * Routes upload and delete calls dynamically based on config.providers.storage setting.
 */
async function uploadFile(file) {
  if (!file) return null;
  if (config.providers.storage === 'cloudinary') {
    return await cloudinaryStorage.uploadFile(file);
  }
  // Local storage provider fallback - returns local public path
  return localStorage.getPublicPath(file.filename);
}

/**
 * Deletes a file from either Cloudinary or local storage.
 * @param {string} filePath - File path or URL to delete
 */
async function deleteFile(filePath) {
  if (!filePath) return;
  if (config.providers.storage === 'cloudinary' || filePath.startsWith('http')) {
    return await cloudinaryStorage.deleteFile(filePath);
  }
  return localStorage.deleteFile(filePath);
}

module.exports = { uploadFile, deleteFile };
