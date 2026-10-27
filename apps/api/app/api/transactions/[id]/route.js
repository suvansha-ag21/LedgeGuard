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

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const claims = await authenticateRequest(request);
    const pool = getPool();

    const txRes = await pool.query(`SELECT * FROM transactions WHERE id = $1`, [id]);
    if (txRes.rows.length === 0) {
      return jsonResponse({ error: 'Transaction not found' }, 404);
    }
    const transaction = txRes.rows[0];
    transaction.amount_paise = Number(transaction.amount_paise);

    // Fetch entries
    const entriesRes = await pool.query(
      `SELECT le.*, a.name as account_name, a.type as account_type, a.user_id 
       FROM ledger_entries le 
       JOIN accounts a ON le.account_id = a.id 
       WHERE le.transaction_id = $1 
       ORDER BY le.amount_paise ASC`,
      [id]
    );

    const entries = entriesRes.rows.map((e) => ({
      ...e,
      amount_paise: Number(e.amount_paise),
      balance_after: Number(e.balance_after),
    }));

    // If not admin, check if user owns at least one account in this transaction
    if (claims.role !== 'ADMIN') {
      const isOwner = entries.some((e) => e.user_id === claims.id);
      if (!isOwner) {
        return jsonResponse({ error: 'Access denied' }, 403);
      }
    }

    // Fetch risk assessment if present
    const riskRes = await pool.query(
      `SELECT * FROM risk_assessments WHERE transaction_id = $1`,
      [id]
    );
    const riskAssessment = riskRes.rows[0] || null;

    // Fetch audit timeline logs for this transaction
    const auditRes = await pool.query(
      `SELECT * FROM audit_logs 
       WHERE entity_id = $1 OR (details->>'transactionId' = $1) OR (details->>'transaction_id' = $1)
       ORDER BY created_at ASC`,
      [id]
    );
    const auditTimeline = auditRes.rows;

    return jsonResponse({
      transaction,
      entries,
      riskAssessment,
      auditTimeline,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
