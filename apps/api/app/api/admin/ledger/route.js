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
    const url = new URL(request.url);

    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));
    const accountId = url.searchParams.get('accountId');

    // 1. Fetch system-wide ledger summary
    const summaryRes = await pool.query(`
      SELECT 
        COUNT(*) as total_entries_count,
        COALESCE(SUM(CASE WHEN amount_paise < 0 THEN ABS(amount_paise) ELSE 0 END), 0) as total_debits_paise,
        COALESCE(SUM(CASE WHEN amount_paise > 0 THEN amount_paise ELSE 0 END), 0) as total_credits_paise,
        COALESCE(SUM(amount_paise), 0) as net_difference_paise
      FROM ledger_entries
    `);

    const summaryRow = summaryRes.rows[0];
    const totalDebits = Number(summaryRow.total_debits_paise);
    const totalCredits = Number(summaryRow.total_credits_paise);
    const netDifference = Number(summaryRow.net_difference_paise);

    // 2. Fetch Account Balances Verification (Cached vs Calculated from entries)
    const auditRes = await pool.query(`
      SELECT 
        a.id as account_id,
        a.name as account_name,
        a.type as account_type,
        a.cached_balance,
        a.status as account_status,
        COALESCE(SUM(le.amount_paise), 0) as calculated_balance,
        COUNT(le.id) as entries_count
      FROM accounts a
      LEFT JOIN ledger_entries le ON a.id = le.account_id
      GROUP BY a.id, a.name, a.type, a.cached_balance, a.status
      ORDER BY a.type DESC, a.name ASC
    `);

    const accountAudits = auditRes.rows.map((row) => {
      const cached = Number(row.cached_balance);
      const calculated = Number(row.calculated_balance);
      return {
        accountId: row.account_id,
        accountName: row.account_name,
        accountType: row.account_type,
        accountStatus: row.account_status,
        cachedBalancePaise: cached,
        calculatedBalancePaise: calculated,
        entriesCount: parseInt(row.entries_count, 10),
        isSynced: cached === calculated,
        differencePaise: cached - calculated,
      };
    });

    // 3. Fetch recent transactions with their double-entry journals
    let txQuery = `
      SELECT t.id, t.type, t.status, t.amount_paise, t.description, t.idempotency_key, t.created_at,
             ra.score as risk_score, ra.decision as risk_decision, ra.reasons as risk_reasons
      FROM transactions t
      LEFT JOIN risk_assessments ra ON t.id = ra.transaction_id
    `;
    const txParams = [];

    if (accountId) {
      txParams.push(accountId);
      txQuery += `
        WHERE t.id IN (
          SELECT DISTINCT transaction_id FROM ledger_entries WHERE account_id = $1
        )
      `;
    }

    txParams.push(limit);
    txParams.push(offset);
    txQuery += ` ORDER BY t.created_at DESC LIMIT $${txParams.length - 1} OFFSET $${txParams.length}`;

    const txRes = await pool.query(txQuery, txParams);
    const txRows = txRes.rows;

    // Fetch entries for these transactions
    const txIds = txRows.map((t) => t.id);
    let groupedTransactions = [];

    if (txIds.length > 0) {
      const entriesRes = await pool.query(
        `SELECT le.id, le.transaction_id, le.account_id, le.amount_paise, le.balance_after, le.created_at,
                a.name as account_name, a.type as account_type
         FROM ledger_entries le
         JOIN accounts a ON le.account_id = a.id
         WHERE le.transaction_id = ANY($1)
         ORDER BY le.created_at ASC, le.amount_paise ASC`,
        [txIds]
      );

      const entriesByTx = {};
      for (const e of entriesRes.rows) {
        if (!entriesByTx[e.transaction_id]) {
          entriesByTx[e.transaction_id] = [];
        }
        const amt = Number(e.amount_paise);
        entriesByTx[e.transaction_id].push({
          id: e.id,
          accountId: e.account_id,
          accountName: e.account_name,
          accountType: e.account_type,
          amountPaise: amt,
          balanceAfterPaise: Number(e.balance_after),
          entryType: amt < 0 ? 'DEBIT' : 'CREDIT',
          createdAt: e.created_at,
        });
      }

      groupedTransactions = txRows.map((tx) => {
        const entries = entriesByTx[tx.id] || [];
        const txSum = entries.reduce((acc, curr) => acc + curr.amountPaise, 0);
        const debits = entries.filter((e) => e.amountPaise < 0).reduce((acc, e) => acc + Math.abs(e.amountPaise), 0);
        const credits = entries.filter((e) => e.amountPaise > 0).reduce((acc, e) => acc + e.amountPaise, 0);

        return {
          id: tx.id,
          type: tx.type,
          status: tx.status,
          amountPaise: Number(tx.amount_paise),
          description: tx.description,
          idempotencyKey: tx.idempotency_key,
          createdAt: tx.created_at,
          riskScore: tx.risk_score,
          riskDecision: tx.risk_decision,
          entries,
          isBalanced: txSum === 0,
          totalDebitsPaise: debits,
          totalCreditsPaise: credits,
          netDifferencePaise: txSum,
        };
      });
    }

    return jsonResponse({
      totals: {
        totalEntriesCount: parseInt(summaryRow.total_entries_count, 10),
        totalDebitsPaise: totalDebits,
        totalCreditsPaise: totalCredits,
        netDifferencePaise: netDifference,
        isBalanced: netDifference === 0,
      },
      accountAudits,
      transactions: groupedTransactions,
      pagination: {
        limit,
        offset,
        count: groupedTransactions.length,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}