import logger from '../logger.js';

/**
 * Generates an explainable risk justification for REVIEW / BLOCK transactions using LLM or deterministic fallback.
 * Strictly uses anonymized financial signals — zero PII (no names, emails, account numbers).
 *
 * @param {object} params
 * @param {string} params.decision - 'REVIEW' | 'BLOCK'
 * @param {number} params.score - 0 to 100
 * @param {string[]} params.reasons - Triggered risk reasons
 * @param {object} [params.features={}] - Anonymized feature metrics
 * @returns {Promise<string>} Plain-text compliance explanation
 */
export async function generateRiskExplanation({ decision, score, reasons = [], features = {} }) {
  const provider = process.env.LLM_PROVIDER || 'none';
  const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;

  const anonymizedContext = {
    decision,
    score,
    reasons,
    amountInr: features.amountInr || (features.amountPaise ? features.amountPaise / 100 : 0),
    velocity1m: features.count1m || 0,
    velocity1h: features.count1h || 0,
    amountToAvgRatio: features.amountToAvgRatio || 1,
    hourOfDay: features.hourOfDay ?? 12,
  };

  // If a provider is configured and API key exists, attempt API call with short timeout
  if (apiKey && provider !== 'none') {
    try {
      if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are an automated fintech compliance AI auditor. Write a concise, 2-3 sentence executive explanation of why this transaction was marked ${decision} (Risk Score: ${score}/100).\n\nSignals:\n- Primary reasons: ${reasons.join(', ')}\n- Amount: ₹${anonymizedContext.amountInr}\n- Velocity: ${anonymizedContext.velocity1m} transfers in 60s\n- Ratio to 30-day baseline: ${anonymizedContext.amountToAvgRatio}x\n\nBe objective, professional, and clear. Do not include markdown headers or bullet points.`
                }]
              }]
            }),
            signal: AbortSignal.timeout(3000), // 3s strict timeout
          }
        );
        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        }
      }
    } catch (err) {
      logger.warn({ err: err.message }, 'External LLM explanation call timed out or failed; falling back to deterministic explanation');
    }
  }

  // Deterministic rule-based template fallback (100% reliable, zero external dependencies)
  const primaryReasons = reasons.length > 0 
    ? reasons.slice(0, 3).join('; ') 
    : 'Elevated anomaly indicators detected across transaction velocity and amount metrics';

  const actionText = decision === 'BLOCK'
    ? 'The transaction was blocked immediately to prevent potential fraud or account depletion.'
    : 'The transaction has been placed on hold and queued for manual compliance review before settlement.';

  return `Automated Risk Assessment (${score}/100 - ${decision}): Primary risk triggers include: ${primaryReasons}. Transfer amount was ₹${anonymizedContext.amountInr.toFixed(2)} (${anonymizedContext.amountToAvgRatio}x historical baseline). ${actionText}`;
}
