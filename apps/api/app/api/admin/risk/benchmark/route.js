export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { runRiskBenchmark, LABELED_BENCHMARK_SCENARIOS } from '@ledgerguard/core/risk';
import {
  jsonResponse,
  errorResponse,
  handleOptions,
  authenticateRequest,
} from '@ledgerguard/core/api';

export async function OPTIONS(request) {
  return handleOptions(request);
}

export async function GET(request) {
  try {
    await authenticateRequest(request, ['ADMIN']);
    const pool = getPool();

    const url = new URL(request.url);
    const shouldRun = url.searchParams.get('run') === 'true';

    // If run is requested or by default, run evaluation against labeled suite
    if (shouldRun) {
      const benchmarkResult = await runRiskBenchmark(pool);
      return jsonResponse(benchmarkResult);
    }

    // Otherwise return suite metadata & live database distribution without claiming ML scores
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
    const liveDistribution = {
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

    return jsonResponse({
      status: 'BENCHMARK_READY',
      benchmarkDatasetSize: LABELED_BENCHMARK_SCENARIOS.length,
      note: 'Production supervised metrics require labeled chargeback ground truth. Trigger evaluation to calculate exact Precision, Recall, and F1 on the 24-scenario labeled benchmark suite.',
      liveDistribution,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
    await authenticateRequest(request, ['ADMIN']);
    const pool = getPool();

    const benchmarkResult = await runRiskBenchmark(pool);
    return jsonResponse(benchmarkResult);
  } catch (err) {
    return errorResponse(err);
  }
}
