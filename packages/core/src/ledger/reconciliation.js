import { getPool } from '../db/pool.js';
import logger from '../logger.js';

/**
 * Runs a complete system-wide financial reconciliation audit.
 *
 * Verifies 3 Core Invariants:
 * 1. Global Zero-Sum Invariant: Sum of ALL ledger entries in the entire system = 0
 * 2. Transaction Zero-Sum Invariant: For each transaction, sum of debits + credits = 0
 * 3. Account Balance Invariant: For each account, cached_balance = sum of all its entries
 *
 * @param {import('pg').Pool} [pool]
 * @returns {Promise<{
 *   id: string,
 *   status: 'BALANCED' | 'DISCREPANCY_DETECTED',
 *   totalEntriesCount: number,
 *   netLedgerSum: number,
 *   accountsCheckedCount: number,
 *   mismatches: any[],
 *   durationMs: number
 * }>}
 */
export async function runReconciliationAudit(pool = getPool()) {
  const startTime = Date.now();
  const mismatches = [];

  // 1. Verify Global Zero-Sum
  const globalSumRes = await pool.query(`
    SELECT COUNT(*) AS total_count, COALESCE(SUM(amount_paise), 0) AS net_sum 
    FROM ledger_entries
  `);
  const totalEntriesCount = parseInt(globalSumRes.rows[0].total_count, 10);
  const netLedgerSum = Number(globalSumRes.rows[0].net_sum);

  if (netLedgerSum !== 0) {
    mismatches.push({
      type: 'GLOBAL_ZERO_SUM_VIOLATION',
      message: `Global ledger entries sum is non-zero: ${netLedgerSum} paise`,
      netLedgerSum,
    });
  }

  // 2. Verify Every Transaction is Zero-Sum
  const txSumRes = await pool.query(`
    SELECT transaction_id, SUM(amount_paise) as tx_sum, COUNT(*) as leg_count 
    FROM ledger_entries 
    GROUP BY transaction_id
  `);

  for (const row of txSumRes.rows) {
    const sum = Number(row.tx_sum);
    if (sum !== 0) {
      mismatches.push({
        type: 'TRANSACTION_ZERO_SUM_VIOLATION',
        transactionId: row.transaction_id,
        imbalancePaise: sum,
        legCount: parseInt(row.leg_count, 10),
      });
    }
  }

  // 3. Verify Account Cached Balance vs Immutable Entries Sum
  const accountAuditsRes = await pool.query(`
    SELECT a.id, a.name, a.type, a.cached_balance, 
           COALESCE(SUM(le.amount_paise), 0) as calculated_sum
    FROM accounts a
    LEFT JOIN ledger_entries le ON a.id = le.account_id
    GROUP BY a.id, a.name, a.type, a.cached_balance
  `);

  const accountsCheckedCount = accountAuditsRes.rows.length;

  for (const acc of accountAuditsRes.rows) {
    const cached = Number(acc.cached_balance);
    const calculated = Number(acc.calculated_sum);

    if (cached !== calculated) {
      mismatches.push({
        type: 'ACCOUNT_BALANCE_DRIFT',
        accountId: acc.id,
        accountName: acc.name,
        cachedBalancePaise: cached,
        calculatedBalancePaise: calculated,
        differencePaise: cached - calculated,
      });
    }
  }

  const durationMs = Date.now() - startTime;
  const status = mismatches.length === 0 ? 'BALANCED' : 'DISCREPANCY_DETECTED';

  // Record audit run in reconciliation_runs table
  const insertRunRes = await pool.query(
    `INSERT INTO reconciliation_runs 
       (status, total_entries_count, net_ledger_sum, accounts_checked_count, mismatched_accounts_count, mismatches, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, ran_at, status, total_entries_count, net_ledger_sum, accounts_checked_count, mismatched_accounts_count, mismatches, duration_ms`,
    [
      status,
      totalEntriesCount,
      netLedgerSum,
      accountsCheckedCount,
      mismatches.length,
      JSON.stringify(mismatches),
      durationMs,
    ]
  );

  const runRecord = insertRunRes.rows[0];

  logger.info(
    { status, totalEntriesCount, netLedgerSum, mismatchCount: mismatches.length, durationMs },
    'Reconciliation audit completed'
  );

  return {
    ...runRecord,
    total_entries_count: Number(runRecord.total_entries_count),
    net_ledger_sum: Number(runRecord.net_ledger_sum),
    mismatches,
  };
}
