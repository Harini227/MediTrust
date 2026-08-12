const config = require('../../config');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are the MediTrust AI Medical Assistant. Your job is to synthesize the available case information into two outputs:

1) An internal AI synthesis for authorized clinical review.
2) A unified, patient-facing medication report.

Do not describe the doctor voting process or reveal how many doctors agreed or disagreed. Do not provide separate doctor opinions. Do not invent diagnosis or medical facts.

Respond with STRICT JSON only (no markdown, no prose outside the JSON object) in exactly this shape:

{
  "internalSynthesis": "A concise internal AI summary of the case for clinical reviewers.",
  "status": "CONTINUE WITH MONITORING" | "FOLLOW-UP RECOMMENDED" | "FURTHER MEDICAL EVALUATION RECOMMENDED" | "URGENT MEDICAL ATTENTION" | "INSUFFICIENT INFORMATION",
  "summary": "A short unified overview of the medication review and main findings.",
  "whatThisMeans": "A clear, patient-friendly explanation of what the review means for the patient.",
  "nextStep": "A single actionable recommendation based on the available information.",
  "warningSigns": ["Important warning signs if relevant, otherwise an empty array"]
}

When generating the patient-facing report, combine:
- the patient's reported symptoms,
- the patient's reported side effects,
- the prescription medicines extracted from the prescription,
- the AI medication analysis,
- the clinical review observations.

Do not mention doctor names, counts, votes, or internal process details. Do not tell the patient to stop or change medication without explicit clinical support. Prefer uncertainty when information is incomplete.

Keep the tone calm, professional, and reassuring.`;

/**
 * Calls Groq's free-tier chat completions API (OpenAI-compatible format,
 * running Llama 3.3) to synthesize 3 doctor reviews into a single
 * patient-facing summary + conflict/interaction flags.
 */
async function synthesize({ symptoms, sideEffects = '', medicines = [], reviews = [] }) {
  if (!config.groq.apiKey) {
    throw new AppError('GROQ_API_KEY is not configured', 500);
  }

  const userContent = JSON.stringify(
    {
      patientSymptoms: symptoms || 'Not provided',
      reportedSideEffects: sideEffects || 'Not provided',
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

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groq.apiKey}`,
    },
    body: JSON.stringify({
      model: config.groq.model || 'openai/gpt-oss-120b',
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
    logger.error(`Groq API error: ${response.status} ${errText}`);
    throw new AppError('AI synthesis service is temporarily unavailable', 502);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    logger.error(`Failed to parse Groq response as JSON: ${raw}`);
    throw new AppError('AI synthesis returned an unexpected format', 502);
  }

  return {
    internalSynthesis: parsed.internalSynthesis || parsed.summary || parsed.synthesis,
    summary: parsed.summary || parsed.synthesis,
    status: parsed.status || 'INSUFFICIENT INFORMATION',
    whatThisMeans: parsed.whatThisMeans || '',
    nextStep: parsed.nextStep || '',
    warningSigns: Array.isArray(parsed.warningSigns) ? parsed.warningSigns : [],
    conflictDetected: Boolean(parsed.conflictDetected),
    drugInteractionWarnings: Array.isArray(parsed.drugInteractionWarnings)
      ? parsed.drugInteractionWarnings
      : [],
    processedAt: new Date(),
  };
}

module.exports = { synthesize };
