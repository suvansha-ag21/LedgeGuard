export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { 
  jsonResponse, 
  errorResponse, 
  handleOptions, 
  authenticateRequest 
} from '@ledgerguard/core/api';

export async function OPTIONS(request) {
  return handleOptions(request);
}

export async function GET(request) {
  try {
    await authenticateRequest(request, ['ADMIN']);
    const pool = getPool();

    const res = await pool.query(
      `SELECT rq.*, 
              t.amount_paise, t.type as transaction_type, t.description, t.metadata, t.created_at as transaction_created_at,
              ra.score as risk_score, ra.decision as risk_decision, ra.reasons as risk_reasons, ra.features as risk_features, ra.ai_explanation, ra.z_score
       FROM review_queue rq
       JOIN transactions t ON rq.transaction_id = t.id
       LEFT JOIN risk_assessments ra ON t.id = ra.transaction_id
       WHERE rq.status = 'PENDING'
       ORDER BY rq.created_at DESC`
    );

    const queue = res.rows.map((r) => ({
      ...r,
      amount_paise: Number(r.amount_paise),
    }));

    return jsonResponse({ queue });
  } catch (err) {
    return errorResponse(err);
  }
}
