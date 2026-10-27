import { getPool } from '../db/pool.js';
import { lockAccountsInOrder, withLockRetry } from './locking.js';
import { 
  SYSTEM_ACCOUNTS, 
  ACCOUNT_TYPES, 
  TRANSACTION_TYPES, 
  TRANSACTION_STATUS 
} from './constants.js';
import { 
  validateAmount 
} from './engine.js';
import { 
  InsufficientFundsError, 
  LedgerError 
} from './errors.js';
import logger from '../logger.js';

/**
 * Creates an authorization hold, moving funds from user account into PLATFORM_HOLD.
 *
 * @param {object} params
 * @param {import('pg').Pool} [params.pool]
 * @param {string} params.accountId
 * @param {number} params.amountPaise
 * @param {string} [params.description='Authorization Hold']
 * @param {object} [params.metadata={}]
 * @param {string|null} [params.idempotencyKey=null]
 * @returns {Promise<{ transaction: object, entries: object[] }>}
 */
export async function createHold({
  pool = getPool(),
  accountId,
  amountPaise,
  description = 'Authorization Hold',
  metadata = {},
  idempotencyKey = null,
}) {
  validateAmount(amountPaise);

  return withLockRetry(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const sourceAccountId = accountId;
      const holdAccountId = SYSTEM_ACCOUNTS.PLATFORM_HOLD;

      const accountMap = await lockAccountsInOrder(client, [sourceAccountId, holdAccountId]);
      const sourceAccount = accountMap.get(sourceAccountId);
      const holdAccount = accountMap.get(holdAccountId);

      if (sourceAccount.type === ACCOUNT_TYPES.USER_WALLET && sourceAccount.cached_balance < amountPaise) {
        throw new InsufficientFundsError(
          `Insufficient funds for hold: Available ₹${(sourceAccount.cached_balance / 100).toFixed(2)}, required ₹${(amountPaise / 100).toFixed(2)}`
        );
      }

      const newSourceBalance = sourceAccount.cached_balance - amountPaise;
      const newHoldBalance = holdAccount.cached_balance + amountPaise;

      const txId = crypto.randomUUID();
      const txRes = await client.query(
        `INSERT INTO transactions (id, type, status, idempotency_key, amount_paise, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, type, status, amount_paise, description, metadata, created_at`,
        [
          txId,
          TRANSACTION_TYPES.HOLD,
          TRANSACTION_STATUS.PENDING,
          idempotencyKey,
          amountPaise,
          description,
          JSON.stringify({ ...metadata, source_account_id: sourceAccountId }),
        ]
      );
      const transaction = txRes.rows[0];
      transaction.amount_paise = Number(transaction.amount_paise);

      const entry1Id = crypto.randomUUID();
      const entry2Id = crypto.randomUUID();

      const entry1Res = await client.query(
        `INSERT INTO ledger_entries (id, transaction_id, account_id, amount_paise, balance_after)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, transaction_id, account_id, amount_paise, balance_after, created_at`,
        [entry1Id, transaction.id, sourceAccountId, -amountPaise, newSourceBalance]
      );

      const entry2Res = await client.query(
        `INSERT INTO ledger_entries (id, transaction_id, account_id, amount_paise, balance_after)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, transaction_id, account_id, amount_paise, balance_after, created_at`,
        [entry2Id, transaction.id, holdAccountId, amountPaise, newHoldBalance]
      );

      await client.query(
        `UPDATE accounts SET cached_balance = $1, version = version + 1 WHERE id = $2`,
        [newSourceBalance, sourceAccountId]
      );
      await client.query(
        `UPDATE accounts SET cached_balance = $1, version = version + 1 WHERE id = $2`,
        [newHoldBalance, holdAccountId]
      );

      await client.query('COMMIT');

      const entries = [entry1Res.rows[0], entry2Res.rows[0]].map((e) => ({
        ...e,
        amount_paise: Number(e.amount_paise),
        balance_after: Number(e.balance_after),
      }));

      return { transaction, entries };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ err, accountId, amountPaise }, 'Authorization hold failed');
      throw err;
    } finally {
      client.release();
    }
  });
}

/**
 * Captures an existing hold, moving funds from PLATFORM_HOLD to the final recipient account.
 *
 * @param {object} params
 * @param {import('pg').Pool} [params.pool]
 * @param {string} params.holdTransactionId
 * @param {string} params.targetAccountId
 * @param {number} [params.amountPaise]
 * @param {string|null} [params.idempotencyKey=null]
 * @returns {Promise<{ transaction: object, entries: object[] }>}
 */
export async function captureHold({
  pool = getPool(),
  holdTransactionId,
  targetAccountId,
  amountPaise,
  idempotencyKey = null,
}) {
  return withLockRetry(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const holdTxRes = await client.query(
        `SELECT id, type, status, amount_paise, metadata 
         FROM transactions 
         WHERE id = $1 AND type = $2 FOR UPDATE`,
        [holdTransactionId, TRANSACTION_TYPES.HOLD]
      );

      if (holdTxRes.rows.length === 0) {
        throw new LedgerError('Hold transaction not found', 404, 'HOLD_NOT_FOUND');
      }

      const holdTx = holdTxRes.rows[0];
      if (holdTx.status !== TRANSACTION_STATUS.PENDING) {
        throw new LedgerError(`Hold is already finalized with status: ${holdTx.status}`, 400, 'HOLD_NOT_PENDING');
      }

      const holdAmountPaise = Number(holdTx.amount_paise);
      const captureAmountPaise = amountPaise !== undefined ? amountPaise : holdAmountPaise;
      validateAmount(captureAmountPaise);

      if (captureAmountPaise > holdAmountPaise) {
        throw new LedgerError(`Capture amount exceeds hold amount: ${captureAmountPaise} > ${holdAmountPaise}`, 400, 'EXCEEDS_HOLD_AMOUNT');
      }

      const holdAccountId = SYSTEM_ACCOUNTS.PLATFORM_HOLD;
      const accountMap = await lockAccountsInOrder(client, [holdAccountId, targetAccountId]);
      const holdAccount = accountMap.get(holdAccountId);
      const targetAccount = accountMap.get(targetAccountId);

      const newHoldBalance = holdAccount.cached_balance - captureAmountPaise;
      const newTargetBalance = targetAccount.cached_balance + captureAmountPaise;

      const txId = crypto.randomUUID();
      const txRes = await client.query(
        `INSERT INTO transactions (id, type, status, idempotency_key, reference_transaction_id, amount_paise, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, type, status, amount_paise, description, created_at`,
        [
          txId,
          TRANSACTION_TYPES.CAPTURE,
          TRANSACTION_STATUS.COMPLETED,
          idempotencyKey,
          holdTransactionId,
          captureAmountPaise,
          'Capture of Hold ' + holdTransactionId,
        ]
      );
      const transaction = txRes.rows[0];
      transaction.amount_paise = Number(transaction.amount_paise);

      const entry1Id = crypto.randomUUID();
      const entry2Id = crypto.randomUUID();

      const entry1Res = await client.query(
        `INSERT INTO ledger_entries (id, transaction_id, account_id, amount_paise, balance_after)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, transaction_id, account_id, amount_paise, balance_after, created_at`,
        [entry1Id, transaction.id, holdAccountId, -captureAmountPaise, newHoldBalance]
      );

      const entry2Res = await client.query(
        `INSERT INTO ledger_entries (id, transaction_id, account_id, amount_paise, balance_after)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, transaction_id, account_id, amount_paise, balance_after, created_at`,
        [entry2Id, transaction.id, targetAccountId, captureAmountPaise, newTargetBalance]
      );

      await client.query(
        `UPDATE accounts SET cached_balance = $1, version = version + 1 WHERE id = $2`,
        [newHoldBalance, holdAccountId]
      );
      await client.query(
        `UPDATE accounts SET cached_balance = $1, version = version + 1 WHERE id = $2`,
        [newTargetBalance, targetAccountId]
      );

      // Mark original hold as COMPLETED
      await client.query(
        `UPDATE transactions SET status = $1 WHERE id = $2`,
        [TRANSACTION_STATUS.COMPLETED, holdTransactionId]
      );

      await client.query('COMMIT');

      const entries = [entry1Res.rows[0], entry2Res.rows[0]].map((e) => ({
        ...e,
        amount_paise: Number(e.amount_paise),
        balance_after: Number(e.balance_after),
      }));

      return { transaction, entries };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ err, holdTransactionId }, 'Hold capture failed');
      throw err;
    } finally {
      client.release();
    }
  });
}

/**
 * Releases a hold, returning funds from PLATFORM_HOLD back to the source account.
 *
 * @param {object} params
 * @param {import('pg').Pool} [params.pool]
 * @param {string} params.holdTransactionId
 * @param {string|null} [params.idempotencyKey=null]
 * @returns {Promise<{ transaction: object, entries: object[] }>}
 */
export async function releaseHold({
  pool = getPool(),
  holdTransactionId,
  idempotencyKey = null,
}) {
  return withLockRetry(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const holdTxRes = await client.query(
        `SELECT id, type, status, amount_paise, metadata 
         FROM transactions 
         WHERE id = $1 AND type = $2 FOR UPDATE`,
        [holdTransactionId, TRANSACTION_TYPES.HOLD]
      );

      if (holdTxRes.rows.length === 0) {
        throw new LedgerError('Hold transaction not found', 404, 'HOLD_NOT_FOUND');
      }

      const holdTx = holdTxRes.rows[0];
      if (holdTx.status !== TRANSACTION_STATUS.PENDING) {
        throw new LedgerError(`Hold is already finalized with status: ${holdTx.status}`, 400, 'HOLD_NOT_PENDING');
      }

      const amountPaise = Number(holdTx.amount_paise);
      const metadata = typeof holdTx.metadata === 'string' ? JSON.parse(holdTx.metadata) : holdTx.metadata;
      const sourceAccountId = metadata?.source_account_id;

      if (!sourceAccountId) {
        throw new LedgerError('Missing source_account_id in hold metadata', 500, 'INVALID_HOLD_METADATA');
      }

      const holdAccountId = SYSTEM_ACCOUNTS.PLATFORM_HOLD;
      const accountMap = await lockAccountsInOrder(client, [holdAccountId, sourceAccountId]);
      const holdAccount = accountMap.get(holdAccountId);
      const sourceAccount = accountMap.get(sourceAccountId);

      const newHoldBalance = holdAccount.cached_balance - amountPaise;
      const newSourceBalance = sourceAccount.cached_balance + amountPaise;

      const txId = crypto.randomUUID();
      const txRes = await client.query(
        `INSERT INTO transactions (id, type, status, idempotency_key, reference_transaction_id, amount_paise, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, type, status, amount_paise, description, created_at`,
        [
          txId,
          TRANSACTION_TYPES.RELEASE,
          TRANSACTION_STATUS.COMPLETED,
          idempotencyKey,
          holdTransactionId,
          amountPaise,
          'Release of Hold ' + holdTransactionId,
        ]
      );
      const transaction = txRes.rows[0];
      transaction.amount_paise = Number(transaction.amount_paise);

      const entry1Id = crypto.randomUUID();
      const entry2Id = crypto.randomUUID();

      const entry1Res = await client.query(
        `INSERT INTO ledger_entries (id, transaction_id, account_id, amount_paise, balance_after)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, transaction_id, account_id, amount_paise, balance_after, created_at`,
        [entry1Id, transaction.id, holdAccountId, -amountPaise, newHoldBalance]
      );

      const entry2Res = await client.query(
        `INSERT INTO ledger_entries (id, transaction_id, account_id, amount_paise, balance_after)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, transaction_id, account_id, amount_paise, balance_after, created_at`,
        [entry2Id, transaction.id, sourceAccountId, amountPaise, newSourceBalance]
      );

      await client.query(
        `UPDATE accounts SET cached_balance = $1, version = version + 1 WHERE id = $2`,
        [newHoldBalance, holdAccountId]
      );
      await client.query(
        `UPDATE accounts SET cached_balance = $1, version = version + 1 WHERE id = $2`,
        [newSourceBalance, sourceAccountId]
      );

      // Mark original hold as REVERSED
      await client.query(
        `UPDATE transactions SET status = $1 WHERE id = $2`,
        [TRANSACTION_STATUS.REVERSED, holdTransactionId]
      );

      await client.query('COMMIT');

      const entries = [entry1Res.rows[0], entry2Res.rows[0]].map((e) => ({
        ...e,
        amount_paise: Number(e.amount_paise),
        balance_after: Number(e.balance_after),
      }));

      return { transaction, entries };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ err, holdTransactionId }, 'Hold release failed');
      throw err;
    } finally {
      client.release();
    }
  });
}
