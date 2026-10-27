export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import crypto from 'node:crypto';
import { getPool } from '@ledgerguard/core/db';
import { WebhookEndpointSchema } from '@ledgerguard/core/validation';
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

export async function GET(request) {
  try {
    const claims = await authenticateRequest(request);
    const pool = getPool();

    const res = await pool.query(
      `SELECT id, url, events, is_active, created_at 
       FROM webhook_endpoints 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [claims.id]
    );

    return jsonResponse({ endpoints: res.rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
    const claims = await authenticateRequest(request);
    const body = await request.json();
    const validated = WebhookEndpointSchema.parse(body);

    const pool = getPool();
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const events = validated.events || [
      'transfer.completed',
      'transfer.under_review',
      'transfer.blocked',
      'refund.completed',
    ];

    const res = await pool.query(
      `INSERT INTO webhook_endpoints (user_id, url, secret, events, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, url, events, secret, is_active, created_at`,
      [claims.id, validated.url, secret, events]
    );
    const endpoint = res.rows[0];

    await recordAuditLog({
      actorId: claims.id,
      action: 'WEBHOOK_ENDPOINT_REGISTERED',
      entityType: 'WEBHOOK_ENDPOINT',
      entityId: endpoint.id,
      details: { url: endpoint.url, events },
    });

    return jsonResponse({ endpoint }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
