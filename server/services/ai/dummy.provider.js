/**
 * Dummy AI synthesis - simple rule-based fallback so the app still works
 * with zero API cost / no key configured. Used when AI_PROVIDER=dummy.
 */
async function synthesize({ symptoms, medicines = [], reviews = [] }) {
  const decisions = reviews.map((r) => r.decision);
  const safeCount = decisions.filter((d) => d === 'safe').length;
  const conflictDetected = safeCount !== 0 && safeCount !== decisions.length;

  const synthesis = conflictDetected
    ? 'Doctors disagree on the safety of this prescription. Escalating to Chief Doctor for a final ruling.'
    : safeCount === decisions.length
    ? 'All reviewing doctors agree this prescription is safe to continue as prescribed.'
    : 'All reviewing doctors recommend revisiting your prescribing doctor before continuing this medication.';

  return {
    synthesis,
    conflictDetected,
    drugInteractionWarnings: [],
    processedAt: new Date(),
  };
}

module.exports = { synthesize };
