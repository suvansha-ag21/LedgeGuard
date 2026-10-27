import { AccountNotFoundError, AccountFrozenError, DeadlockExhaustionError } from './errors.js';
import { ACCOUNT_STATUS } from './constants.js';
import logger from '../logger.js';

const mutexChains = new Map();

/**
 * Acquires an in-process lock for a specific account ID.
 * Guarantees that concurrent async tasks serialize operations on the same account.
 *
 * @param {string} id
 * @returns {Promise<() => void>} Release function
 */
export async function acquireMutex(id) {
  const current = mutexChains.get(id) || Promise.resolve();
  let release;
  const next = new Promise((resolve) => {
    release = resolve;
  });
  mutexChains.set(id, current.then(() => next));
  await current;
  return () => {
    release();
    if (mutexChains.get(id) === next) {
      mutexChains.delete(id);
    }
  };
}

/**
 * Acquires mutexes for multiple accounts in strict ascending lexicographical order,
 * executes the given function, and safely releases the mutexes in reverse order.
 *
 * @template T
 * @param {string[]} accountIds
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withAccountLocks(accountIds, fn) {
  const sortedIds = [...new Set(accountIds)].sort();
  const releases = [];

  for (const id of sortedIds) {
    const rel = await acquireMutex(id);
    releases.push(rel);
  }

  try {
    return await fn();
  } finally {
    for (const rel of releases.reverse()) {
      rel();
    }
  }
}

/**
 * Locks multiple accounts in lexicographically sorted order using SELECT ... FOR UPDATE.
 * Strictly sorting account IDs prevents AB-BA deadlocks across concurrent transactions.
 *
 * @param {import('pg').PoolClient} client - Dedicated PostgreSQL client within an active transaction
 * @param {string[]} accountIds - Array of account UUIDs to lock
 * @param {boolean} [allowFrozen=false] - If false, throws AccountFrozenError if any account is frozen
 * @returns {Promise<Map<string, { id: string, name: string, type: string, cached_balance: number, version: number, status: string }>>}
 */
export async function lockAccountsInOrder(client, accountIds, allowFrozen = false) {
  const uniqueSortedIds = [...new Set(accountIds)].sort();
  const accountMap = new Map();

  for (const accountId of uniqueSortedIds) {
    const res = await client.query(
      `SELECT id, name, type, cached_balance, version, status 
       FROM accounts 
       WHERE id = $1 
       FOR UPDATE`,
      [accountId]
    );

    if (res.rows.length === 0) {
      throw new AccountNotFoundError(`Account ${accountId} does not exist`);
    }

    const account = res.rows[0];
    account.cached_balance = Number(account.cached_balance);

    if (!allowFrozen && account.status === ACCOUNT_STATUS.FROZEN) {
      throw new AccountFrozenError(`Account ${account.name} (${accountId}) is frozen`);
    }

    accountMap.set(accountId, account);
  }

  return accountMap;
}

/**
 * Executes a database operation with automatic retry on deadlock or serialization failure.
 *
 * @template T
 * @param {() => Promise<T>} operation
 * @param {number} [maxRetries=5]
 * @param {number} [baseDelayMs=50]
 * @returns {Promise<T>}
 */
export async function withLockRetry(operation, maxRetries = 5, baseDelayMs = 50) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (err) {
      const isDeadlock = err.code === '40P01' || err.code === '40001' || /deadlock/i.test(err.message);

      if (isDeadlock && attempt < maxRetries - 1) {
        attempt++;
        const jitter = Math.random() * 30;
        const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
        logger.warn({ attempt, delay, err: err.message }, 'Concurrent lock contention detected, retrying...');
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        if (isDeadlock) {
          throw new DeadlockExhaustionError(`Exhausted ${maxRetries} retries due to lock contention`);
        }
        throw err;
      }
    }
  }
}
