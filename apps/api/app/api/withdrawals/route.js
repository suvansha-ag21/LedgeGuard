export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { withdraw } from '@ledgerguard/core/ledger';
import { withIdempotency } from '@ledgerguard/core/idempotency';
import { WithdrawalSchema } from '@ledgerguard/core/validation';
import { 
  jsonResponse, 
  errorResponse, 
  handleOptions, 
  authenticateRequest, 
  checkRateLimit 
} from '@ledgerguard/core/api';
import { recordAuditLog } from '@ledgerguard/core/api';

export async function OPTIONS(request) {
  return handleOptions(request);
}

export async function POST(request) {
  try {
    checkRateLimit(request);
    const claims = await authenticateRequest(request);
    const idempotencyKey = request.headers.get('idempotency-key');

    const body = await request.json();
    const validated = WithdrawalSchema.parse(body);

    const pool = getPool();

    const accRes = await pool.query('SELECT user_id FROM accounts WHERE id = $1', [validated.accountId]);
    if (accRes.rows.length === 0) {
      return jsonResponse({ error: 'Source account not found' }, 404);
    }
    if (claims.role !== 'ADMIN' && accRes.rows[0].user_id !== claims.id) {
      return jsonResponse({ error: 'Access denied: cannot withdraw from an account you do not own' }, 403);
    }

    const { body: result, isCached, statusCode } = await withIdempotency({
      pool,
      key: idempotencyKey,
      payload: validated,
      handler: async () => {
        const withdrawResult = await withdraw({
          pool,
          accountId: validated.accountId,
          amountPaise: validated.amountPaise,
          description: validated.description,
          metadata: validated.metadata,
          idempotencyKey,
        });

        await recordAuditLog({
          actorId: claims.id,
          action: 'WITHDRAWAL_PROCESSED',
          entityType: 'TRANSACTION',
          entityId: withdrawResult.transaction.id,
          details: { amountPaise: validated.amountPaise, accountId: validated.accountId },
        });

        return { statusCode: 201, body: withdrawResult };
      },
    });

    return jsonResponse(result, statusCode, isCached ? { 'X-Idempotent-Replay': 'true' } : {});
  } catch (err) {
    return errorResponse(err);
  }
}
