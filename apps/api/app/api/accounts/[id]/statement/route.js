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

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Verify account access
    const accRes = await pool.query('SELECT user_id FROM accounts WHERE id = $1', [id]);
    if (accRes.rows.length === 0) {
      return jsonResponse({ error: 'Account not found' }, 404);
    }
    if (claims.role !== 'ADMIN' && accRes.rows[0].user_id !== claims.id) {
      return jsonResponse({ error: 'Access denied' }, 403);
    }

    let filterSql = 'WHERE le.account_id = $1';
    const queryParams = [id];

    if (startDate) {
      queryParams.push(startDate);
      filterSql += ` AND le.created_at >= $${queryParams.length}`;
    }
    if (endDate) {
      queryParams.push(endDate);
      filterSql += ` AND le.created_at <= $${queryParams.length}`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM ledger_entries le ${filterSql}`,
      queryParams
    );
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const entriesRes = await pool.query(
      `SELECT le.id, le.transaction_id, le.account_id, le.amount_paise, le.balance_after, le.created_at,
              t.type as transaction_type, t.status as transaction_status, t.description as transaction_description
       FROM ledger_entries le
       JOIN transactions t ON le.transaction_id = t.id
       ${filterSql}
       ORDER BY le.created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    const entries = entriesRes.rows.map((e) => ({
      ...e,
      amount_paise: Number(e.amount_paise),
      balance_after: Number(e.balance_after),
    }));

    return jsonResponse({
      entries,
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
