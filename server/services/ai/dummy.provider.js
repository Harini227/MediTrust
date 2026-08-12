/**
 * Dummy AI synthesis - simple rule-based fallback so the app still works
 * with zero API cost / no key configured. Used when AI_PROVIDER=dummy.
 */
async function synthesize({ symptoms, sideEffects = '', medicines = [], reviews = [] }) {
  const decisions = reviews.map((r) => r.decision);
  const safeCount = decisions.filter((d) => d === 'safe').length;
  const conflictDetected = safeCount !== decisions.length;

  let status = 'INSUFFICIENT INFORMATION';
  let summary = 'The available review information is not enough to provide a clear medication conclusion.';
  let whatThisMeans = 'Please discuss your symptoms and side effects with your treating doctor before making changes to your treatment.';
  let nextStep = 'Contact your treating doctor to review your medication and symptoms.';
  let warningSigns = [];

  if (!conflictDetected && reviews.length > 0) {
    status = 'CONTINUE WITH MONITORING';
    summary = 'The review suggests the prescribed medication can continue for now, while watching the symptoms and side effects you reported.';
    whatThisMeans = 'Continue the prescribed treatment unless your doctor advises otherwise, and mention any side effects you are experiencing.';
    nextStep = 'Follow up with your treating doctor if any new symptoms develop or existing side effects worsen.';
  } else if (conflictDetected) {
    status = 'FOLLOW-UP RECOMMENDED';
    summary = 'The available reviews identified enough uncertainty that a follow-up with your treating doctor is recommended before making medication changes.';
    whatThisMeans = 'Do not change your medication on your own. Discuss the reported symptoms and possible medication-related effects with your treating doctor.';
    nextStep = 'Schedule a follow-up appointment with your treating doctor to review the prescription and side effects.';
  }

  return {
    internalSynthesis: conflictDetected
      ? 'The review shows differing opinions and the case is escalated for further clinical review.'
      : 'The review indicates the prescribed medication can continue with monitoring based on the available case information.',
    summary,
    status,
    whatThisMeans,
    nextStep,
    warningSigns,
    conflictDetected,
    drugInteractionWarnings: [],
    processedAt: new Date(),
  };
}

module.exports = { synthesize };
