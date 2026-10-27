export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { FreezeAccountSchema } from '@ledgerguard/core/validation';
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

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const claims = await authenticateRequest(request, ['ADMIN']);
    const body = await request.json();
    const validated = FreezeAccountSchema.parse(body);

    const pool = getPool();
    const newStatus = validated.frozen ? 'FROZEN' : 'ACTIVE';

    const res = await pool.query(
      `UPDATE accounts 
       SET status = $1 
       WHERE id = $2 
       RETURNING id, name, type, cached_balance, status`,
      [newStatus, id]
    );

    if (res.rows.length === 0) {
      return jsonResponse({ error: 'Account not found' }, 404);
    }

    const account = res.rows[0];
    account.cached_balance = Number(account.cached_balance);

    await recordAuditLog({
      actorId: claims.id,
      action: validated.frozen ? 'ACCOUNT_FROZEN' : 'ACCOUNT_UNFROZEN',
      entityType: 'ACCOUNT',
      entityId: id,
      details: { status: newStatus, reason: validated.reason },
    });

    return jsonResponse({
      message: `Account has been ${validated.frozen ? 'frozen' : 'unfrozen'} successfully`,
      account,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
