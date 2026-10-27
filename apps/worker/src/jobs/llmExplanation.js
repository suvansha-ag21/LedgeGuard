import { getPool } from '@ledgerguard/core/db';
import { generateRiskExplanation } from '@ledgerguard/core/risk';
import logger from '@ledgerguard/core/logger';

/**
 * Worker job generating AI compliance risk explanations for pending risk assessments.
 *
 * @param {import('pg').Pool} [pool]
 * @returns {Promise<number>} Number of explanations generated and saved
 */
export async function processPendingRiskExplanations(pool = getPool()) {
  try {
    const res = await pool.query(`
      SELECT id, transaction_id, score, decision, reasons, features
      FROM risk_assessments
      WHERE (decision = 'REVIEW' OR decision = 'BLOCK')
        AND ai_explanation IS NULL
      ORDER BY created_at ASC
      LIMIT 10
    `);

    let processedCount = 0;
    for (const row of res.rows) {
      const reasons = Array.isArray(row.reasons) ? row.reasons : JSON.parse(row.reasons || '[]');
      const features = typeof row.features === 'object' ? row.features : JSON.parse(row.features || '{}');

      const explanation = await generateRiskExplanation({
        decision: row.decision,
        score: row.score,
        reasons,
        features,
      });

      await pool.query(
        `UPDATE risk_assessments SET ai_explanation = $1 WHERE id = $2`,
        [explanation, row.id]
      );
      processedCount++;
    }

    if (processedCount > 0) {
      logger.info({ processedCount }, 'Generated asynchronous AI explanations for risk assessments');
    }

    return processedCount;
  } catch (err) {
    logger.error({ err }, 'Error processing pending AI risk explanations');
    return 0;
  }
}
