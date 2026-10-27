export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { refundTransaction } from '@ledgerguard/core/ledger';
import { withIdempotency } from '@ledgerguard/core/idempotency';
import { RefundSchema } from '@ledgerguard/core/validation';
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

    let validated = {};
    try {
      const body = await request.json();
      validated = RefundSchema.parse(body);
    } catch {
      // Body is optional on full refund
    }

    const pool = getPool();

    const { body: result, isCached, statusCode } = await withIdempotency({
      pool,
      key: idempotencyKey,
      payload: { ...validated, transactionId: id },
      handler: async () => {
        const refundResult = await refundTransaction({
          pool,
          transactionId: id,
          amountPaise: validated.amountPaise,
          reason: validated.reason,
          idempotencyKey,
        });

        await recordAuditLog({
          actorId: claims.id,
          action: 'TRANSACTION_REFUNDED',
          entityType: 'TRANSACTION',
          entityId: refundResult.transaction.id,
          details: { originalTransactionId: id, amountPaise: validated.amountPaise },
        });

        return { statusCode: 200, body: refundResult };
      },
    });

    return jsonResponse(result, statusCode, isCached ? { 'X-Idempotent-Replay': 'true' } : {});
  } catch (err) {
    return errorResponse(err);
  }
}
