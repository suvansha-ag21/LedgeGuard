export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { getCorsHeaders, authenticateRequest } from '@ledgerguard/core/api';
import logger from '@ledgerguard/core/logger';

export async function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request) {
  // Verify admin authentication from query param or header/cookie
  try {
    const url = new URL(request.url);
    const tokenParam = url.searchParams.get('token');
    
    // Allow token in query param for native EventSource client
    let reqWithAuth = request;
    if (tokenParam) {
      const headers = new Headers(request.headers);
      headers.set('Authorization', `Bearer ${tokenParam}`);
      reqWithAuth = new Request(request.url, { headers });
    }

    await authenticateRequest(reqWithAuth, ['ADMIN']);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) },
    });
  }

  const pool = getPool();
  let lastSeenTime = new Date(Date.now() - 30000).toISOString();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`));

      const interval = setInterval(async () => {
        try {
          // Poll for latest transactions created since lastSeenTime
          const res = await pool.query(
            `SELECT t.id, t.type, t.status, t.amount_paise, t.description, t.created_at,
                    ra.score as risk_score, ra.decision as risk_decision, ra.reasons as risk_reasons
             FROM transactions t
             LEFT JOIN risk_assessments ra ON t.id = ra.transaction_id
             WHERE t.created_at > $1
             ORDER BY t.created_at ASC
             LIMIT 15`,
            [lastSeenTime]
          );

          if (res.rows.length > 0) {
            for (const row of res.rows) {
              lastSeenTime = new Date(row.created_at).toISOString();
              const payload = {
                id: row.id,
                type: row.type,
                status: row.status,
                amountPaise: Number(row.amount_paise),
                amountInr: Number(row.amount_paise) / 100,
                description: row.description,
                createdAt: row.created_at,
                riskScore: row.risk_score,
                riskDecision: row.risk_decision,
                riskReasons: row.risk_reasons,
              };

              controller.enqueue(
                encoder.encode(`event: transaction\ndata: ${JSON.stringify(payload)}\n\n`)
              );
            }
          } else {
            // Send heartbeat ping to keep connection alive
            controller.enqueue(encoder.encode(`: ping\n\n`));
          }
        } catch (err) {
          logger.error({ err }, 'Error querying SSE stream');
        }
      }, 1500);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
        logger.info('SSE client disconnected');
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      ...getCorsHeaders(request),
    },
  });
}
