export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { createAccount } from '@ledgerguard/core/ledger';
import { CreateAccountSchema } from '@ledgerguard/core/validation';
import { 
  jsonResponse, 
  errorResponse, 
  handleOptions, 
  authenticateRequest 
} from '@ledgerguard/core/api';
import { recordAuditLog } from '@ledgerguard/core/api';

export async function OPTIONS(request) {
  return handleOptions(request);
}

export async function GET(request) {
  try {
    const claims = await authenticateRequest(request);
    const pool = getPool();

    // Admins can see all accounts; users only see their own
    const query = claims.role === 'ADMIN'
      ? `SELECT a.*, u.name as user_name, u.email as user_email 
         FROM accounts a 
         LEFT JOIN users u ON a.user_id = u.id 
         ORDER BY a.created_at DESC`
      : `SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at ASC`;
    const params = claims.role === 'ADMIN' ? [] : [claims.id];

    const res = await pool.query(query, params);
    const accounts = res.rows.map((a) => ({
      ...a,
      cached_balance: Number(a.cached_balance),
    }));

    return jsonResponse({ accounts });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
    const claims = await authenticateRequest(request);
    const body = await request.json();
    const validated = CreateAccountSchema.parse(body);

    const pool = getPool();
    const account = await createAccount({
      pool,
      userId: claims.id,
      name: validated.name,
      type: validated.type,
      currency: validated.currency,
    });

    await recordAuditLog({
      actorId: claims.id,
      action: 'ACCOUNT_CREATED',
      entityType: 'ACCOUNT',
      entityId: account.id,
      details: { name: account.name, type: account.type },
    });

    return jsonResponse({ account }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
