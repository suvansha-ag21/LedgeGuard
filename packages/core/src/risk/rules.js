/**
 * Layer 1 Rule-Based Risk Engine
 * Computes deterministic heuristic scores (0 - 100) and explainable reasons based on 8 fintech rules.
 */

/**
 * @typedef {object} RiskRuleResult
 * @property {number} score - Points contributed (0-100)
 * @property {string[]} reasons - Human-readable reason descriptions
 * @property {object} features - Extracted numeric features
 */

/**
 * Evaluates rule-based risk checks on a proposed transaction
 *
 * @param {object} params
 * @param {import('pg').Pool} params.pool
 * @param {string} params.sourceAccountId
 * @param {string} params.targetAccountId
 * @param {number} params.amountPaise
 * @returns {Promise<RiskRuleResult>}
 */
export async function evaluateRuleBasedRisk({
  pool,
  sourceAccountId,
  targetAccountId,
  amountPaise,
}) {
  let score = 0;
  const reasons = [];
  const ruleCodes = [];
  const evidence = [];

  const amountInr = amountPaise / 100;

  // 1. Fetch Source Account Details (age, balance, type)
  const accRes = await pool.query(
    `SELECT id, created_at, cached_balance, type FROM accounts WHERE id = $1`,
    [sourceAccountId]
  );
  const account = accRes.rows[0];
  const now = Date.now();
  const accountCreatedAt = account ? new Date(account.created_at).getTime() : now;
  const accountAgeHours = Math.max(0, (now - accountCreatedAt) / (1000 * 60 * 60));
  const cachedBalancePaise = account ? Number(account.cached_balance) : 0;

  // RULE 1: Velocity Spike (> 4 transfers in 60s)
  const velocityRes = await pool.query(
    `SELECT 
       COUNT(*) FILTER (WHERE le.created_at >= NOW() - INTERVAL '60 seconds') AS count_1m,
       COUNT(*) FILTER (WHERE le.created_at >= NOW() - INTERVAL '1 hour') AS count_1h,
       COUNT(*) FILTER (WHERE le.created_at >= NOW() - INTERVAL '24 hours') AS count_24h
     FROM ledger_entries le
     WHERE le.account_id = $1 AND le.amount_paise < 0`,
    [sourceAccountId]
  );
  const count1m = parseInt(velocityRes.rows[0]?.count_1m || '0', 10);
  const count1h = parseInt(velocityRes.rows[0]?.count_1h || '0', 10);
  const count24h = parseInt(velocityRes.rows[0]?.count_24h || '0', 10);

  if (count1m >= 4) {
    score += 35;
    const msg = `Velocity spike: ${count1m} transfers in the last 60 seconds (> 4 threshold)`;
    reasons.push(msg);
    ruleCodes.push('VELOCITY_SPIKE_1M');
    evidence.push({ code: 'VELOCITY_SPIKE_1M', severity: 'HIGH', message: msg, metric: count1m });
  } else if (count1h >= 15) {
    score += 20;
    const msg = `Elevated velocity: ${count1h} transfers in the last hour (> 15 threshold)`;
    reasons.push(msg);
    ruleCodes.push('VELOCITY_ELEVATED_1H');
    evidence.push({ code: 'VELOCITY_ELEVATED_1H', severity: 'MEDIUM', message: msg, metric: count1h });
  }

  // RULE 2: Historical Average Amount Comparison (> 5x 30-day average)
  const avgRes = await pool.query(
    `SELECT COALESCE(AVG(-amount_paise), 0) AS avg_paise, COUNT(*) AS history_count
     FROM ledger_entries
     WHERE account_id = $1 AND amount_paise < 0 AND created_at >= NOW() - INTERVAL '30 days'`,
    [sourceAccountId]
  );
  const historyCount = parseInt(avgRes.rows[0]?.history_count || '0', 10);
  const avgHistoricalPaise = Number(avgRes.rows[0]?.avg_paise || 0);

  let amountToAvgRatio = 1.0;
  if (historyCount >= 3 && avgHistoricalPaise > 0) {
    amountToAvgRatio = amountPaise / avgHistoricalPaise;
    if (amountToAvgRatio >= 5.0) {
      score += 30;
      const msg = `Amount spike: ₹${amountInr.toFixed(2)} is ${amountToAvgRatio.toFixed(1)}x higher than 30-day average (₹${(avgHistoricalPaise / 100).toFixed(2)})`;
      reasons.push(msg);
      ruleCodes.push('AMOUNT_SPIKE_HISTORICAL');
      evidence.push({ code: 'AMOUNT_SPIKE_HISTORICAL', severity: 'HIGH', message: msg, metric: amountToAvgRatio });
    } else if (amountToAvgRatio >= 3.0) {
      score += 15;
      const msg = `Amount moderately exceeds average: ${amountToAvgRatio.toFixed(1)}x normal transfer size`;
      reasons.push(msg);
      ruleCodes.push('AMOUNT_ELEVATED_HISTORICAL');
      evidence.push({ code: 'AMOUNT_ELEVATED_HISTORICAL', severity: 'LOW', message: msg, metric: amountToAvgRatio });
    }
  }

  // RULE 3: New Account (< 24h old) with Large Outflow (> ₹10,000)
  if (accountAgeHours < 24 && amountInr >= 10000) {
    score += 30;
    const msg = `New account risk: Account is only ${accountAgeHours.toFixed(1)}h old sending large outflow (₹${amountInr})`;
    reasons.push(msg);
    ruleCodes.push('NEW_ACCOUNT_LARGE_OUTFLOW');
    evidence.push({ code: 'NEW_ACCOUNT_LARGE_OUTFLOW', severity: 'HIGH', message: msg, metric: accountAgeHours });
  }

  // RULE 4: First-Time Recipient + Large Amount (> ₹25,000)
  const priorTransferRes = await pool.query(
    `SELECT COUNT(*) as count 
     FROM transactions t
     WHERE t.metadata->>'source_account_id' = $1 
       AND t.metadata->>'target_account_id' = $2 
       AND t.status = 'COMPLETED'`,
    [sourceAccountId, targetAccountId]
  );
  const isNewRecipient = parseInt(priorTransferRes.rows[0]?.count || '0', 10) === 0;

  if (isNewRecipient && amountInr >= 25000) {
    score += 25;
    const msg = `First-time recipient with substantial transfer amount (₹${amountInr})`;
    reasons.push(msg);
    ruleCodes.push('FIRST_TIME_RECIPIENT_LARGE');
    evidence.push({ code: 'FIRST_TIME_RECIPIENT_LARGE', severity: 'MEDIUM', message: msg, metric: amountInr });
  }

  // RULE 5: Round Amount Near Threshold / Structuring (e.g. ₹4,500 - ₹4,999 or ₹49,000 - ₹49,999)
  const isStructuringRange = (amountInr >= 4500 && amountInr <= 4999) || (amountInr >= 49000 && amountInr <= 49999);
  if (isStructuringRange) {
    const structuringRes = await pool.query(
      `SELECT COUNT(*) as count 
       FROM transactions t
       WHERE t.metadata->>'source_account_id' = $1 
         AND ((t.amount_paise BETWEEN 450000 AND 499900) OR (t.amount_paise BETWEEN 4900000 AND 4999900))
         AND t.created_at >= NOW() - INTERVAL '1 hour'`,
      [sourceAccountId]
    );
    const structuringCount = parseInt(structuringRes.rows[0]?.count || '0', 10);
    if (structuringCount >= 2) {
      score += 40;
      const msg = `Potential structuring (smurfing) pattern: multiple transfers just below reporting thresholds`;
      reasons.push(msg);
      ruleCodes.push('STRUCTURING_SMURFING_SUSPECTED');
      evidence.push({ code: 'STRUCTURING_SMURFING_SUSPECTED', severity: 'HIGH', message: msg, metric: structuringCount });
    } else {
      score += 20;
      const msg = `Round amount just below threshold: ₹${amountInr.toFixed(2)}`;
      reasons.push(msg);
      ruleCodes.push('ROUND_AMOUNT_NEAR_THRESHOLD');
      evidence.push({ code: 'ROUND_AMOUNT_NEAR_THRESHOLD', severity: 'LOW', message: msg, metric: amountInr });
    }
  }

  // RULE 6: Rapid Drain (> 80% balance in single transfer)
  let drainRatio = 0;
  if (cachedBalancePaise > 0) {
    drainRatio = amountPaise / cachedBalancePaise;
    if (drainRatio >= 0.8 && amountPaise >= 50000) {
      score += 25;
      const msg = `Rapid drain: Transfer depletes ${(drainRatio * 100).toFixed(0)}% of account balance in a single transaction`;
      reasons.push(msg);
      ruleCodes.push('RAPID_BALANCE_DRAIN');
      evidence.push({ code: 'RAPID_BALANCE_DRAIN', severity: 'HIGH', message: msg, metric: drainRatio });
    }
  }

  // RULE 7: High-Risk Recipient (Frozen history or previously flagged)
  const targetAccRes = await pool.query(
    `SELECT status FROM accounts WHERE id = $1`,
    [targetAccountId]
  );
  const targetStatus = targetAccRes.rows[0]?.status;

  const priorFlagsRes = await pool.query(
    `SELECT COUNT(*) as count
     FROM review_queue rq
     JOIN transactions t ON rq.transaction_id = t.id
     WHERE t.metadata->>'target_account_id' = $1 AND rq.status = 'REJECTED'`,
    [targetAccountId]
  );
  const priorRejectedCount = parseInt(priorFlagsRes.rows[0]?.count || '0', 10);

  if (targetStatus === 'FROZEN' || priorRejectedCount > 0) {
    score += 30;
    const msg = `High-risk recipient: Recipient has history of rejected compliance reviews or frozen status`;
    reasons.push(msg);
    ruleCodes.push('HIGH_RISK_RECIPIENT');
    evidence.push({ code: 'HIGH_RISK_RECIPIENT', severity: 'HIGH', message: msg, metric: priorRejectedCount });
  }

  // RULE 8: Unusual hour plus a high amount (01:00 AM - 05:00 AM local and >= ₹10,000)
  const hourOfDay = new Date().getHours();
  if (hourOfDay >= 1 && hourOfDay <= 5 && amountInr >= 10000) {
    score += 15;
    const msg = `Unusual hour plus high amount: ₹${amountInr.toFixed(2)} transfer initiated between 01:00 AM and 05:00 AM (${hourOfDay}:00)`;
    reasons.push(msg);
    ruleCodes.push('UNUSUAL_TIMING_HIGH_AMOUNT');
    evidence.push({ code: 'UNUSUAL_TIMING_HIGH_AMOUNT', severity: 'LOW', message: msg, metric: hourOfDay });
  }

  // RULE 9: Recent Failed Transaction Attempts in the last 1 hour
  const failedRes = await pool.query(
    `SELECT COUNT(*) as count 
     FROM transactions t
     WHERE t.metadata->>'source_account_id' = $1 
       AND t.status = 'FAILED' 
       AND t.created_at >= NOW() - INTERVAL '1 hour'`,
    [sourceAccountId]
  );
  const recentFailedAttempts = parseInt(failedRes.rows[0]?.count || '0', 10);
  if (recentFailedAttempts >= 3) {
    score += 20;
    const msg = `Repeated transaction failures: ${recentFailedAttempts} failed transfers in the last hour`;
    reasons.push(msg);
    ruleCodes.push('REPEATED_FAILED_ATTEMPTS');
    evidence.push({ code: 'REPEATED_FAILED_ATTEMPTS', severity: 'MEDIUM', message: msg, metric: recentFailedAttempts });
  }

  // Bound score between 0 and 100
  const finalScore = Math.min(100, Math.max(0, score));

  return {
    score: finalScore,
    reasons,
    ruleCodes,
    evidence,
    features: {
      amountPaise,
      amountInr,
      amountToAvgRatio: parseFloat(amountToAvgRatio.toFixed(2)),
      count1m,
      count1h,
      count24h,
      accountAgeHours: parseFloat(accountAgeHours.toFixed(1)),
      hourOfDay,
      isNewRecipient,
      cachedBalancePaise,
    },
  };
}
