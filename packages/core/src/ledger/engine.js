import { getPool } from '../db/pool.js';
import { lockAccountsInOrder, withLockRetry, withAccountLocks } from './locking.js';
import { 
  SYSTEM_ACCOUNTS, 
  ACCOUNT_TYPES, 
  TRANSACTION_TYPES, 
  TRANSACTION_STATUS 
} from './constants.js';
import { 
  InvalidAmountError, 
  InsufficientFundsError, 
  LedgerError 
} from './errors.js';
import logger from '../logger.js';

/**
 * Validates that an amount is a strictly positive JavaScript safe integer in paise.
 * Floats, decimals, negative numbers, zero, NaN, and Infinity are strictly rejected.
 *
 * @param {any} amountPaise
 * @throws {InvalidAmountError}
 */
export function validateAmount(amountPaise) {
  if (
    typeof amountPaise !== 'number' ||
    !Number.isSafeInteger(amountPaise) ||
    amountPaise <= 0
  ) {
    throw new InvalidAmountError(
      `Amount must be a positive safe integer in paise. Received: ${amountPaise}`
    );
  }
}

/**
 * Creates a new financial account.
 *
 * @param {object} params
 * @param {import('pg').Pool} [params.pool] - PostgreSQL connection pool
 * @param {string|null} [params.userId] - Owner user UUID
 * @param {string} params.name - Descriptive account name
 * @param {string} [params.type='USER_WALLET'] - Account type (USER_WALLET, MERCHANT, SYSTEM)
 * @param {string} [params.currency='INR'] - Currency code
 * @returns {Promise<{ id: string, name: string, type: string, currency: string, cached_balance: number, status: string }>}
 */
export async function createAccount({
  pool = getPool(),
  userId = null,
  name,
  type = ACCOUNT_TYPES.USER_WALLET,
  currency = 'INR',
}) {
  const query = `
    INSERT INTO accounts (user_id, name, type, currency, cached_balance, status)
    VALUES ($1, $2, $3, $4, 0, 'ACTIVE')
    RETURNING id, user_id, name, type, currency, cached_balance, status, created_at
  `;
  const res = await pool.query(query, [userId, name, type, currency]);
  const row = res.rows[0];
  row.cached_balance = Number(row.cached_balance);
  return row;
}

/**
 * Posts an atomic double-entry deposit into an account from the EXTERNAL_BANK system account.
 *
 * Invariant: Sum of ledger entries = (-amountPaise) + (+amountPaise) = 0.
 *
 * @param {object} params
 * @param {import('pg').Pool} [params.pool] - PostgreSQL pool
 * @param {string} params.accountId - Destination account UUID
 * @param {number} params.amountPaise - Amount in paise (integer)
 * @param {string} [params.description='Simulated Deposit']
 * @param {object} [params.metadata={}]
 * @param {string|null} [params.idempotencyKey=null]
 * @returns {Promise<{ transaction: object, entries: object[] }>}
 */
export async function deposit({
  pool = getPool(),
  accountId,
  amountPaise,
  description = 'Simulated Deposit',
  metadata = {},
  idempotencyKey = null,
  onBeforeCommit = null,
}) {
  validateAmount(amountPaise);

  return withAccountLocks([SYSTEM_ACCOUNTS.EXTERNAL_BANK, accountId], async () => {
    return withLockRetry(async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Check for idempotent replay
        if (idempotencyKey) {
          const existingRes = await client.query(
            `SELECT id, type, status, amount_paise, description, metadata, created_at
             FROM transactions WHERE idempotency_key = $1`,
            [idempotencyKey]
          );
          if (existingRes.rows.length > 0) {
            const transaction = existingRes.rows[0];
            transaction.amount_paise = Number(transaction.amount_paise);
            const entryRes = await client.query(
              `SELECT id, transaction_id, account_id, amount_paise, balance_after, created_at
               FROM ledger_entries WHERE transaction_id = $1`,
              [transaction.id]
            );
            await client.query('COMMIT');
            return {
              transaction,
              entries: entryRes.rows.map((e) => ({
                ...e,
                amount_paise: Number(e.amount_paise),
                balance_after: Number(e.balance_after),
              })),
              isIdempotentReplay: true,
            };
          }
        }

        const sourceAccountId = SYSTEM_ACCOUNTS.EXTERNAL_BANK;
        const targetAccountId = accountId;

        // Lock both accounts in sorted ID order
        const accountMap = await lockAccountsInOrder(client, [sourceAccountId, targetAccountId]);
        const bankAccount = accountMap.get(sourceAccountId);
        const userAccount = accountMap.get(targetAccountId);

        // Compute new balances
        const newBankBalance = bankAccount.cached_balance - amountPaise;
        const newUserBalance = userAccount.cached_balance + amountPaise;

        // Insert transaction record
        const txId = crypto.randomUUID();
        const txRes = await client.query(
          `INSERT INTO transactions (id, type, status, idempotency_key, amount_paise, description, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, type, status, idempotency_key, amount_paise, description, metadata, created_at`,
          [
            txId,
            TRANSACTION_TYPES.DEPOSIT,
            TRANSACTION_STATUS.COMPLETED,
            idempotencyKey,
            amountPaise,
            description,
            JSON.stringify(metadata),
          ]
        );
        const transaction = txRes.rows[0];
        transaction.amount_paise = Number(transaction.amount_paise);

        // Insert paired immutable ledger entries (Debits = Credits, Sum = 0)
        const entry1Id = crypto.randomUUID();
        const entry2Id = crypto.randomUUID();

        const entry1Res = await client.query(
          `INSERT INTO ledger_entries (id, transaction_id, account_id, amount_paise, balance_after)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, transaction_id, account_id, amount_paise, balance_after, created_at`,
          [entry1Id, transaction.id, sourceAccountId, -amountPaise, newBankBalance]
        );

        const entry2Res = await client.query(
          `INSERT INTO ledger_entries (id, transaction_id, account_id, amount_paise, balance_after)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, transaction_id, account_id, amount_paise, balance_after, created_at`,
          [entry2Id, transaction.id, targetAccountId, amountPaise, newUserBalance]
        );

        // Update cached balances
        await client.query(
          `UPDATE accounts SET cached_balance = $1, version = version + 1 WHERE id = $2`,
          [newBankBalance, sourceAccountId]
        );
        await client.query(
          `UPDATE accounts SET cached_balance = $1, version = version + 1 WHERE id = $2`,
          [newUserBalance, targetAccountId]
        );

        if (typeof onBeforeCommit === 'function') {
          await onBeforeCommit(client, { transaction, entries: [entry1Res.rows[0], entry2Res.rows[0]] });
        }

        await client.query('COMMIT');

        const entries = [entry1Res.rows[0], entry2Res.rows[0]].map((e) => ({
          ...e,
          amount_paise: Number(e.amount_paise),
          balance_after: Number(e.balance_after),
        }));

        return { transaction, entries };
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error({ err, accountId, amountPaise }, 'Deposit transaction failed');
        throw err;
      } finally {
        client.release();
      }
    });
  });
}

/**
 * Transfers funds between two accounts using strict double-entry accounting.
 *
 * Invariant: Sum of ledger entries = (-amountPaise) + (+amountPaise) = 0.
 *
 * @param {object} params
 * @param {import('pg').Pool} [params.pool] - PostgreSQL pool
 * @param {string} params.sourceAccountId - Sender account UUID
 * @param {string} params.targetAccountId - Recipient account UUID
 * @param {number} params.amountPaise - Amount in paise (integer)
 * @param {string} [params.description='Transfer']
 * @param {object} [params.metadata={}]
 * @param {string|null} [params.idempotencyKey=null]
 * @returns {Promise<{ transaction: object, entries: object[] }>}
 */
export async function transfer({
  pool = getPool(),
  sourceAccountId,
  targetAccountId,
  amountPaise,
  description = 'Transfer',
  metadata = {},
  idempotencyKey = null,
  onBeforeCommit = null,
}) {
  validateAmount(amountPaise);

  if (sourceAccountId === targetAccountId) {
    throw new LedgerError('Source and target accounts must be distinct', 400, 'SELF_TRANSFER_DISALLOWED');
  }

  return withAccountLocks([sourceAccountId, targetAccountId], async () => {
    return withLockRetry(async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Check for idempotent replay
        if (idempotencyKey) {
          const existingRes = await client.query(
            `SELECT id, type, status, amount_paise, description, metadata, created_at
             FROM transactions WHERE idempotency_key = $1`,
            [idempotencyKey]
          );
          if (existingRes.rows.length > 0) {
            const transaction = existingRes.rows[0];
            transaction.amount_paise = Number(transaction.amount_paise);
            const entryRes = await client.query(
              `SELECT id, transaction_id, account_id, amount_paise, balance_after, created_at
               FROM ledger_entries WHERE transaction_id = $1`,
              [transaction.id]
            );
            await client.query('COMMIT');
            return {
              transaction,
              entries: entryRes.rows.map((e) => ({
                ...e,
                amount_paise: Number(e.amount_paise),
                balance_after: Number(e.balance_after),
              })),
              isIdempotentReplay: true,
            };
          }
        }

        // Lock accounts in lexicographical ascending order
        const accountMap = await lockAccountsInOrder(client, [sourceAccountId, targetAccountId]);
        const sourceAccount = accountMap.get(sourceAccountId);
        const targetAccount = accountMap.get(targetAccountId);

        // Verify source balance (no overdraft permitted for wallet accounts)
        if (sourceAccount.type === ACCOUNT_TYPES.USER_WALLET && sourceAccount.cached_balance < amountPaise) {
          throw new InsufficientFundsError(
            `Insufficient funds: Available balance ₹${(sourceAccount.cached_balance / 100).toFixed(2)}, required ₹${(amountPaise / 100).toFixed(2)}`
          );
        }

        // Calculate new balances
        const newSourceBalance = sourceAccount.cached_balance - amountPaise;
        const newTargetBalance = targetAccount.cached_balance + amountPaise;

        // Create transaction
        const txId = crypto.randomUUID();
        const txRes = await client.query(
          `INSERT INTO transactions (id, type, status, idempotency_key, amount_paise, description, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, type, status, idempotency_key, amount_paise, description, metadata, created_at`,
          [
            txId,
            TRANSACTION_TYPES.TRANSFER,
            TRANSACTION_STATUS.COMPLETED,
            idempotencyKey,
            amountPaise,
            description,
            JSON.stringify(metadata),
          ]
        );
        const transaction = txRes.rows[0];
        transaction.amount_paise = Number(transaction.amount_paise);

        // Insert paired immutable ledger entries
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
          [entry2Id, transaction.id, targetAccountId, amountPaise, newTargetBalance]
        );

        // Update cached balances
        await client.query(
          `UPDATE accounts SET cached_balance = $1, version = version + 1 WHERE id = $2`,
          [newSourceBalance, sourceAccountId]
        );
        await client.query(
          `UPDATE accounts SET cached_balance = $1, version = version + 1 WHERE id = $2`,
          [newTargetBalance, targetAccountId]
        );

        if (typeof onBeforeCommit === 'function') {
          await onBeforeCommit(client, { transaction, entries: [entry1Res.rows[0], entry2Res.rows[0]] });
        }

        await client.query('COMMIT');

        const entries = [entry1Res.rows[0], entry2Res.rows[0]].map((e) => ({
          ...e,
          amount_paise: Number(e.amount_paise),
          balance_after: Number(e.balance_after),
        }));

        return { transaction, entries };
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error({ err, sourceAccountId, targetAccountId, amountPaise }, 'Transfer transaction failed');
        throw err;
      } finally {
        client.release();
      }
    });
  });
}

/**
 * Posts a withdrawal from an account to EXTERNAL_BANK.
 *
 * Invariant: Sum of ledger entries = (-amountPaise) + (+amountPaise) = 0.
 *
 * @param {object} params
 * @param {import('pg').Pool} [params.pool] - PostgreSQL pool
 * @param {string} params.accountId - Source account UUID
 * @param {number} params.amountPaise - Amount in paise (integer)
 * @param {string} [params.description='Simulated Withdrawal']
 * @param {object} [params.metadata={}]
 * @param {string|null} [params.idempotencyKey=null]
 * @returns {Promise<{ transaction: object, entries: object[] }>}
 */
export async function withdraw({
  pool = getPool(),
  accountId,
  amountPaise,
  description = 'Simulated Withdrawal',
  metadata = {},
  idempotencyKey = null,
  onBeforeCommit = null,
}) {
  validateAmount(amountPaise);

  return withAccountLocks([accountId, SYSTEM_ACCOUNTS.EXTERNAL_BANK], async () => {
    return withLockRetry(async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Check for idempotent replay
        if (idempotencyKey) {
          const existingRes = await client.query(
            `SELECT id, type, status, amount_paise, description, metadata, created_at
             FROM transactions WHERE idempotency_key = $1`,
            [idempotencyKey]
          );
          if (existingRes.rows.length > 0) {
            const transaction = existingRes.rows[0];
            transaction.amount_paise = Number(transaction.amount_paise);
            const entryRes = await client.query(
              `SELECT id, transaction_id, account_id, amount_paise, balance_after, created_at
               FROM ledger_entries WHERE transaction_id = $1`,
              [transaction.id]
            );
            await client.query('COMMIT');
            return {
              transaction,
              entries: entryRes.rows.map((e) => ({
                ...e,
                amount_paise: Number(e.amount_paise),
                balance_after: Number(e.balance_after),
              })),
              isIdempotentReplay: true,
            };
          }
        }

        const sourceAccountId = accountId;
        const targetAccountId = SYSTEM_ACCOUNTS.EXTERNAL_BANK;

        const accountMap = await lockAccountsInOrder(client, [sourceAccountId, targetAccountId]);
        const sourceAccount = accountMap.get(sourceAccountId);
        const bankAccount = accountMap.get(targetAccountId);

        if (sourceAccount.type === ACCOUNT_TYPES.USER_WALLET && sourceAccount.cached_balance < amountPaise) {
          throw new InsufficientFundsError(
            `Insufficient funds for withdrawal: Available ₹${(sourceAccount.cached_balance / 100).toFixed(2)}, requested ₹${(amountPaise / 100).toFixed(2)}`
          );
        }

        const newSourceBalance = sourceAccount.cached_balance - amountPaise;
        const newBankBalance = bankAccount.cached_balance + amountPaise;

        const txId = crypto.randomUUID();
        const txRes = await client.query(
          `INSERT INTO transactions (id, type, status, idempotency_key, amount_paise, description, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, type, status, idempotency_key, amount_paise, description, metadata, created_at`,
          [
            txId,
            TRANSACTION_TYPES.WITHDRAWAL,
            TRANSACTION_STATUS.COMPLETED,
            idempotencyKey,
            amountPaise,
            description,
            JSON.stringify(metadata),
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
          [entry2Id, transaction.id, targetAccountId, amountPaise, newBankBalance]
        );

        await client.query(
          `UPDATE accounts SET cached_balance = $1, version = version + 1 WHERE id = $2`,
          [newSourceBalance, sourceAccountId]
        );
        await client.query(
          `UPDATE accounts SET cached_balance = $1, version = version + 1 WHERE id = $2`,
          [newBankBalance, targetAccountId]
        );

        if (typeof onBeforeCommit === 'function') {
          await onBeforeCommit(client, { transaction, entries: [entry1Res.rows[0], entry2Res.rows[0]] });
        }

        await client.query('COMMIT');

        const entries = [entry1Res.rows[0], entry2Res.rows[0]].map((e) => ({
          ...e,
          amount_paise: Number(e.amount_paise),
          balance_after: Number(e.balance_after),
        }));

        return { transaction, entries };
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error({ err, accountId, amountPaise }, 'Withdrawal transaction failed');
        throw err;
      } finally {
        client.release();
      }
    });
  });
}

/**
 * Retrieves account balance with real-time double-entry verification.
 * Checks that cached_balance strictly matches the sum of all immutable entries.
 *
 * @param {import('pg').Pool} pool
 * @param {string} accountId
 * @returns {Promise<{ account: object, cachedBalancePaise: number, verifiedBalancePaise: number, isBalanced: boolean }>}
 */
export async function getAccountBalance(pool, accountId) {
  const accRes = await pool.query(
    `SELECT id, user_id, name, type, currency, cached_balance, status FROM accounts WHERE id = $1`,
    [accountId]
  );
  if (accRes.rows.length === 0) {
    throw new LedgerError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
  }
  const account = accRes.rows[0];
  const cachedBalancePaise = Number(account.cached_balance);

  const sumRes = await pool.query(
    `SELECT COALESCE(SUM(amount_paise), 0) AS entry_sum FROM ledger_entries WHERE account_id = $1`,
    [accountId]
  );
  const verifiedBalancePaise = Number(sumRes.rows[0].entry_sum);
  const isBalanced = cachedBalancePaise === verifiedBalancePaise;

  return {
    account,
    cachedBalancePaise,
    verifiedBalancePaise,
    cachedBalance: cachedBalancePaise,
    calculatedBalance: verifiedBalancePaise,
    isBalanced,
    isVerified: isBalanced,
  };
}
