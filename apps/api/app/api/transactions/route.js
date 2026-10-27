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
    const claims = await authenticateRequest(request);
    const pool = getPool();

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const accountId = url.searchParams.get('accountId');

    let whereClauses = [];
    let queryParams = [];

    if (claims.role !== 'ADMIN') {
      // Normal users can only see transactions involving their accounts
      queryParams.push(claims.id);
      whereClauses.push(`t.id IN (
        SELECT DISTINCT transaction_id 
        FROM ledger_entries le 
        JOIN accounts a ON le.account_id = a.id 
        WHERE a.user_id = $${queryParams.length}
      )`);
    }

    if (accountId) {
      queryParams.push(accountId);
      whereClauses.push(`t.id IN (
        SELECT transaction_id FROM ledger_entries WHERE account_id = $${queryParams.length}
      )`);
    }

    if (type) {
      queryParams.push(type);
      whereClauses.push(`t.type = $${queryParams.length}`);
    }

    if (status) {
      queryParams.push(status);
      whereClauses.push(`t.status = $${queryParams.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM transactions t ${whereSql}`,
      queryParams
    );
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const txRes = await pool.query(
      `SELECT t.* 
       FROM transactions t
       ${whereSql}
       ORDER BY t.created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    const transactions = txRes.rows.map((t) => ({
      ...t,
      amount_paise: Number(t.amount_paise),
    }));

    return jsonResponse({
      transactions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
