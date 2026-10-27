export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { transfer, createHold } from '@ledgerguard/core/ledger';
import { withIdempotency } from '@ledgerguard/core/idempotency';
import { assessTransactionRisk } from '@ledgerguard/core/risk';
import { TransferSchema } from '@ledgerguard/core/validation';
import { enqueueTransactionalOutboxJob } from '@ledgerguard/core/queue';
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

export async function POST(request) {
  try {
    checkRateLimit(request);
    const claims = await authenticateRequest(request);
    const idempotencyKey = request.headers.get('idempotency-key');

    const body = await request.json();
    const validated = TransferSchema.parse(body);

    const pool = getPool();

    // Verify source account ownership
    const sourceRes = await pool.query('SELECT user_id, status FROM accounts WHERE id = $1', [validated.sourceAccountId]);
    if (sourceRes.rows.length === 0) {
      return jsonResponse({ error: 'Source account not found' }, 404);
    }
    if (claims.role !== 'ADMIN' && sourceRes.rows[0].user_id !== claims.id) {
      return jsonResponse({ error: 'Access denied: cannot transfer from an account you do not own' }, 403);
    }

    // Verify target account exists
    const targetRes = await pool.query('SELECT id, status FROM accounts WHERE id = $1', [validated.targetAccountId]);
    if (targetRes.rows.length === 0) {
      return jsonResponse({ error: 'Recipient account not found' }, 404);
    }

    const { body: result, isCached, statusCode } = await withIdempotency({
      pool,
      key: idempotencyKey,
      payload: validated,
      handler: async () => {
        // 1. Evaluate Risk (Layer 1 Rules + Layer 2 ML)
        const risk = await assessTransactionRisk({
          pool,
          sourceAccountId: validated.sourceAccountId,
          targetAccountId: validated.targetAccountId,
          amountPaise: validated.amountPaise,
        });

        // CASE A: HIGH RISK (BLOCK)
        if (risk.decision === 'BLOCK') {
          const txRes = await pool.query(
            `INSERT INTO transactions (type, status, idempotency_key, amount_paise, description, metadata)
             VALUES ('TRANSFER', 'FAILED', $1, $2, $3, $4)
             RETURNING id, type, status, amount_paise, created_at`,
            [
              idempotencyKey,
              validated.amountPaise,
              validated.description,
              JSON.stringify({ ...validated.metadata, block_reason: risk.reasons }),
            ]
          );
          const failedTx = txRes.rows[0];

          await pool.query(
            `INSERT INTO risk_assessments (transaction_id, score, decision, rule_score, z_score, reasons, features)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              failedTx.id,
              risk.score,
              risk.decision,
              risk.ruleScore,
              risk.zScore,
              JSON.stringify(risk.reasons),
              JSON.stringify(risk.features),
            ]
          );

          await recordAuditLog({
            actorId: claims.id,
            action: 'TRANSACTION_BLOCKED_BY_RISK_ENGINE',
            entityType: 'TRANSACTION',
            entityId: failedTx.id,
            details: { score: risk.score, reasons: risk.reasons },
          });

          return {
            statusCode: 403,
            body: {
              error: 'Transaction blocked by AI risk engine',
              code: 'TRANSACTION_BLOCKED',
              riskAssessment: risk,
              transaction: failedTx,
            },
          };
        }

        // CASE B: MEDIUM RISK (REVIEW - HOLD FUNDS & QUEUE)
        if (risk.decision === 'REVIEW') {
          // Reserve funds by creating an authorization hold into PLATFORM_HOLD
          const holdResult = await createHold({
            pool,
            accountId: validated.sourceAccountId,
            amountPaise: validated.amountPaise,
            description: `Flagged for Review: ${validated.description}`,
            metadata: {
              ...validated.metadata,
              source_account_id: validated.sourceAccountId,
              target_account_id: validated.targetAccountId,
            },
            idempotencyKey,
          });

          // Mark transaction as UNDER_REVIEW
          await pool.query(
            `UPDATE transactions SET status = 'UNDER_REVIEW' WHERE id = $1`,
            [holdResult.transaction.id]
          );
          holdResult.transaction.status = 'UNDER_REVIEW';

          // Insert into review_queue
          await pool.query(
            `INSERT INTO review_queue (transaction_id, status)
             VALUES ($1, 'PENDING')`,
            [holdResult.transaction.id]
          );

          // Save risk assessment
          await pool.query(
            `INSERT INTO risk_assessments (transaction_id, score, decision, rule_score, z_score, reasons, features)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              holdResult.transaction.id,
              risk.score,
              risk.decision,
              risk.ruleScore,
              risk.zScore,
              JSON.stringify(risk.reasons),
              JSON.stringify(risk.features),
            ]
          );

          await recordAuditLog({
            actorId: claims.id,
            action: 'TRANSACTION_FLAGGED_FOR_REVIEW',
            entityType: 'TRANSACTION',
            entityId: holdResult.transaction.id,
            details: { score: risk.score, reasons: risk.reasons },
          });

          return {
            statusCode: 202,
            body: {
              message: 'Transaction flagged for compliance review. Funds have been securely held.',
              transaction: holdResult.transaction,
              riskAssessment: risk,
            },
          };
        }

        // CASE C: LOW RISK (ALLOW)
        const txResult = await transfer({
          pool,
          sourceAccountId: validated.sourceAccountId,
          targetAccountId: validated.targetAccountId,
          amountPaise: validated.amountPaise,
          description: validated.description,
          metadata: {
            ...validated.metadata,
            source_account_id: validated.sourceAccountId,
            target_account_id: validated.targetAccountId,
          },
          idempotencyKey,
          onBeforeCommit: async (client, { transaction }) => {
            await enqueueTransactionalOutboxJob(client, {
              eventType: 'transfer.completed',
              payload: {
                transactionId: transaction.id,
                amountPaise: transaction.amount_paise,
                sourceAccountId: validated.sourceAccountId,
                targetAccountId: validated.targetAccountId,
                timestamp: new Date().toISOString(),
              },
            });
          },
        });

        // Record risk assessment
        await pool.query(
          `INSERT INTO risk_assessments (transaction_id, score, decision, rule_score, z_score, reasons, features)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            txResult.transaction.id,
            risk.score,
            risk.decision,
            risk.ruleScore,
            risk.zScore,
            JSON.stringify(risk.reasons),
            JSON.stringify(risk.features),
          ]
        );

        await recordAuditLog({
          actorId: claims.id,
          action: 'TRANSFER_PROCESSED',
          entityType: 'TRANSACTION',
          entityId: txResult.transaction.id,
          details: {
            sourceAccountId: validated.sourceAccountId,
            targetAccountId: validated.targetAccountId,
            amountPaise: validated.amountPaise,
            riskScore: risk.score,
          },
        });

        return {
          statusCode: 201,
          body: {
            ...txResult,
            riskAssessment: risk,
          },
        };
      },
    });

    return jsonResponse(result, statusCode, isCached ? { 'X-Idempotent-Replay': 'true' } : {});
  } catch (err) {
    return errorResponse(err);
  }
}
