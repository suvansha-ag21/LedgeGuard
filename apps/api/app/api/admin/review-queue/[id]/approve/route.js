export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { captureHold } from '@ledgerguard/core/ledger';
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
    const pool = getPool();

    // id is review_queue.id or transaction_id
    const rqRes = await pool.query(
      `SELECT rq.id, rq.transaction_id, rq.status, t.metadata 
       FROM review_queue rq 
       JOIN transactions t ON rq.transaction_id = t.id 
       WHERE rq.id = $1 OR rq.transaction_id = $1`,
      [id]
    );

    if (rqRes.rows.length === 0) {
      return jsonResponse({ error: 'Review item not found' }, 404);
    }

    const reviewItem = rqRes.rows[0];
    if (reviewItem.status !== 'PENDING') {
      return jsonResponse({ error: `Item has already been ${reviewItem.status}` }, 400);
    }

    const txId = reviewItem.transaction_id;
    const destinationAccountId = reviewItem.metadata.target_account_id;

    // Capture the held transaction to the destination account
    const result = await captureHold({
      pool,
      holdTransactionId: txId,
      destinationAccountId,
      description: 'Admin Approved Transfer',
    });

    // Update review queue record
    await pool.query(
      `UPDATE review_queue 
       SET status = 'APPROVED', reviewed_by = $1, reviewed_at = NOW() 
       WHERE id = $2`,
      [claims.id, reviewItem.id]
    );

    await recordAuditLog({
      actorId: claims.id,
      action: 'REVIEW_QUEUE_APPROVED',
      entityType: 'TRANSACTION',
      entityId: txId,
      details: { reviewQueueId: reviewItem.id, destinationAccountId },
    });

    return jsonResponse({ message: 'Transaction approved and settled successfully', result });
  } catch (err) {
    return errorResponse(err);
  }
}
