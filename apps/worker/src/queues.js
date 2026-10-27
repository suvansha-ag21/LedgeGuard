import { PgBoss } from 'pg-boss';
import logger from '@ledgerguard/core/logger';

let bossInstance = null;

/**
 * Initializes and returns the singleton pg-boss instance using DATABASE_URL_WORKER or DATABASE_URL.
 *
 * @returns {PgBoss | null}
 */
export function getBoss() {
  if (!bossInstance) {
    const connectionString = process.env.DATABASE_URL_WORKER || process.env.DATABASE_URL;
    if (!connectionString) {
      logger.warn('DATABASE_URL_WORKER not set; pg-boss queue operating in database-polling mode');
      return null;
    }

    try {
      bossInstance = new PgBoss({
        connectionString,
        schema: 'pgboss',
        ssl: connectionString.includes('supabase') || connectionString.includes('sslmode=require') 
          ? { rejectUnauthorized: false } 
          : undefined,
        monitorStateIntervalMinutes: 2,
      });

      bossInstance.on('error', (err) => {
        logger.error({ err: err.message }, 'pg-boss queue error');
      });
    } catch (err) {
      logger.error({ err: err.message }, 'Failed to initialize pg-boss');
      return null;
    }
  }

  return bossInstance;
}
