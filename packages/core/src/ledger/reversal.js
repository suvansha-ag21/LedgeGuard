import { getPool } from '../db/pool.js';
import { lockAccountsInOrder, withLockRetry } from './locking.js';
import { 
  TRANSACTION_TYPES, 
  TRANSACTION_STATUS, 
  ACCOUNT_TYPES 
} from './constants.js';
import { validateAmount } from './engine.js';
import { 
  InsufficientFundsError, 
  LedgerError 
} from './errors.js';
import logger from '../logger.js';

/**
 * Executes a full or partial refund for a completed transaction.
 * Strictly adheres to double-entry immutability by creating a new linked REFUND transaction
 * and inverse entries without ever modifying past entries.
 *
 * @param {object} params
 * @param {import('pg').Pool} [params.pool]
 * @param {string} params.transactionId - Original transaction UUID to refund
 * @param {number} [params.amountPaise] - Optional refund amount (defaults to full remaining refundable balance)
 * @param {string} [params.reason='Customer Refund']
 * @param {string|null} [params.idempotencyKey=null]
 * @returns {Promise<{ transaction: object, entries: object[] }>}
 */
export async function refundTransaction({
  pool = getPool(),
  transactionId,
  amountPaise,
  reason = 'Customer Refund',
  idempotencyKey = null,
}) {
  return withLockRetry(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch original transaction
      const txRes = await client.query(
        `SELECT id, type, status, amount_paise, created_at 
         FROM transactions 
         WHERE id = $1 
         FOR UPDATE`,
        [transactionId]
      );

      if (txRes.rows.length === 0) {
        throw new LedgerError('Original transaction not found', 404, 'TRANSACTION_NOT_FOUND');
      }

      const origTx = txRes.rows[0];
      const origAmountPaise = Number(origTx.amount_paise);

      if (origTx.status === TRANSACTION_STATUS.REVERSED) {
        throw new LedgerError('Transaction has already been fully refunded', 400, 'ALREADY_FULLY_REFUNDED');
      }

      if (origTx.status !== TRANSACTION_STATUS.COMPLETED) {
        throw new LedgerError(`Cannot refund transaction with status: ${origTx.status}`, 400, 'TRANSACTION_NOT_REFUNDABLE');
      }

      // 2. Fetch original ledger entries to determine source and destination
      const entriesRes = await client.query(
        `SELECT id, account_id, amount_paise 
         FROM ledger_entries 
         WHERE transaction_id = $1`,
        [transactionId]
      );

      if (entriesRes.rows.length < 2) {
        throw new LedgerError('Original transaction is missing ledger entries', 500, 'CORRUPTED_TRANSACTION');
      }

      const debitedEntry = entriesRes.rows.find((e) => Number(e.amount_paise) < 0); // Source of original tx
      const creditedEntry = entriesRes.rows.find((e) => Number(e.amount_paise) > 0); // Destination of original tx

      if (!debitedEntry || !creditedEntry) {
        throw new LedgerError('Unable to resolve original credit/debit leg for refund', 500, 'CORRUPTED_TRANSACTION');
      }

      // 3. Check existing refunds to ensure cumulative refund does not exceed original amount
      const priorRefundsRes = await client.query(
        `SELECT COALESCE(SUM(amount_paise), 0) AS total_refunded 
         FROM transactions 
         WHERE reference_transaction_id = $1 AND type = $2 AND status = $3`,
        [transactionId, TRANSACTION_TYPES.REFUND, TRANSACTION_STATUS.COMPLETED]
      );

      const alreadyRefundedPaise = Number(priorRefundsRes.rows[0].total_refunded);
      const remainingRefundablePaise = origAmountPaise - alreadyRefundedPaise;

      if (remainingRefundablePaise <= 0) {
        throw new LedgerError('Transaction has already been fully refunded', 400, 'ALREADY_FULLY_REFUNDED');
      }

      const refundPaise = amountPaise !== undefined ? amountPaise : remainingRefundablePaise;
      validateAmount(refundPaise);

      if (refundPaise > remainingRefundablePaise) {
        throw new LedgerError(
          `Refund amount (₹${(refundPaise / 100).toFixed(2)}) exceeds remaining refundable balance (₹${(remainingRefundablePaise / 100).toFixed(2)})`,
          400,
          'REFUND_EXCEEDS_REMAINING'
        );
      }

      // 4. Lock accounts in ordered sequence
      // In a refund, the original destination (creditedEntry.account_id) refunds money to original source (debitedEntry.account_id)
      const refundSourceId = creditedEntry.account_id;
      const refundDestinationId = debitedEntry.account_id;

      const accountMap = await lockAccountsInOrder(client, [refundSourceId, refundDestinationId]);
      const refundSourceAcc = accountMap.get(refundSourceId);
      const refundDestAcc = accountMap.get(refundDestinationId);

      // Verify the party issuing the refund has sufficient balance
      if (refundSourceAcc.type === ACCOUNT_TYPES.USER_WALLET && refundSourceAcc.cached_balance < refundPaise) {
        throw new InsufficientFundsError(
          `Recipient has insufficient funds to issue refund (available: ₹${(refundSourceAcc.cached_balance / 100).toFixed(2)}, required: ₹${(refundPaise / 100).toFixed(2)})`
        );
      }

      const newSourceBalance = refundSourceAcc.cached_balance - refundPaise;
      const newDestBalance = refundDestAcc.cached_balance + refundPaise;

      // 5. Create REFUND transaction record
      const refundTxId = crypto.randomUUID();
      const refundTxRes = await client.query(
        `INSERT INTO transactions (id, type, status, idempotency_key, reference_transaction_id, amount_paise, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, type, status, amount_paise, description, metadata, created_at`,
        [
          refundTxId,
          TRANSACTION_TYPES.REFUND,
          TRANSACTION_STATUS.COMPLETED,
          idempotencyKey,
          transactionId,
          refundPaise,
          reason,
          JSON.stringify({ original_transaction_id: transactionId, refund_type: refundPaise === origAmountPaise ? 'FULL' : 'PARTIAL' }),
        ]
      );
      const refundTransaction = refundTxRes.rows[0];
      refundTransaction.amount_paise = Number(refundTransaction.amount_paise);

      // 6. Insert new immutable inverse ledger entries (Zero-Sum Invariant preserved)
      const entry1Id = crypto.randomUUID();
      const entry2Id = crypto.randomUUID();

      const entry1Res = await client.query(
        `INSERT INTO ledger_entries (id, transaction_id, account_id, amount_paise, balance_after)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, transaction_id, account_id, amount_paise, balance_after, created_at`,
        [entry1Id, refundTransaction.id, refundSourceId, -refundPaise, newSourceBalance]
      );

      const entry2Res = await client.query(
        `INSERT INTO ledger_entries (id, transaction_id, account_id, amount_paise, balance_after)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, transaction_id, account_id, amount_paise, balance_after, created_at`,
        [entry2Id, refundTransaction.id, refundDestinationId, refundPaise, newDestBalance]
      );

      // 7. Update cached balances atomically
      await client.query(
        `UPDATE accounts SET cached_balance = $1, version = version + 1 WHERE id = $2`,
        [newSourceBalance, refundSourceId]
      );
      await client.query(
        `UPDATE accounts SET cached_balance = $1, version = version + 1 WHERE id = $2`,
        [newDestBalance, refundDestinationId]
      );

      // 8. If fully refunded, mark the original transaction status as REVERSED
      if (alreadyRefundedPaise + refundPaise === origAmountPaise) {
        await client.query(
          `UPDATE transactions SET status = $1 WHERE id = $2`,
          [TRANSACTION_STATUS.REVERSED, transactionId]
        );
      }

      await client.query('COMMIT');

      const entries = [entry1Res.rows[0], entry2Res.rows[0]].map((e) => ({
        ...e,
        amount_paise: Number(e.amount_paise),
        balance_after: Number(e.balance_after),
      }));

      return { transaction: refundTransaction, entries };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ err, transactionId, amountPaise }, 'Transaction refund failed');
      throw err;
    } finally {
      client.release();
    }
  });
}
