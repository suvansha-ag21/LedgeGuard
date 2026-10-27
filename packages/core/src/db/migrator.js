import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './pool.js';
import logger from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Runs the database migrations / schema initialization
 * @param {import('pg').Pool} [customPool]
 */
export async function runMigrations(customPool) {
  const pool = customPool || getPool();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    logger.info('Executing database migrations...');
    await client.query('BEGIN');
    await client.query(schemaSql);
    await client.query('COMMIT');
    logger.info('Database migrations applied successfully');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Failed to apply database migrations');
    throw err;
  } finally {
    client.release();
  }
}

export default runMigrations;
