import { describe, it, expect, beforeAll } from 'vitest';
import { createTestDb } from './helpers/createTestDb.js';

describe('Phase 1: DB Schema, Constraints, Immutability Trigger & Type Parsers', () => {
  let pool;

  beforeAll(async () => {
    const testDb = await createTestDb();
    pool = testDb.pool;
  });

  it('creates all required tables including rate_limits and reconciliation structures', async () => {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tables = res.rows.map(r => r.table_name);
    
    expect(tables).toContain('users');
    expect(tables).toContain('accounts');
    expect(tables).toContain('transactions');
    expect(tables).toContain('ledger_entries');
    expect(tables).toContain('idempotency_keys');
    expect(tables).toContain('risk_assessments');
    expect(tables).toContain('review_queue');
    expect(tables).toContain('audit_logs');
    expect(tables).toContain('webhook_endpoints');
    expect(tables).toContain('webhook_deliveries');
    expect(tables).toContain('api_keys');
    expect(tables).toContain('reconciliation_runs');
    expect(tables).toContain('rate_limits');
  });

  it('seeded the 3 special system accounts (EXTERNAL_BANK, PLATFORM_FEE, PLATFORM_HOLD)', async () => {
    const res = await pool.query(`SELECT id, name, type FROM accounts WHERE type = 'SYSTEM'`);
    expect(res.rows.length).toBe(3);
    const names = res.rows.map(r => r.name);
    expect(names).toContain('EXTERNAL_BANK');
    expect(names).toContain('PLATFORM_FEE');
    expect(names).toContain('PLATFORM_HOLD');
  });

  it('enforces non-negative balance on USER_WALLET accounts via CHECK constraint', async () => {
    await expect(pool.query(`
      INSERT INTO accounts (name, type, cached_balance)
      VALUES ('Test Negative Account', 'USER_WALLET', -5000)
    `)).rejects.toThrow();
  });

  it('enforces positive amounts on transactions via CHECK constraint', async () => {
    const txId = crypto.randomUUID();
    await expect(pool.query(`
      INSERT INTO transactions (id, type, status, amount_paise)
      VALUES ($1, 'TRANSFER', 'PENDING', -100)
    `, [txId])).rejects.toThrow();
  });

  it('enforces immutability on ledger_entries (rejects UPDATE and DELETE)', async () => {
    const txId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO transactions (id, type, status, amount_paise)
      VALUES ($1, 'DEPOSIT', 'COMPLETED', 50000)
    `, [txId]);

    const entryId = crypto.randomUUID();
    const bankAccountId = '00000000-0000-0000-0000-000000000001';
    await pool.query(`
      INSERT INTO ledger_entries (id, transaction_id, account_id, amount_paise, balance_after)
      VALUES ($1, $2, $3, 50000, 50000)
    `, [entryId, txId, bankAccountId]);

    // Attempt UPDATE -> must throw immutability error
    await expect(pool.query(`
      UPDATE ledger_entries SET amount_paise = 99999 WHERE id = $1
    `, [entryId])).rejects.toThrow(/immutable/i);

    // Attempt DELETE -> must throw immutability error
    await expect(pool.query(`
      DELETE FROM ledger_entries WHERE id = $1
    `, [entryId])).rejects.toThrow(/immutable/i);
  });

  it('supports rate_limits composite primary key (key, window_start)', async () => {
    const testKey = 'ip:127.0.0.1';
    const windowStart = 1700000000000;

    await pool.query(`
      INSERT INTO rate_limits (key, window_start, count)
      VALUES ($1, $2, 1)
      ON CONFLICT (key, window_start)
      DO UPDATE SET count = rate_limits.count + 1
    `, [testKey, windowStart]);

    const res1 = await pool.query(`SELECT count FROM rate_limits WHERE key = $1 AND window_start = $2`, [testKey, windowStart]);
    expect(res1.rows[0].count).toBe(1);

    // Increment in same window
    await pool.query(`
      INSERT INTO rate_limits (key, window_start, count)
      VALUES ($1, $2, 1)
      ON CONFLICT (key, window_start)
      DO UPDATE SET count = rate_limits.count + 1
    `, [testKey, windowStart]);

    const res2 = await pool.query(`SELECT count FROM rate_limits WHERE key = $1 AND window_start = $2`, [testKey, windowStart]);
    expect(res2.rows[0].count).toBe(2);
  });
});
