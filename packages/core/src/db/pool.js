import pg from 'pg';
import logger from '../logger.js';

const { Pool, types } = pg;

// Type parser: parse BIGINT (OID 20) as JavaScript Number (integer paise)
// In fintech, fractional paise are disallowed. Integers guarantee exact precision.
types.setTypeParser(20, (val) => {
  if (val === null) return null;
  const parsed = Number(val);
  if (!Number.isSafeInteger(parsed)) {
    throw new RangeError(`BIGINT value ${val} exceeds JavaScript Number.isSafeInteger range`);
  }
  return parsed;
});

const GLOBAL_POOL_KEY = Symbol.for('ledgerguard.db.pool');

/**
 * Creates or retrieves the singleton PostgreSQL connection pool
 * @param {string} [connectionString]
 * @returns {import('pg').Pool}
 */
export function getPool(connectionString = process.env.DATABASE_URL) {
  if (!globalThis[GLOBAL_POOL_KEY]) {
    const isRemote = connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');

    const pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL,
      ssl: isRemote ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      logger.error({ err: err.message }, 'Unexpected error on idle PostgreSQL client');
    });

    globalThis[GLOBAL_POOL_KEY] = pool;
    logger.info({ isRemote, poolMax: pool.options.max }, 'PostgreSQL connection pool initialized singleton');
  }

  return globalThis[GLOBAL_POOL_KEY];
}

/**
 * Safely closes the pool (used in graceful shutdowns and tests)
 */
export async function closePool() {
  if (globalThis[GLOBAL_POOL_KEY]) {
    await globalThis[GLOBAL_POOL_KEY].end();
    delete globalThis[GLOBAL_POOL_KEY];
    logger.info('PostgreSQL connection pool cleanly closed');
  }
}
