import crypto from 'node:crypto';
import { getPool } from '@ledgerguard/core/db';
import logger from '@ledgerguard/core/logger';

/**
 * Computes an HMAC-SHA256 signature for a webhook payload
 *
 * @param {string} payloadString
 * @param {string} secret
 * @returns {string} Hex signature
 */
export function signWebhookPayload(payloadString, secret) {
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

/**
 * Delivers a single webhook delivery record
 *
 * @param {import('pg').Pool} pool
 * @param {string} deliveryId
 * @returns {Promise<{ success: boolean, statusCode?: number, error?: string }>}
 */
export async function deliverSingleWebhook(pool, deliveryId) {
  const res = await pool.query(
    `SELECT wd.id, wd.endpoint_id, wd.event_type, wd.payload, wd.retry_count,
            we.url, we.secret
     FROM webhook_deliveries wd
     JOIN webhook_endpoints we ON wd.endpoint_id = we.id
     WHERE wd.id = $1`,
    [deliveryId]
  );

  if (res.rows.length === 0) {
    return { success: false, error: 'Delivery record not found' };
  }

  const delivery = res.rows[0];
  const payloadString = JSON.stringify({
    id: delivery.id,
    event: delivery.event_type,
    timestamp: new Date().toISOString(),
    data: delivery.payload,
  });

  const signature = signWebhookPayload(payloadString, delivery.secret);

  try {
    const response = await fetch(delivery.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LedgerGuard-Signature': signature,
        'X-LedgerGuard-Event': delivery.event_type,
        'User-Agent': 'LedgerGuard-Webhook-Worker/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (response.ok) {
      await pool.query(
        `UPDATE webhook_deliveries 
         SET status = 'SUCCESS', last_response_status = $1, last_error = NULL 
         WHERE id = $2`,
        [response.status, delivery.id]
      );
      return { success: true, statusCode: response.status };
    } else {
      throw new Error(`HTTP Status ${response.status}`);
    }
  } catch (err) {
    const nextRetryCount = delivery.retry_count + 1;
    const maxRetries = 5;

    if (nextRetryCount >= maxRetries) {
      await pool.query(
        `UPDATE webhook_deliveries 
         SET status = 'FAILED', retry_count = $1, last_error = $2 
         WHERE id = $3`,
        [nextRetryCount, err.message, delivery.id]
      );
    } else {
      // Exponential backoff: 2^attempt * 15 seconds (15s, 30s, 60s, 120s...)
      const delaySeconds = Math.pow(2, nextRetryCount) * 15;
      await pool.query(
        `UPDATE webhook_deliveries 
         SET retry_count = $1, 
             next_retry_at = NOW() + ($2 || ' seconds')::INTERVAL,
             last_error = $3 
         WHERE id = $4`,
        [nextRetryCount, delaySeconds, err.message, delivery.id]
      );
    }

    return { success: false, error: err.message };
  }
}

/**
 * Processes pending webhook deliveries with exponential backoff
 *
 * @param {import('pg').Pool} [pool]
 * @returns {Promise<{ processed: number, successes: number, failures: number }>}
 */
export async function processPendingWebhooks(pool = getPool()) {
  const res = await pool.query(`
    SELECT id
    FROM webhook_deliveries
    WHERE status = 'PENDING' 
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    ORDER BY created_at ASC
    LIMIT 25
  `);

  let successes = 0;
  let failures = 0;

  for (const row of res.rows) {
    const outcome = await deliverSingleWebhook(pool, row.id);
    if (outcome.success) {
      successes++;
    } else {
      failures++;
    }
  }

  return { processed: res.rows.length, successes, failures };
}
