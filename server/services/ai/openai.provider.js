const config = require('../../config');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `You are the MediTrust AI Medical Assistant. Your job is to SYNTHESIZE
the independent opinions of 3 doctors who each reviewed the same patient case - you never
diagnose or give medical advice yourself. Every medical decision is made by licensed doctors;
you only summarize, organize, and flag things for their attention.

Given the patient's symptoms, the medicines from their prescription, and 3 doctors'
independent decisions + reasoning, respond with STRICT JSON only (no markdown, no prose
outside the JSON object) in exactly this shape:

{
  "synthesis": "2-4 sentence neutral summary of what the doctors concluded and why, written for the patient to read",
  "conflictDetected": true or false,
  "drugInteractionWarnings": ["short warning strings, empty array if none apply"]
}

conflictDetected must be true whenever the 3 doctors' decisions are not unanimous.
Do not invent clinical facts not present in the input. Keep the synthesis calm, clear, and non-alarmist.`;

/**
 * Calls OpenAI's chat completions API to synthesize 3 doctor reviews into
 * a single patient-facing summary + conflict/interaction flags.
 */
async function synthesize({ symptoms, medicines = [], reviews = [] }) {
  if (!config.openai.apiKey) {
    throw new AppError('OPENAI_API_KEY is not configured', 500);
  }

  const userContent = JSON.stringify(
    {
      patientSymptoms: symptoms || 'Not provided',
      prescribedMedicines: medicines,
      doctorReviews: reviews.map((r, i) => ({
        doctorNumber: i + 1,
        decision: r.decision,
        reasoning: r.reasoning,
      })),
    },
    null,
    2
  );

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openai.apiKey}`,
    },
    body: JSON.stringify({
      model: config.openai.model || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    logger.error(`OpenAI API error: ${response.status} ${errText}`);
    throw new AppError('AI synthesis service is temporarily unavailable', 502);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    logger.error(`Failed to parse OpenAI response as JSON: ${raw}`);
    throw new AppError('AI synthesis returned an unexpected format', 502);
  }

  return {
    synthesis: parsed.synthesis,
    conflictDetected: Boolean(parsed.conflictDetected),
    drugInteractionWarnings: Array.isArray(parsed.drugInteractionWarnings)
      ? parsed.drugInteractionWarnings
      : [],
    processedAt: new Date(),
  };
}

module.exports = { synthesize };
