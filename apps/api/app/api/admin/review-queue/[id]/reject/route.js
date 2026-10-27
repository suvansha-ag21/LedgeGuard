export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { releaseHold } from '@ledgerguard/core/ledger';
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

    let notes = 'Risk Review Rejected';
    try {
      const body = await request.json();
      if (body.notes) notes = body.notes;
    } catch {}

    const rqRes = await pool.query(
      `SELECT rq.id, rq.transaction_id, rq.status 
       FROM review_queue rq 
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

    // Release held funds back to sender
    const result = await releaseHold({
      pool,
      holdTransactionId: txId,
      reason: notes,
    });

    // Update review queue record
    await pool.query(
      `UPDATE review_queue 
       SET status = 'REJECTED', reviewed_by = $1, reviewed_at = NOW(), notes = $2 
       WHERE id = $3`,
      [claims.id, notes, reviewItem.id]
    );

    await recordAuditLog({
      actorId: claims.id,
      action: 'REVIEW_QUEUE_REJECTED',
      entityType: 'TRANSACTION',
      entityId: txId,
      details: { reviewQueueId: reviewItem.id, notes },
    });

    return jsonResponse({ message: 'Transaction rejected and funds released back to sender', result });
  } catch (err) {
    return errorResponse(err);
  }
}
