import { getPool } from '@ledgerguard/core/db';
import logger from '@ledgerguard/core/logger';
import { getBoss } from './queues.js';
import { executeReconciliationJob } from './jobs/reconciliation.js';
import { deliverSingleWebhook, processPendingWebhooks } from './jobs/webhooks.js';
import { processPendingRiskExplanations } from './jobs/llmExplanation.js';

logger.info('Starting LedgerGuard Dedicated Background Worker Process (pg-boss)...');

const pool = getPool();
const boss = getBoss();

async function startWorker() {
  if (boss) {
    try {
      await boss.start();
      logger.info('pg-boss queue engine started successfully');

      // 1. Subscribe to transactional webhook delivery jobs
      await boss.work('webhook-delivery', async ([job]) => {
        logger.info({ jobId: job.id, deliveryId: job.data.deliveryId }, 'Processing pg-boss webhook job');
        await deliverSingleWebhook(pool, job.data.deliveryId);
      });

      // 2. Subscribe to reconciliation audit jobs
      await boss.work('reconciliation-audit', async () => {
        await executeReconciliationJob();
      });

      // 3. Subscribe to AI risk explanation jobs
      await boss.work('llm-risk-explanation', async () => {
        await processPendingRiskExplanations(pool);
      });

      // 4. Register recurring schedule for reconciliation (every 15 minutes)
      await boss.schedule('reconciliation-audit', '*/15 * * * *');
      logger.info('pg-boss recurring schedules registered');
    } catch (err) {
      logger.warn({ err: err.message }, 'pg-boss start encountered an issue; falling back to interval worker');
    }
  }

  // Initial audit run on startup
  try {
    await executeReconciliationJob();
  } catch (err) {
    logger.error({ err: err.message }, 'Startup reconciliation check error');
  }
}

startWorker();

// Polling interval fallback (ensures webhooks and reconciliation run even if boss is not active)
const reconInterval = setInterval(async () => {
  try {
    await executeReconciliationJob();
  } catch (err) {
    logger.error({ err }, 'Periodic reconciliation check error');
  }
}, 60000);

const webhookInterval = setInterval(async () => {
  try {
    await processPendingWebhooks(pool);
  } catch (err) {
    logger.error({ err }, 'Webhook processor error');
  }
}, 5000);

const llmInterval = setInterval(async () => {
  try {
    await processPendingRiskExplanations(pool);
  } catch (err) {
    logger.error({ err }, 'LLM explanation processor error');
  }
}, 10000);

logger.info('Background Worker active: pg-boss queue listening + interval fallback active');

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down LedgerGuard background worker...');
  clearInterval(reconInterval);
  clearInterval(webhookInterval);
  clearInterval(llmInterval);
  if (boss) {
    try {
      await boss.stop();
    } catch {}
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
