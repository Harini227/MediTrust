const aiService = require('../services/ai');
const catchAsync = require('../utils/catchAsync');

/**
 * POST /api/ai/test-synthesis
 * Standalone test endpoint - lets us verify the AI module works with
 * sample data before the real Doctor Review flow (Phase 6/7) exists.
 * Any logged-in user can call this for now; not part of the final API surface.
 */
exports.testSynthesis = catchAsync(async (req, res) => {
  const { symptoms, medicines, reviews } = req.body;

  const result = await aiService.synthesize({
    symptoms: symptoms || 'Persistent headache and mild fever for 3 days',
    medicines: medicines || ['Paracetamol 500mg', 'Amoxicillin 250mg'],
    reviews:
      reviews || [
        { decision: 'safe', reasoning: 'Standard dosage, no contraindications noted.' },
        { decision: 'safe', reasoning: 'Appropriate for the described symptoms.' },
        {
          decision: 'revisit_doctor',
          reasoning: 'Amoxicillin dosage seems high for reported weight; recommend re-check.',
        },
      ],
  });

  res.status(200).json({ success: true, data: { aiResult: result } });
});
