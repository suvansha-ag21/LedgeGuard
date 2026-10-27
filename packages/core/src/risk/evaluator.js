import { evaluateRuleBasedRisk } from './rules.js';
import { getTrainedIsolationForest, extractFeatureVector } from './isolationForest.js';
import logger from '../logger.js';

export const RISK_THRESHOLDS = {
  ALLOW_MAX: parseInt((typeof process !== 'undefined' && process.env?.RISK_THRESHOLD_ALLOW) || '29', 10),
  VERIFY_MAX: parseInt((typeof process !== 'undefined' && process.env?.RISK_THRESHOLD_VERIFY) || '59', 10),
  REVIEW_MAX: parseInt((typeof process !== 'undefined' && process.env?.RISK_THRESHOLD_REVIEW) || '79', 10),
  BLOCK_MIN: parseInt((typeof process !== 'undefined' && process.env?.RISK_THRESHOLD_BLOCK) || '80', 10),
};

/**
 * Calculates SQL 30-day z-score of transaction amount against historical outgoing transfers
 *
 * @param {import('pg').Pool} pool
 * @param {string} sourceAccountId
 * @param {number} amountPaise
 * @returns {Promise<{ zScore: number, avgPaise: number, stddevPaise: number }>}
 */
export async function calculateZScore(pool, sourceAccountId, amountPaise) {
  try {
    const res = await pool.query(
      `SELECT 
         COALESCE(AVG(-amount_paise), 0) AS avg_paise,
         COALESCE(STDDEV_POP(-amount_paise), 0) AS stddev_paise,
         COUNT(*) AS count
       FROM ledger_entries
       WHERE account_id = $1 AND amount_paise < 0 AND created_at >= NOW() - INTERVAL '30 days'`,
      [sourceAccountId]
    );

    const count = parseInt(res.rows[0]?.count || '0', 10);
    const avgPaise = Number(res.rows[0]?.avg_paise || 0);
    const stddevPaise = Number(res.rows[0]?.stddev_paise || 0);

    if (count >= 3 && stddevPaise > 0) {
      const zScore = (amountPaise - avgPaise) / stddevPaise;
      return {
        zScore: Number(zScore.toFixed(2)),
        avgPaise,
        stddevPaise,
      };
    }

    return { zScore: 0, avgPaise, stddevPaise };
  } catch (err) {
    logger.warn({ err: err.message }, 'Failed to compute SQL z-score; continuing with default');
    return { zScore: 0, avgPaise: 0, stddevPaise: 0 };
  }
}

/**
 * Multi-layer Fraud & Risk Assessment Engine:
 * - Layer 1: Deterministic Heuristic Rules (Velocity, Structuring, Depletion, New Account)
 * - Layer 2: Machine Learning Isolation Forest Anomaly Detection
 * - Layer 3: Statistical 30-Day Z-Score Deviation
 * 
 * Returns structured results conforming to PRD Section 5:
 * - score (0-100)
 * - triggered_rule_codes (string[])
 * - model_anomaly_score (0.00 - 1.00)
 * - relevant evidence (array of indicators)
 * - recommended action (ALLOW, VERIFY, REVIEW, BLOCK)
 * - calibrated status (boolean, false per PRD calibration standards)
 *
 * @param {object} params
 * @param {import('pg').Pool} params.pool
 * @param {string} params.sourceAccountId
 * @param {string} params.targetAccountId
 * @param {number} params.amountPaise
 * @param {object} [params.customThresholds]
 * @returns {Promise<{
 *   score: number,
 *   decision: 'ALLOW' | 'VERIFY' | 'REVIEW' | 'BLOCK',
 *   triggered_rule_codes: string[],
 *   model_anomaly_score: number,
 *   ruleScore: number,
 *   zScore: number,
 *   reasons: string[],
 *   evidence: Array<{ code: string, severity: string, message: string, metric: any }>,
 *   recommended_action: string,
 *   calibrated: boolean,
 *   calibration_note: string,
 *   features: object
 * }>}
 */
export async function assessTransactionRisk({
  pool,
  sourceAccountId,
  targetAccountId,
  amountPaise,
  customThresholds = {},
}) {
  const thresholds = { ...RISK_THRESHOLDS, ...customThresholds };

  // 1. Layer 1: Rule-Based Evaluation (Deterministic heuristic rules)
  const ruleResult = await evaluateRuleBasedRisk({
    pool,
    sourceAccountId,
    targetAccountId,
    amountPaise,
  });

  const ruleScore = ruleResult.score;
  const reasons = [...ruleResult.reasons];
  const triggered_rule_codes = [...(ruleResult.ruleCodes || [])];
  const evidence = [...(ruleResult.evidence || [])];

  // 2. Layer 2: Statistical 30-Day Z-Score Outlier Detection
  const { zScore, avgPaise, stddevPaise } = await calculateZScore(pool, sourceAccountId, amountPaise);

  let zScorePoints = 0;
  if (zScore >= 3.0) {
    zScorePoints = 25;
    const msg = `Statistical anomaly: Z-Score ${zScore} exceeds 3.0 standard deviations from 30-day baseline`;
    reasons.push(msg);
    triggered_rule_codes.push('ZSCORE_ANOMALY_EXTREME');
    evidence.push({ code: 'ZSCORE_ANOMALY_EXTREME', severity: 'HIGH', message: msg, metric: zScore });
  } else if (zScore >= 2.0) {
    zScorePoints = 12;
    const msg = `Moderate statistical deviation: Z-Score ${zScore}`;
    reasons.push(msg);
    triggered_rule_codes.push('ZSCORE_ANOMALY_MODERATE');
    evidence.push({ code: 'ZSCORE_ANOMALY_MODERATE', severity: 'LOW', message: msg, metric: zScore });
  }

  // 3. Layer 3: Machine Learning Isolation Forest Anomaly Scoring
  const featureVector = extractFeatureVector({
    amountInr: ruleResult.features.amountInr,
    velocity1m: ruleResult.features.count1m,
    velocity1h: ruleResult.features.count1h,
    amountToAvgRatio: ruleResult.features.amountToAvgRatio,
    balanceDrainRatio: ruleResult.features.cachedBalancePaise > 0 
      ? amountPaise / ruleResult.features.cachedBalancePaise 
      : 0,
    accountAgeHours: ruleResult.features.accountAgeHours,
    isNewRecipient: ruleResult.features.isNewRecipient ? 1 : 0,
    hourOfDay: ruleResult.features.hourOfDay,
  });

  const ifModel = getTrainedIsolationForest();
  const model_anomaly_score = ifModel.score(featureVector);

  let mlPoints = 0;
  if (model_anomaly_score >= 0.70) {
    mlPoints = 30;
    const msg = `ML Anomaly: Isolation Forest detected severe outlier pattern (Score: ${model_anomaly_score})`;
    reasons.push(msg);
    triggered_rule_codes.push('ML_ISOLATION_FOREST_HIGH');
    evidence.push({ code: 'ML_ISOLATION_FOREST_HIGH', severity: 'HIGH', message: msg, metric: model_anomaly_score });
  } else if (model_anomaly_score >= 0.58) {
    mlPoints = 15;
    const msg = `ML Anomaly: Isolation Forest flagged moderate multidimensional divergence (Score: ${model_anomaly_score})`;
    reasons.push(msg);
    triggered_rule_codes.push('ML_ISOLATION_FOREST_MODERATE');
    evidence.push({ code: 'ML_ISOLATION_FOREST_MODERATE', severity: 'MEDIUM', message: msg, metric: model_anomaly_score });
  }

  // 4. Score Synthesis (0 - 100)
  // Weighted blend: 60% Rule/Z-score indicators, 40% Isolation Forest Anomaly
  const rawScore = ruleScore + zScorePoints + mlPoints;
  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // 5. Configurable Decision Policy Mapping (PRD Section 5)
  // ALLOW: proceed normally
  // VERIFY: require additional authentication (2FA step-up)
  // REVIEW: hold for authorized investigation
  // BLOCK: reject before posting payment entries
  let decision = 'ALLOW';
  let recommended_action = 'Proceed normally with ledger posting.';

  if (finalScore >= thresholds.BLOCK_MIN) {
    decision = 'BLOCK';
    recommended_action = 'Reject transaction before posting. High anomaly score and critical rule triggers detected.';
  } else if (finalScore > thresholds.VERIFY_MAX) {
    decision = 'REVIEW';
    recommended_action = 'Hold transaction for compliance investigation in PLATFORM_HOLD bucket.';
  } else if (finalScore > thresholds.ALLOW_MAX) {
    decision = 'VERIFY';
    recommended_action = 'Require step-up authentication (2FA challenge) before releasing transaction.';
  }

  return {
    score: finalScore,
    decision,
    triggered_rule_codes,
    model_anomaly_score,
    ruleScore,
    zScore,
    reasons,
    evidence,
    recommended_action,
    calibrated: false,
    calibration_note: 'Unsupervised tree isolation score, not a direct probability of fraud.',
    features: {
      ...ruleResult.features,
      zScore,
      avgPaise,
      stddevPaise,
      model_anomaly_score,
    },
  };
}
