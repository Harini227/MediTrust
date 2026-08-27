const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

const API_VERSION = '2024-11-30';
const MODEL_ID = 'prebuilt-read'; // general-purpose print + handwriting reader

/**
 * Real OCR via Azure AI Document Intelligence (free F0 tier).
 * Uses the prebuilt-read model, which handles both printed and
 * handwritten text. See the accuracy caveats discussed with the team:
 * this is a best-effort extraction layer, not a source of medical truth -
 * doctors always review the original uploaded image, not just this text.
 *
 * Flow: submit file bytes -> Azure returns an operation-location URL ->
 * poll that URL until status is 'succeeded' -> parse extracted lines.
 */
async function extract(publicFilePath) {
  if (!config.azureDocIntel.endpoint || !config.azureDocIntel.key) {
    throw new AppError('Azure Document Intelligence is not configured', 500);
  }

  let fileBuffer;
  if (publicFilePath.startsWith('http://') || publicFilePath.startsWith('https://')) {
    const response = await fetch(publicFilePath);
    if (!response.ok) {
      throw new AppError('Failed to fetch prescription image from storage', 500);
    }
    fileBuffer = Buffer.from(await response.arrayBuffer());
  } else {
    // publicFilePath looks like "/uploads/filename.ext" - resolve to actual disk path
    const filename = path.basename(publicFilePath);
    const fullPath = path.join(process.cwd(), config.upload.dir, filename);

    if (!fs.existsSync(fullPath)) {
      throw new AppError('Uploaded file not found for OCR processing', 404);
    }

    fileBuffer = fs.readFileSync(fullPath);
  }
  const endpoint = config.azureDocIntel.endpoint.replace(/\/$/, '');

  // Step 1: submit the document for analysis
  const submitUrl = `${endpoint}/documentintelligence/documentModels/${MODEL_ID}:analyze?api-version=${API_VERSION}`;

  const submitResponse = await fetch(submitUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Ocp-Apim-Subscription-Key': config.azureDocIntel.key,
    },
    body: fileBuffer,
  });

  if (submitResponse.status !== 202) {
    const errText = await submitResponse.text();
    logger.error(`Azure OCR submit failed: ${submitResponse.status} ${errText}`);
    throw new AppError('OCR service is temporarily unavailable', 502);
  }

  const operationLocation = submitResponse.headers.get('operation-location');
  if (!operationLocation) {
    throw new AppError('OCR service did not return a valid operation URL', 502);
  }

  // Step 2: poll for the result (Azure processes asynchronously)
  const result = await pollForResult(operationLocation);

  // Step 3: parse extracted text into our Case.ocrResult shape
  const rawText = result.analyzeResult?.content || '';
  const { medicines, dosages } = extractMedicinesAndDosages(rawText);

  return {
    medicines,
    dosages,
    rawText,
    processedAt: new Date(),
  };
}

async function pollForResult(operationLocation, attempt = 1) {
  const MAX_ATTEMPTS = 15;
  const POLL_INTERVAL_MS = 1500;

  if (attempt > MAX_ATTEMPTS) {
    throw new AppError('OCR processing timed out', 504);
  }

  const response = await fetch(operationLocation, {
    headers: { 'Ocp-Apim-Subscription-Key': config.azureDocIntel.key },
  });
  const data = await response.json();

  if (data.status === 'succeeded') {
    return data;
  }
  if (data.status === 'failed') {
    throw new AppError('OCR processing failed on the document provided', 502);
  }

  // status is 'running' or 'notStarted' - wait and retry
  await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  return pollForResult(operationLocation, attempt + 1);
}

/**
 * Very lightweight heuristic extraction of medicine-like lines from the
 * raw OCR text. Real medicine-name validation happens via the AI
 * synthesis step and doctor review, not here - this just gives the
 * frontend/AI something structured to reference.
 */
function extractMedicinesAndDosages(rawText) {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const dosagePattern = /\b\d+\s?(mg|ml|mcg|g|iu)\b/i;
  const medicines = [];
  const dosages = [];

  lines.forEach((line) => {
    if (dosagePattern.test(line)) {
      medicines.push(line);
      const match = line.match(dosagePattern);
      if (match) dosages.push(match[0]);
    }
  });

  return { medicines, dosages };
}

module.exports = { extract };
