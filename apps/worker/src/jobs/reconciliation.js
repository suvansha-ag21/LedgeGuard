import { getPool } from '@ledgerguard/core/db';
import { runReconciliationAudit } from '@ledgerguard/core/ledger';
import logger from '@ledgerguard/core/logger';

/**
 * Worker job executing automated ledger reconciliation audit
 */
export async function executeReconciliationJob() {
  logger.info('Starting automated background ledger reconciliation audit...');
  try {
    const pool = getPool();
    const result = await runReconciliationAudit(pool);
    if (result.status === 'BALANCED') {
      logger.info(
        {
          totalEntries: result.total_entries_count,
          netSum: result.net_ledger_sum,
          accountsChecked: result.accounts_checked_count,
          durationMs: result.duration_ms,
        },
        'Reconciliation audit: ALL INVARIANTS BALANCED (Total Debits = Total Credits = 0)'
      );
    } else {
      logger.error(
        {
          mismatches: result.mismatches,
          netSum: result.net_ledger_sum,
        },
        'CRITICAL: Financial discrepancy detected during reconciliation audit!'
      );
    }
    return result;
  } catch (err) {
    logger.error({ err }, 'Reconciliation background job failed');
    throw err;
  }
}
