export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { captureHold } from '@ledgerguard/core/ledger';
import { withIdempotency } from '@ledgerguard/core/idempotency';
import { CaptureHoldSchema } from '@ledgerguard/core/validation';
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

    const body = await request.json();
    const validated = CaptureHoldSchema.parse(body);

    const pool = getPool();

    const { body: result, isCached, statusCode } = await withIdempotency({
      pool,
      key: idempotencyKey,
      payload: { ...validated, holdId: id },
      handler: async () => {
        const captureResult = await captureHold({
          pool,
          holdTransactionId: id,
          destinationAccountId: validated.destinationAccountId,
          amountPaise: validated.amountPaise,
          description: validated.description,
          idempotencyKey,
        });

        await recordAuditLog({
          actorId: claims.id,
          action: 'HOLD_CAPTURED',
          entityType: 'TRANSACTION',
          entityId: captureResult.transaction.id,
          details: { holdId: id, destinationAccountId: validated.destinationAccountId },
        });

        return { statusCode: 200, body: captureResult };
      },
    });

    return jsonResponse(result, statusCode, isCached ? { 'X-Idempotent-Replay': 'true' } : {});
  } catch (err) {
    return errorResponse(err);
  }
}
