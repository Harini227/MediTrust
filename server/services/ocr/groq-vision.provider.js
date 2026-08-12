const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are a medical prescription reading assistant. You will be shown an
image of a doctor's prescription (which may be handwritten or printed). Read it carefully and
extract the information as STRICT JSON only (no markdown, no prose outside the JSON) in exactly
this shape:

{
  "medicines": ["medicine name + dosage as one string, e.g. 'Paracetamol 500mg'"],
  "dosages": ["just the dosage/frequency instructions, e.g. '1 tablet twice daily'"],
  "rawText": "your best-effort full transcription of everything visible on the prescription"
}

If handwriting is unclear or ambiguous, transcribe your best guess but do not invent medicines
that clearly are not there. If truly illegible, note that in rawText rather than guessing wildly.
This extraction assists doctors who will verify against the original image - it is not the final
medical record.`;

/**
 * Real OCR via Groq's vision-capable LLM. Sends the prescription image
 * directly to a multimodal model, which reads it contextually rather
 * than via character-pattern matching - tends to handle messy
 * handwriting more gracefully than classic OCR engines, though it can
 * occasionally guess wrong on truly illegible text (hence doctors always
 * review the original image, never just this extracted text).
 */
async function extract(publicFilePath) {
  if (!config.groq.apiKey) {
    throw new AppError('GROQ_API_KEY is not configured', 500);
  }

  const filename = path.basename(publicFilePath);
  const fullPath = path.join(process.cwd(), config.upload.dir, filename);

  if (!fs.existsSync(fullPath)) {
    throw new AppError('Uploaded file not found for OCR processing', 404);
  }

  const fileBuffer = fs.readFileSync(fullPath);
  const ext = path.extname(fullPath).slice(1).toLowerCase();
  const mimeType = ext === 'jpg' ? 'jpeg' : ext; // normalize .jpg -> jpeg
  const base64Image = fileBuffer.toString('base64');
  const dataUri = `data:image/${mimeType};base64,${base64Image}`;

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groq.apiKey}`,
    },
    body: JSON.stringify({
      model: config.groq.visionModel || 'qwen/qwen3.6-27b',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: SYSTEM_PROMPT },
            { type: 'image_url', image_url: { url: dataUri } },
          ],
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    logger.error(`Groq Vision OCR error: ${response.status} ${errText}`);
    throw new AppError('OCR service is temporarily unavailable', 502);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '';

  // The model may wrap JSON in markdown code fences or add stray text -
  // extract just the {...} block rather than requiring a perfectly clean response.
  let parsed;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch (err) {
    logger.error(`Failed to parse Groq Vision OCR response as JSON: ${raw}`);
    // Graceful fallback - still return something useful instead of failing outright
    return {
      medicines: [],
      dosages: [],
      rawText: raw || 'Could not read this prescription clearly. Please review the uploaded image directly.',
      processedAt: new Date(),
    };
  }

  return {
    medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
    dosages: Array.isArray(parsed.dosages) ? parsed.dosages : [],
    rawText: parsed.rawText || '',
    processedAt: new Date(),
  };
}

module.exports = { extract };
