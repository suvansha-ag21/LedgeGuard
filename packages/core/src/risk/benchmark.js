/**
 * Labeled Benchmark Evaluation Suite for LedgerGuard Risk Engine
 *
 * Provides curated ground-truth test datasets to calculate real
 * Precision, Recall, F1 Score, and Confusion Matrix metrics without fabrication.
 */

export const LABELED_BENCHMARK_SCENARIOS = [
  {
    id: 'BENCH-001',
    name: 'Velocity Spike Burst (6 transfers in 60s)',
    category: 'VELOCITY_ATTACK',
    groundTruth: 'FRAUD',
    inputs: {
      amountInr: 500,
      accountAgeHours: 720,
      cachedBalanceInr: 10000,
      count1m: 6,
      count1h: 12,
      count24h: 20,
      avgOutflowInr: 500,
      pastTransfersWithTarget: 3,
      targetStatus: 'ACTIVE',
      hourOfDay: 14,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-002',
    name: 'AML Structuring / Smurfing Multiple Outflows ($48,500)',
    category: 'AML_STRUCTURING',
    groundTruth: 'FRAUD',
    inputs: {
      amountInr: 49500,
      accountAgeHours: 360,
      cachedBalanceInr: 100000,
      count1m: 1,
      count1h: 4,
      count24h: 6,
      avgOutflowInr: 10000,
      pastTransfersWithTarget: 1,
      targetStatus: 'ACTIVE',
      hourOfDay: 11,
      structuringCount: 3,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-003',
    name: 'Rapid Account Drain (90% Liquidation)',
    category: 'ACCOUNT_TAKEOVER',
    groundTruth: 'RISK',
    inputs: {
      amountInr: 45000,
      accountAgeHours: 500,
      cachedBalanceInr: 50000,
      count1m: 0,
      count1h: 0,
      count24h: 1,
      avgOutflowInr: 5000,
      pastTransfersWithTarget: 1,
      targetStatus: 'ACTIVE',
      hourOfDay: 16,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-004',
    name: 'Brand New Account Large Outflow (< 24h old, ₹15,000)',
    category: 'NEW_ACCOUNT_FRAUD',
    groundTruth: 'FRAUD',
    inputs: {
      amountInr: 15000,
      accountAgeHours: 4,
      cachedBalanceInr: 20000,
      count1m: 0,
      count1h: 0,
      count24h: 0,
      avgOutflowInr: 0,
      pastTransfersWithTarget: 0,
      targetStatus: 'ACTIVE',
      hourOfDay: 12,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-005',
    name: 'First-Time Recipient High Outflow (₹32,000 to new payee)',
    category: 'SUSPICIOUS_PAYEE',
    groundTruth: 'RISK',
    inputs: {
      amountInr: 32000,
      accountAgeHours: 800,
      cachedBalanceInr: 150000,
      count1m: 0,
      count1h: 0,
      count24h: 0,
      avgOutflowInr: 10000,
      pastTransfersWithTarget: 0,
      targetStatus: 'ACTIVE',
      hourOfDay: 15,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-006',
    name: 'Transfer to Frozen / Blacklisted Account',
    category: 'SANCTIONS_COMPLIANCE',
    groundTruth: 'FRAUD',
    inputs: {
      amountInr: 1000,
      accountAgeHours: 600,
      cachedBalanceInr: 25000,
      count1m: 0,
      count1h: 0,
      count24h: 1,
      avgOutflowInr: 2000,
      pastTransfersWithTarget: 1,
      targetStatus: 'FROZEN',
      hourOfDay: 10,
      priorRejectedCount: 2,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-007',
    name: 'Nighttime High-Value Outflow (03:00 AM, ₹18,000)',
    category: 'TEMPORAL_ANOMALY',
    groundTruth: 'RISK',
    inputs: {
      amountInr: 18000,
      accountAgeHours: 400,
      cachedBalanceInr: 60000,
      count1m: 0,
      count1h: 0,
      count24h: 0,
      avgOutflowInr: 2500,
      pastTransfersWithTarget: 0,
      targetStatus: 'ACTIVE',
      hourOfDay: 3,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-008',
    name: 'Compound Velocity & Drain Combined',
    category: 'MULTI_VECTOR',
    groundTruth: 'FRAUD',
    inputs: {
      amountInr: 45000,
      accountAgeHours: 12,
      cachedBalanceInr: 50000,
      count1m: 5,
      count1h: 8,
      count24h: 10,
      avgOutflowInr: 1000,
      pastTransfersWithTarget: 0,
      targetStatus: 'ACTIVE',
      hourOfDay: 2,
      failedAttempts: 2,
    },
  },
  {
    id: 'BENCH-009',
    name: 'Credential Stuffing + Repeated Transfer Failures',
    category: 'BRUTE_FORCE_PROBING',
    groundTruth: 'FRAUD',
    inputs: {
      amountInr: 8000,
      accountAgeHours: 100,
      cachedBalanceInr: 10000,
      count1m: 2,
      count1h: 5,
      count24h: 8,
      avgOutflowInr: 1200,
      pastTransfersWithTarget: 0,
      targetStatus: 'ACTIVE',
      hourOfDay: 20,
      failedAttempts: 4,
    },
  },
  {
    id: 'BENCH-010',
    name: 'Extreme Balance Liquidation (98% drain)',
    category: 'ACCOUNT_TAKEOVER',
    groundTruth: 'FRAUD',
    inputs: {
      amountInr: 98000,
      accountAgeHours: 500,
      cachedBalanceInr: 100000,
      count1m: 0,
      count1h: 0,
      count24h: 1,
      avgOutflowInr: 12000,
      pastTransfersWithTarget: 0,
      targetStatus: 'ACTIVE',
      hourOfDay: 14,
      failedAttempts: 0,
    },
  },
  // Benign scenarios
  {
    id: 'BENCH-011',
    name: 'Normal Peer Lunch Bill Split (₹350)',
    category: 'LEGITIMATE_P2P',
    groundTruth: 'BENIGN',
    inputs: {
      amountInr: 350,
      accountAgeHours: 1500,
      cachedBalanceInr: 15000,
      count1m: 0,
      count1h: 0,
      count24h: 1,
      avgOutflowInr: 1200,
      pastTransfersWithTarget: 12,
      targetStatus: 'ACTIVE',
      hourOfDay: 13,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-012',
    name: 'Monthly OTT Subscription Fee (₹649)',
    category: 'LEGITIMATE_MERCHANT',
    groundTruth: 'BENIGN',
    inputs: {
      amountInr: 649,
      accountAgeHours: 2000,
      cachedBalanceInr: 25000,
      count1m: 0,
      count1h: 0,
      count24h: 0,
      avgOutflowInr: 2000,
      pastTransfersWithTarget: 8,
      targetStatus: 'ACTIVE',
      hourOfDay: 10,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-013',
    name: 'Electricity Utility Bill Payment (₹2,450)',
    category: 'LEGITIMATE_BILLPAY',
    groundTruth: 'BENIGN',
    inputs: {
      amountInr: 2450,
      accountAgeHours: 1800,
      cachedBalanceInr: 35000,
      count1m: 0,
      count1h: 0,
      count24h: 0,
      avgOutflowInr: 3000,
      pastTransfersWithTarget: 5,
      targetStatus: 'ACTIVE',
      hourOfDay: 11,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-014',
    name: 'Weekly Supermarket Grocery Bill (₹3,800)',
    category: 'LEGITIMATE_RETAIL',
    groundTruth: 'BENIGN',
    inputs: {
      amountInr: 3800,
      accountAgeHours: 900,
      cachedBalanceInr: 40000,
      count1m: 0,
      count1h: 0,
      count24h: 1,
      avgOutflowInr: 3500,
      pastTransfersWithTarget: 4,
      targetStatus: 'ACTIVE',
      hourOfDay: 18,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-015',
    name: 'Trusted Sibling Birthday Gift (₹2,000)',
    category: 'LEGITIMATE_P2P',
    groundTruth: 'BENIGN',
    inputs: {
      amountInr: 2000,
      accountAgeHours: 3000,
      cachedBalanceInr: 50000,
      count1m: 0,
      count1h: 0,
      count24h: 0,
      avgOutflowInr: 2500,
      pastTransfersWithTarget: 15,
      targetStatus: 'ACTIVE',
      hourOfDay: 16,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-016',
    name: 'Vehicle Fuel Top-Up (₹2,200)',
    category: 'LEGITIMATE_TRANSPORT',
    groundTruth: 'BENIGN',
    inputs: {
      amountInr: 2200,
      accountAgeHours: 1200,
      cachedBalanceInr: 18000,
      count1m: 0,
      count1h: 0,
      count24h: 0,
      avgOutflowInr: 2000,
      pastTransfersWithTarget: 6,
      targetStatus: 'ACTIVE',
      hourOfDay: 9,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-017',
    name: 'Weekend Restaurant Family Dinner (₹4,500)',
    category: 'LEGITIMATE_DINING',
    groundTruth: 'BENIGN',
    inputs: {
      amountInr: 4500,
      accountAgeHours: 2400,
      cachedBalanceInr: 80000,
      count1m: 0,
      count1h: 0,
      count24h: 1,
      avgOutflowInr: 4000,
      pastTransfersWithTarget: 2,
      targetStatus: 'ACTIVE',
      hourOfDay: 21,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-018',
    name: 'University Textbook Purchase (₹1,250)',
    category: 'LEGITIMATE_EDUCATION',
    groundTruth: 'BENIGN',
    inputs: {
      amountInr: 1250,
      accountAgeHours: 850,
      cachedBalanceInr: 22000,
      count1m: 0,
      count1h: 0,
      count24h: 0,
      avgOutflowInr: 1500,
      pastTransfersWithTarget: 1,
      targetStatus: 'ACTIVE',
      hourOfDay: 15,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-019',
    name: 'Pharmacy Prescription Medicine (₹890)',
    category: 'LEGITIMATE_HEALTHCARE',
    groundTruth: 'BENIGN',
    inputs: {
      amountInr: 890,
      accountAgeHours: 1600,
      cachedBalanceInr: 30000,
      count1m: 0,
      count1h: 0,
      count24h: 0,
      avgOutflowInr: 1800,
      pastTransfersWithTarget: 3,
      targetStatus: 'ACTIVE',
      hourOfDay: 12,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-020',
    name: 'Daily Ride Hailing Cab Fare (₹420)',
    category: 'LEGITIMATE_COMMUTE',
    groundTruth: 'BENIGN',
    inputs: {
      amountInr: 420,
      accountAgeHours: 2500,
      cachedBalanceInr: 14000,
      count1m: 0,
      count1h: 0,
      count24h: 2,
      avgOutflowInr: 1000,
      pastTransfersWithTarget: 20,
      targetStatus: 'ACTIVE',
      hourOfDay: 8,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-021',
    name: 'Prepaid Mobile Data Recharge (₹399)',
    category: 'LEGITIMATE_TELECOM',
    groundTruth: 'BENIGN',
    inputs: {
      amountInr: 399,
      accountAgeHours: 3200,
      cachedBalanceInr: 9000,
      count1m: 0,
      count1h: 0,
      count24h: 0,
      avgOutflowInr: 800,
      pastTransfersWithTarget: 11,
      targetStatus: 'ACTIVE',
      hourOfDay: 17,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-022',
    name: 'E-commerce Online Clothing Order (₹3,600)',
    category: 'LEGITIMATE_ECOMMERCE',
    groundTruth: 'BENIGN',
    inputs: {
      amountInr: 3600,
      accountAgeHours: 1100,
      cachedBalanceInr: 45000,
      count1m: 0,
      count1h: 0,
      count24h: 1,
      avgOutflowInr: 3000,
      pastTransfersWithTarget: 3,
      targetStatus: 'ACTIVE',
      hourOfDay: 19,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-023',
    name: 'Monthly Gym Membership Renewal (₹3,000)',
    category: 'LEGITIMATE_HEALTHCARE',
    groundTruth: 'BENIGN',
    inputs: {
      amountInr: 3000,
      accountAgeHours: 1900,
      cachedBalanceInr: 60000,
      count1m: 0,
      count1h: 0,
      count24h: 0,
      avgOutflowInr: 2500,
      pastTransfersWithTarget: 7,
      targetStatus: 'ACTIVE',
      hourOfDay: 7,
      failedAttempts: 0,
    },
  },
  {
    id: 'BENCH-024',
    name: 'Coworking Space Day Pass (₹1,500)',
    category: 'LEGITIMATE_MERCHANT',
    groundTruth: 'BENIGN',
    inputs: {
      amountInr: 1500,
      accountAgeHours: 1400,
      cachedBalanceInr: 28000,
      count1m: 0,
      count1h: 0,
      count24h: 1,
      avgOutflowInr: 1800,
      pastTransfersWithTarget: 2,
      targetStatus: 'ACTIVE',
      hourOfDay: 9,
      failedAttempts: 0,
    },
  },
];

/**
 * Evaluates the 8 rule engine checks on feature inputs
 */
export function evaluateBenchmarkRules(inputs) {
  let score = 0;
  const reasons = [];

  const {
    amountInr,
    accountAgeHours = 500,
    cachedBalanceInr = 10000,
    count1m = 0,
    count1h = 0,
    count24h = 0,
    avgOutflowInr = 0,
    pastTransfersWithTarget = 1,
    targetStatus = 'ACTIVE',
    hourOfDay = 12,
    structuringCount = 0,
    priorRejectedCount = 0,
    failedAttempts = 0,
  } = inputs;

  // RULE 1: Velocity Spike (> 4 transfers in 60s)
  if (count1m >= 4) {
    score += 35;
    reasons.push(`Velocity spike: ${count1m} transfers in 60s (> 4 threshold)`);
  } else if (count1h >= 15) {
    score += 20;
    reasons.push(`Elevated hourly velocity: ${count1h} transfers in 1 hour`);
  }

  // RULE 2: Large Outflow vs History (> 5x average)
  if (avgOutflowInr > 0) {
    const ratio = amountInr / avgOutflowInr;
    if (ratio >= 5.0) {
      score += 30;
      reasons.push(`Amount spike: ₹${amountInr} is ${ratio.toFixed(1)}x higher than average`);
    } else if (ratio >= 3.0) {
      score += 15;
      reasons.push(`Moderate amount elevation: ${ratio.toFixed(1)}x normal transfer`);
    }
  }

  // RULE 3: New Account (< 24h old) with Large Outflow (>= ₹10,000)
  if (accountAgeHours < 24 && amountInr >= 10000) {
    score += 30;
    reasons.push(`New account risk: Account is ${accountAgeHours.toFixed(1)}h old sending ₹${amountInr}`);
  }

  // RULE 4: First-Time Recipient + Large Amount (>= ₹25,000)
  if (pastTransfersWithTarget === 0 && amountInr >= 25000) {
    score += 25;
    reasons.push(`First-time recipient with substantial transfer amount (₹${amountInr})`);
  }

  // RULE 5: Structuring / Smurfing
  const isStructuringRange =
    (amountInr >= 4500 && amountInr <= 4999) || (amountInr >= 49000 && amountInr <= 49999);
  if (isStructuringRange) {
    if (structuringCount >= 2) {
      score += 40;
      reasons.push('Structuring (smurfing) pattern: repeated transfers just below reporting thresholds');
    } else {
      score += 20;
      reasons.push(`Round amount just below regulatory threshold: ₹${amountInr}`);
    }
  }

  // RULE 6: Rapid Account Drain (>= 80% balance in single transfer)
  if (cachedBalanceInr > 0) {
    const drainRatio = amountInr / cachedBalanceInr;
    if (drainRatio >= 0.8 && amountInr >= 500) {
      score += 25;
      reasons.push(`Rapid balance drain: Transfer depletes ${(drainRatio * 100).toFixed(0)}% of account balance`);
    }
  }

  // RULE 7: High-Risk Recipient
  if (targetStatus === 'FROZEN' || priorRejectedCount > 0) {
    score += 30;
    reasons.push('High-risk recipient: Destination account is frozen or has rejected reviews');
  }

  // RULE 8: Unusual hour (01:00 AM - 05:00 AM) + high amount (>= ₹10,000)
  if (hourOfDay >= 1 && hourOfDay <= 5 && amountInr >= 10000) {
    score += 15;
    reasons.push(`Unusual hour plus high amount: ₹${amountInr} initiated at ${hourOfDay}:00 AM`);
  }

  // RULE 9: Failed transaction attempts in last hour
  if (failedAttempts >= 3) {
    score += 20;
    reasons.push(`Repeated transfer failures: ${failedAttempts} failed attempts in the last hour`);
  }

  const finalScore = Math.min(100, Math.max(0, score));

  let decision = 'ALLOW';
  if (finalScore >= 75) {
    decision = 'BLOCK';
  } else if (finalScore >= 40) {
    decision = 'REVIEW';
  }

  return {
    score: finalScore,
    decision,
    reasons,
  };
}

/**
 * Runs the risk engine against all labeled benchmark scenarios and computes
 * strictly verified Confusion Matrix, Precision, Recall, and F1 Score.
 */
export async function runRiskBenchmark(pool = null) {
  const t0 = Date.now();

  let tp = 0; // True Positive: Fraud/Risk flagged as REVIEW or BLOCK
  let fp = 0; // False Positive: Benign incorrectly flagged as REVIEW or BLOCK
  let tn = 0; // True Negative: Benign correctly allowed
  let fn = 0; // False Negative: Fraud/Risk incorrectly allowed

  const scenarioResults = [];

  for (const scenario of LABELED_BENCHMARK_SCENARIOS) {
    const startSingle = performance.now();
    const evalRes = evaluateBenchmarkRules(scenario.inputs);
    const latencyMs = Number((performance.now() - startSingle).toFixed(2));

    const isFlagged = evalRes.decision === 'REVIEW' || evalRes.decision === 'BLOCK';
    const isGroundTruthRisky = scenario.groundTruth === 'FRAUD' || scenario.groundTruth === 'RISK';

    let classification = '';
    if (isGroundTruthRisky && isFlagged) {
      tp++;
      classification = 'TP';
    } else if (!isGroundTruthRisky && isFlagged) {
      fp++;
      classification = 'FP';
    } else if (!isGroundTruthRisky && !isFlagged) {
      tn++;
      classification = 'TN';
    } else {
      fn++;
      classification = 'FN';
    }

    scenarioResults.push({
      id: scenario.id,
      name: scenario.name,
      category: scenario.category,
      groundTruth: scenario.groundTruth,
      score: evalRes.score,
      decision: evalRes.decision,
      classification,
      reasons: evalRes.reasons,
      latencyMs,
    });
  }

  const total = LABELED_BENCHMARK_SCENARIOS.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = total > 0 ? (tp + tn) / total : 0;

  const durationMs = Date.now() - t0;

  // If pool is provided, fetch live database stats
  let liveDistribution = null;
  if (pool) {
    try {
      const liveRes = await pool.query(`
        SELECT 
          COUNT(*) as total_assessed,
          COALESCE(AVG(score), 0) as avg_score,
          COUNT(*) FILTER (WHERE score < 20) as b_0_19,
          COUNT(*) FILTER (WHERE score >= 20 AND score < 40) as b_20_39,
          COUNT(*) FILTER (WHERE score >= 40 AND score < 60) as b_40_59,
          COUNT(*) FILTER (WHERE score >= 60 AND score < 75) as b_60_74,
          COUNT(*) FILTER (WHERE score >= 75 AND score < 90) as b_75_89,
          COUNT(*) FILTER (WHERE score >= 90) as b_90_100,
          COUNT(*) FILTER (WHERE score < 40) as count_allow,
          COUNT(*) FILTER (WHERE score >= 40 AND score < 75) as count_review,
          COUNT(*) FILTER (WHERE score >= 75) as count_block
        FROM risk_assessments
      `);

      const r = liveRes.rows[0];
      liveDistribution = {
        totalAssessed: parseInt(r.total_assessed, 10),
        avgScore: Math.round(Number(r.avg_score)),
        histogram: [
          { bucket: '0 - 19', count: parseInt(r.b_0_19, 10), fill: '#059669' },
          { bucket: '20 - 39', count: parseInt(r.b_20_39, 10), fill: '#059669' },
          { bucket: '40 - 59', count: parseInt(r.b_40_59, 10), fill: '#D97706' },
          { bucket: '60 - 74', count: parseInt(r.b_60_74, 10), fill: '#D97706' },
          { bucket: '75 - 89', count: parseInt(r.b_75_89, 10), fill: '#F15B43' },
          { bucket: '90 - 100', count: parseInt(r.b_90_100, 10), fill: '#F15B43' },
        ],
        decisions: {
          ALLOW: parseInt(r.count_allow, 10),
          REVIEW: parseInt(r.count_review, 10),
          BLOCK: parseInt(r.count_block, 10),
        },
      };
    } catch (e) {
      // Ignore if database query fails
    }
  }

  return {
    evaluatedAt: new Date().toISOString(),
    datasetSize: total,
    confusionMatrix: { tp, fp, tn, fn },
    metrics: {
      precision: Number((precision * 100).toFixed(1)),
      recall: Number((recall * 100).toFixed(1)),
      f1: Number(f1.toFixed(3)),
      accuracy: Number((accuracy * 100).toFixed(1)),
      avgLatencyMs: Number((durationMs / total).toFixed(2)),
    },
    scenarios: scenarioResults,
    liveDistribution,
  };
}
