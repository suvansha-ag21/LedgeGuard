import { newDb, DataType } from 'pg-mem';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates an in-memory PostgreSQL test database matching the real schema,
 * complete with UUID generators, check constraints, system accounts,
 * ledger immutability enforcement, and full BEGIN/ROLLBACK transaction isolation.
 *
 * @returns {Promise<{ pool: import('pg').Pool, db: any }>}
 */
export async function createTestDb() {
  const db = newDb();

  // Register PostgreSQL gen_random_uuid() as impure (returns new UUID on every call)
  db.public.registerFunction({
    name: 'gen_random_uuid',
    impure: true,
    implementation: () => crypto.randomUUID(),
  });

  // Register PostgreSQL date() function
  db.public.registerFunction({
    name: 'date',
    implementation: (ts) => (ts ? new Date(ts).toISOString().split('T')[0] : null),
  });

  // Register PostgreSQL abs() function
  db.public.registerFunction({
    name: 'abs',
    implementation: (x) => (x !== null ? Math.abs(x) : null),
  });

  // Register stub functions for aggregate deviations
  db.public.registerFunction({
    name: 'stddev_pop',
    args: [DataType.integer],
    returns: DataType.float,
    implementation: () => 0,
  });
  db.public.registerFunction({
    name: 'stddev_pop',
    args: [DataType.bigint],
    returns: DataType.float,
    implementation: () => 0,
  });
  db.public.registerFunction({
    name: 'stddev',
    args: [DataType.integer],
    returns: DataType.float,
    implementation: () => 0,
  });
  db.public.registerFunction({
    name: 'stddev',
    args: [DataType.bigint],
    returns: DataType.float,
    implementation: () => 0,
  });

  const schemaPath = path.join(__dirname, '../../src/db/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Strip PL/pgSQL function & triggers for pg-mem compatibility
  let cleanSql = schemaSql.replace(/--.*$/gm, '');
  cleanSql = cleanSql.replace(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$ LANGUAGE plpgsql;/gi, '');
  cleanSql = cleanSql.replace(/CREATE TRIGGER[\s\S]*?;/gi, '');
  cleanSql = cleanSql.replace(/DROP TRIGGER[\s\S]*?;/gi, '');

  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.toUpperCase().startsWith('CREATE EXTENSION'));

  const { Pool } = db.adapters.createPg();
  const pool = new Pool();

  for (const stmt of statements) {
    await pool.query(stmt);
  }

  // Enforce ledger_entries immutability to mirror the PostgreSQL trigger
  const ledgerTable = db.getTable('ledger_entries');
  ledgerTable.update = () => {
    throw new Error('Ledger entries are strictly immutable. UPDATE and DELETE operations are forbidden.');
  };
  ledgerTable.delete = () => {
    throw new Error('Ledger entries are strictly immutable. UPDATE and DELETE operations are forbidden.');
  };

  // Wire transaction rollback hook so client.query('ROLLBACK') accurately reverts state in pg-mem
  let txBackup = null;
  db.on('query', (q) => {
    const sql = typeof q === 'string' ? q.trim().toUpperCase() : '';
    if (sql.startsWith('BEGIN')) {
      txBackup = db.backup();
    } else if (sql.startsWith('ROLLBACK')) {
      if (txBackup) {
        txBackup.restore();
        txBackup = null;
      }
    } else if (sql.startsWith('COMMIT')) {
      txBackup = null;
    }
  });

  return { pool, db };
}

export default createTestDb;
