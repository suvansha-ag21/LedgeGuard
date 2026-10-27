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

    const res = await pool.query(
      `SELECT a.*, u.name as user_name, u.email as user_email 
       FROM accounts a 
       LEFT JOIN users u ON a.user_id = u.id 
       WHERE a.id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return jsonResponse({ error: 'Account not found' }, 404);
    }

    const account = res.rows[0];
    if (claims.role !== 'ADMIN' && account.user_id !== claims.id) {
      return jsonResponse({ error: 'Access denied to this account' }, 403);
    }

    account.cached_balance = Number(account.cached_balance);
    return jsonResponse({ account });
  } catch (err) {
    return errorResponse(err);
  }
}
