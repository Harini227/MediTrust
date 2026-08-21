const config = require('../../config');
const azureProvider = require('./azure.provider');
const groqVisionProvider = require('./groq-vision.provider');

/**
 * Dummy OCR - fallback when no real provider is configured, so local dev
 * / demo still works with zero setup.
 */
async function dummyExtract(filePath) {
  return {
    medicines: ['Paracetamol 500mg', 'Amoxicillin 250mg'],
    dosages: ['1 tablet twice daily', '1 capsule three times daily'],
    rawText: `[Dummy OCR output for ${filePath}] Sample prescription text extracted.`,
    processedAt: new Date(),
  };
}

/**
 * Single entry point the rest of the app calls: ocrService.extract(...).
 * Controlled by OCR_PROVIDER in .env:
 *   'groq'  - free, no-card vision-LLM reading (recommended default)
 *   'azure' - real Azure Document Intelligence (needs Azure account)
 *   anything else - dummy fallback
 */
async function extract(filePath) {
  if (config.providers.ocr === 'groq') {
    return groqVisionProvider.extract(filePath);
  }
  if (config.providers.ocr === 'azure') {
    return azureProvider.extract(filePath);
  }
  return dummyExtract(filePath);
}

module.exports = { extract };
