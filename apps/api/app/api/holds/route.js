export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { createHold } from '@ledgerguard/core/ledger';
import { withIdempotency } from '@ledgerguard/core/idempotency';
import { CreateHoldSchema } from '@ledgerguard/core/validation';
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

export async function GET(request) {
  try {
    const claims = await authenticateRequest(request);
    const pool = getPool();

    const query = claims.role === 'ADMIN'
      ? `SELECT t.*, a.name as account_name, a.user_id,
                rq.status as review_status, rq.id as review_queue_id,
                ra.score as risk_score
         FROM transactions t
         JOIN ledger_entries le ON t.id = le.transaction_id
         JOIN accounts a ON le.account_id = a.id
         LEFT JOIN review_queue rq ON t.id = rq.transaction_id
         LEFT JOIN risk_assessments ra ON t.id = ra.transaction_id
         WHERE t.type = 'HOLD' AND t.status IN ('PENDING', 'UNDER_REVIEW')
         ORDER BY t.created_at DESC`
      : `SELECT t.*, a.name as account_name, a.user_id,
                rq.status as review_status, rq.id as review_queue_id,
                ra.score as risk_score
         FROM transactions t
         JOIN ledger_entries le ON t.id = le.transaction_id
         JOIN accounts a ON le.account_id = a.id
         LEFT JOIN review_queue rq ON t.id = rq.transaction_id
         LEFT JOIN risk_assessments ra ON t.id = ra.transaction_id
         WHERE t.type = 'HOLD' AND t.status IN ('PENDING', 'UNDER_REVIEW')
           AND a.user_id = $1
         ORDER BY t.created_at DESC`;
    const params = claims.role === 'ADMIN' ? [] : [claims.id];

    const res = await pool.query(query, params);
    // Deduplicate transactions
    const seen = new Set();
    const holds = [];
    let totalHoldPaise = 0;

    for (const row of res.rows) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        const amountPaise = Number(row.amount_paise);
        totalHoldPaise += amountPaise;
        holds.push({
          ...row,
          amount_paise: amountPaise,
        });
      }
    }

    return jsonResponse({
      holds,
      totalHoldAmountPaise: totalHoldPaise,
      count: holds.length,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
    checkRateLimit(request);
    const claims = await authenticateRequest(request);
    const idempotencyKey = request.headers.get('idempotency-key');

    const body = await request.json();
    const validated = CreateHoldSchema.parse(body);

    const pool = getPool();

    const accRes = await pool.query('SELECT user_id FROM accounts WHERE id = $1', [validated.accountId]);
    if (accRes.rows.length === 0) {
      return jsonResponse({ error: 'Account not found' }, 404);
    }
    if (claims.role !== 'ADMIN' && accRes.rows[0].user_id !== claims.id) {
      return jsonResponse({ error: 'Access denied: cannot create hold on another user account' }, 403);
    }

    const { body: result, isCached, statusCode } = await withIdempotency({
      pool,
      key: idempotencyKey,
      payload: validated,
      handler: async () => {
        const holdResult = await createHold({
          pool,
          accountId: validated.accountId,
          amountPaise: validated.amountPaise,
          description: validated.description,
          metadata: validated.metadata,
          idempotencyKey,
        });

        await recordAuditLog({
          actorId: claims.id,
          action: 'HOLD_CREATED',
          entityType: 'TRANSACTION',
          entityId: holdResult.transaction.id,
          details: { amountPaise: validated.amountPaise, accountId: validated.accountId },
        });

        return { statusCode: 201, body: holdResult };
      },
    });

    return jsonResponse(result, statusCode, isCached ? { 'X-Idempotent-Replay': 'true' } : {});
  } catch (err) {
    return errorResponse(err);
  }
}
