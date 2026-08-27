const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const config = require('../../config');
const logger = require('../../utils/logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

/**
 * Uploads a local file to Cloudinary and deletes the local temporary file.
 * @param {Object} file - Multer file object
 * @returns {Promise<string>} Secure URL from Cloudinary
 */
async function uploadFile(file) {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'meditrust/prescriptions',
      resource_type: 'auto',
    });
    
    // Clean up local temp file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    return result.secure_url;
  } catch (error) {
    logger.error('Cloudinary upload failed:', error);
    // Cleanup local temp file even if Cloudinary fails to avoid disk leak
    if (fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        logger.error('Failed to delete temp file after Cloudinary failure:', err);
      }
    }
    throw error;
  }
}

/**
 * Deletes a file from Cloudinary based on its secure URL.
 * @param {string} publicUrl - Cloudinary secure URL
 */
async function deleteFile(publicUrl) {
  try {
    if (!publicUrl) return;
    // Extract public ID from publicUrl
    // E.g., https://res.cloudinary.com/cloud_name/image/upload/v123456/meditrust/prescriptions/xyz.jpg
    const urlParts = publicUrl.split('/');
    const meditrustIndex = urlParts.indexOf('meditrust');
    if (meditrustIndex !== -1) {
      const pathWithExtension = urlParts.slice(meditrustIndex).join('/');
      const lastDotIndex = pathWithExtension.lastIndexOf('.');
      const publicId = lastDotIndex !== -1 ? pathWithExtension.substring(0, lastDotIndex) : pathWithExtension;
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    logger.error('Cloudinary file deletion failed:', error);
  }
}

module.exports = { uploadFile, deleteFile };
