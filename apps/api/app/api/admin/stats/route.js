export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { 
  jsonResponse, 
  errorResponse, 
  handleOptions, 
  authenticateRequest 
} from '@ledgerguard/core/api';

export async function OPTIONS(request) {
  return handleOptions(request);
}

export async function GET(request) {
  try {
    await authenticateRequest(request, ['ADMIN']);
    const pool = getPool();

    // 1. Transaction Counts & Total Volume
    const txStatsRes = await pool.query(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount_paise), 0) as total_volume_paise,
        COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') as under_review_count,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_count,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failed_count
      FROM transactions
    `);
    const txStats = txStatsRes.rows[0];

    // 2. Active Accounts Count
    const accountsStatsRes = await pool.query(`
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_accounts,
        COUNT(*) FILTER (WHERE status = 'FROZEN') as frozen_accounts
      FROM accounts
      WHERE type != 'SYSTEM'
    `);
    const accountStats = accountsStatsRes.rows[0];

    // 3. System Balance Invariant
    const globalSumRes = await pool.query(`
      SELECT COALESCE(SUM(amount_paise), 0) as net_system_balance 
      FROM ledger_entries
    `);
    const netSystemBalancePaise = Number(globalSumRes.rows[0].net_system_balance);

    // 4. Risk Score Distribution
    const riskStatsRes = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE score < 40) as low_risk,
        COUNT(*) FILTER (WHERE score >= 40 AND score < 75) as medium_risk,
        COUNT(*) FILTER (WHERE score >= 75) as high_risk,
        COALESCE(AVG(score), 0) as avg_score
      FROM risk_assessments
    `);
    const riskStats = riskStatsRes.rows[0];

    // 5. Volume Over Time (grouped daily)
    const volumeTimelineRes = await pool.query(`
      SELECT 
        created_at,
        amount_paise
      FROM transactions
      ORDER BY created_at ASC
    `);

    const dailyMap = new Map();
    for (const r of volumeTimelineRes.rows) {
      const day = new Date(r.created_at).toISOString().split('T')[0];
      const prev = dailyMap.get(day) || { date: day, count: 0, volumePaise: 0 };
      prev.count++;
      prev.volumePaise += Number(r.amount_paise);
      dailyMap.set(day, prev);
    }

    const volumeTimeline = Array.from(dailyMap.values()).slice(-14).map((d) => ({
      date: d.date,
      count: d.count,
      volume: d.volumePaise / 100, // in INR
    }));

    const stats = {
      totalTransactions: parseInt(txStats.total_count, 10),
      totalVolumePaise: Number(txStats.total_volume_paise),
      totalVolumeInr: Number(txStats.total_volume_paise) / 100,
      pendingReviewCount: parseInt(txStats.under_review_count, 10),
      completedTransactions: parseInt(txStats.completed_count, 10),
      activeAccounts: parseInt(accountStats.active_accounts, 10),
      frozenAccountsCount: parseInt(accountStats.frozen_accounts, 10),
      systemBalanceInvariantPaise: netSystemBalancePaise,
      isSystemBalanced: netSystemBalancePaise === 0,
      riskDecisions: {
        ALLOW: parseInt(riskStats.low_risk, 10),
        REVIEW: parseInt(riskStats.medium_risk, 10),
        BLOCK: parseInt(riskStats.high_risk, 10),
      },
      avgRiskScore: Math.round(Number(riskStats.avg_score)),
      volumeByDay: volumeTimeline,
    };

    return jsonResponse({
      stats,
      metrics: stats,
      riskDistribution: {
        low: parseInt(riskStats.low_risk, 10),
        medium: parseInt(riskStats.medium_risk, 10),
        high: parseInt(riskStats.high_risk, 10),
        avgScore: Math.round(Number(riskStats.avg_score)),
      },
      volumeTimeline,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
