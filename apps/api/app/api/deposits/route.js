export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { deposit } from '@ledgerguard/core/ledger';
import { withIdempotency } from '@ledgerguard/core/idempotency';
import { DepositSchema } from '@ledgerguard/core/validation';
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
    const validated = DepositSchema.parse(body);

    const pool = getPool();

    // Verify ownership or admin
    const accRes = await pool.query('SELECT user_id FROM accounts WHERE id = $1', [validated.accountId]);
    if (accRes.rows.length === 0) {
      return jsonResponse({ error: 'Destination account not found' }, 404);
    }
    if (claims.role !== 'ADMIN' && accRes.rows[0].user_id !== claims.id) {
      return jsonResponse({ error: 'Access denied: cannot deposit into another user account' }, 403);
    }

    const { body: result, isCached, statusCode } = await withIdempotency({
      pool,
      key: idempotencyKey,
      payload: validated,
      handler: async () => {
        const depResult = await deposit({
          pool,
          accountId: validated.accountId,
          amountPaise: validated.amountPaise,
          description: validated.description,
          metadata: validated.metadata,
          idempotencyKey,
        });

        await recordAuditLog({
          actorId: claims.id,
          action: 'DEPOSIT_PROCESSED',
          entityType: 'TRANSACTION',
          entityId: depResult.transaction.id,
          details: { amountPaise: validated.amountPaise, accountId: validated.accountId },
        });

        return { statusCode: 201, body: depResult };
      },
    });

    return jsonResponse(result, statusCode, isCached ? { 'X-Idempotent-Replay': 'true' } : {});
  } catch (err) {
    return errorResponse(err);
  }
}
