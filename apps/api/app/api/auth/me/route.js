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

    const userRes = await pool.query(
      `SELECT id, name, email, role, created_at FROM users WHERE id = $1`,
      [claims.id]
    );

    if (userRes.rows.length === 0) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    const accountsRes = await pool.query(
      `SELECT id, name, type, currency, cached_balance, status, created_at 
       FROM accounts 
       WHERE user_id = $1 
       ORDER BY created_at ASC`,
      [claims.id]
    );

    const accounts = accountsRes.rows.map((a) => ({
      ...a,
      cached_balance: Number(a.cached_balance),
    }));

    return jsonResponse({
      user: userRes.rows[0],
      accounts,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
