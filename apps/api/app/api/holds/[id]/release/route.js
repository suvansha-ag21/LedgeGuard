export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { releaseHold } from '@ledgerguard/core/ledger';
import { withIdempotency } from '@ledgerguard/core/idempotency';
import { ReleaseHoldSchema } from '@ledgerguard/core/validation';
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

export async function POST(request, { params }) {
  try {
    checkRateLimit(request);
    const { id } = await params;
    const claims = await authenticateRequest(request);
    const idempotencyKey = request.headers.get('idempotency-key');

    let validated = { reason: 'Hold Released' };
    try {
      const body = await request.json();
      validated = ReleaseHoldSchema.parse(body);
    } catch {
      // Body is optional on release
    }

    const pool = getPool();

    const { body: result, isCached, statusCode } = await withIdempotency({
      pool,
      key: idempotencyKey,
      payload: { ...validated, holdId: id },
      handler: async () => {
        const releaseResult = await releaseHold({
          pool,
          holdTransactionId: id,
          reason: validated.reason,
          idempotencyKey,
        });

        await recordAuditLog({
          actorId: claims.id,
          action: 'HOLD_RELEASED',
          entityType: 'TRANSACTION',
          entityId: releaseResult.transaction.id,
          details: { holdId: id, reason: validated.reason },
        });

        return { statusCode: 200, body: releaseResult };
      },
    });

    return jsonResponse(result, statusCode, isCached ? { 'X-Idempotent-Replay': 'true' } : {});
  } catch (err) {
    return errorResponse(err);
  }
}
