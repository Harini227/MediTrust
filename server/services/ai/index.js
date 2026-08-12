const config = require('../../config');
const dummyProvider = require('./dummy.provider');
const openaiProvider = require('./openai.provider');
const groqProvider = require('./groq.provider');

/**
 * Single entry point the rest of the app calls: aiService.synthesize(...).
 * Which provider actually runs is controlled entirely by AI_PROVIDER in
 * .env - no other code changes needed to switch providers.
 * 'groq' is the recommended free-tier option (no payment method needed).
 */
async function synthesize(params) {
  if (config.providers.ai === 'groq') {
    return groqProvider.synthesize(params);
  }
  if (config.providers.ai === 'openai') {
    return openaiProvider.synthesize(params);
  }
  return dummyProvider.synthesize(params);
}

module.exports = { synthesize };
