import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from './helpers/createTestDb.js';
import { 
  createAccount, 
  deposit, 
  transfer, 
  withdraw, 
  getAccountBalance 
} from '../src/ledger/engine.js';
import { InsufficientFundsError } from '../src/ledger/errors.js';
import { runReconciliationAudit } from '../src/ledger/reconciliation.js';

describe('Phase 8: Comprehensive Concurrency, Idempotency & Financial Invariants', () => {
  let pool;

  beforeEach(async () => {
    const testDb = await createTestDb();
    pool = testDb.pool;
  });

  describe('Idempotency Key Guaranteed Replays', () => {
    it('executes exactly 1 transfer when the same idempotency key is submitted 5 times', async () => {
      // Create user and accounts
      const userRes = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ('Idem User', 'idem@example.com', 'hash', 'USER')
         RETURNING id`
      );
      const userId = userRes.rows[0].id;

      const accA = await createAccount({ pool, userId, name: 'Alice Wallet' });
      const accB = await createAccount({ pool, userId, name: 'Bob Wallet' });

      // Deposit ₹10,000 (1,000,000 paise) into Alice
      await deposit({ pool, accountId: accA.id, amountPaise: 1000000 });

      const idempotencyKey = 'unique_idem_test_key_999';
      const transferAmountPaise = 250000; // ₹2,500.00

      // Execute first transfer
      const res1 = await transfer({
        pool,
        sourceAccountId: accA.id,
        targetAccountId: accB.id,
        amountPaise: transferAmountPaise,
        idempotencyKey,
      });

      expect(res1.transaction.idempotency_key).toBe(idempotencyKey);
      expect(res1.isIdempotentReplay).toBeFalsy();

      // Submit 4 additional replays with identical idempotencyKey
      for (let i = 2; i <= 5; i++) {
        const replayRes = await transfer({
          pool,
          sourceAccountId: accA.id,
          targetAccountId: accB.id,
          amountPaise: transferAmountPaise,
          idempotencyKey,
        });

        expect(replayRes.transaction.id).toBe(res1.transaction.id);
        expect(replayRes.isIdempotentReplay).toBe(true);
        expect(replayRes.transaction.amount_paise).toBe(transferAmountPaise);
      }

      // Verify balances: Alice should have lost exactly ₹2,500 ONCE
      const balA = await getAccountBalance(pool, accA.id);
      const balB = await getAccountBalance(pool, accB.id);

      expect(balA.cachedBalancePaise).toBe(750000); // 10,000 - 2,500
      expect(balB.cachedBalancePaise).toBe(250000); // 0 + 2,500

      // Invariant check: only 1 transaction record exists for this idempotency key
      const txCountRes = await pool.query(
        `SELECT COUNT(*) as count FROM transactions WHERE idempotency_key = $1`,
        [idempotencyKey]
      );
      expect(parseInt(txCountRes.rows[0].count, 10)).toBe(1);

      // And exactly 2 ledger entries (one debit, one credit)
      const leCountRes = await pool.query(
        `SELECT COUNT(*) as count FROM ledger_entries WHERE transaction_id = $1`,
        [res1.transaction.id]
      );
      expect(parseInt(leCountRes.rows[0].count, 10)).toBe(2);
    });
  });

  describe('Concurrency & Non-Overdraft Race Invariants', () => {
    it('prevents overdraft under 100 concurrent withdrawal requests', async () => {
      const userRes = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ('Stress User', 'stress@example.com', 'hash', 'USER')
         RETURNING id`
      );
      const userId = userRes.rows[0].id;

      const wallet = await createAccount({ pool, userId, name: 'Stress Wallet' });

      // Deposit ₹10,000 (1,000,000 paise)
      const initialDepositPaise = 1000000;
      await deposit({ pool, accountId: wallet.id, amountPaise: initialDepositPaise });

      // Fire 100 simultaneous withdrawal attempts of ₹1,000 (100,000 paise) each.
      // Total requested = 100 * ₹1,000 = ₹100,000.
      // But available balance is only ₹10,000.
      // Exactly 10 must succeed, and 90 must fail with InsufficientFundsError.
      // Account balance must end at exactly ₹0 and NEVER go negative.
      const withdrawalAmountPaise = 100000; // ₹1,000
      const totalWorkers = 100;
      const expectedSuccesses = initialDepositPaise / withdrawalAmountPaise; // 10

      let successCount = 0;
      let failureCount = 0;

      const promises = Array.from({ length: totalWorkers }, async (_, idx) => {
        try {
          await withdraw({
            pool,
            accountId: wallet.id,
            amountPaise: withdrawalAmountPaise,
            idempotencyKey: `stress_withdrawal_${idx}_${Date.now()}`,
          });
          successCount++;
        } catch (err) {
          if (err instanceof InsufficientFundsError || err.code === 'INSUFFICIENT_FUNDS') {
            failureCount++;
          } else {
            throw err;
          }
        }
      });

      await Promise.all(promises);

      expect(successCount).toBe(expectedSuccesses);
      expect(failureCount).toBe(totalWorkers - expectedSuccesses);

      // Verify ending balance
      const finalBal = await getAccountBalance(pool, wallet.id);
      expect(finalBal.cachedBalancePaise).toBe(0);
      expect(finalBal.calculatedBalance).toBe(0);
      expect(finalBal.isBalanced).toBe(true);

      // Run comprehensive reconciliation audit
      const audit = await runReconciliationAudit(pool);
      expect(audit.status).toBe('BALANCED');
      expect(audit.net_ledger_sum).toBe(0);
      expect(audit.mismatches.length).toBe(0);
    });

    it('handles bidirectional concurrent transfers without deadlocks', async () => {
      const userRes = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ('Deadlock Tester', 'deadlock@example.com', 'hash', 'USER')
         RETURNING id`
      );
      const userId = userRes.rows[0].id;

      const accX = await createAccount({ pool, userId, name: 'Account X' });
      const accY = await createAccount({ pool, userId, name: 'Account Y' });

      // Seed ₹50,000 in both
      await deposit({ pool, accountId: accX.id, amountPaise: 5000000 });
      await deposit({ pool, accountId: accY.id, amountPaise: 5000000 });

      // Simultaneously send X -> Y and Y -> X
      const transfers = [];
      for (let i = 0; i < 20; i++) {
        // Even indices: X -> Y
        // Odd indices: Y -> X
        if (i % 2 === 0) {
          transfers.push(
            transfer({
              pool,
              sourceAccountId: accX.id,
              targetAccountId: accY.id,
              amountPaise: 10000,
              idempotencyKey: `bidirectional_x_y_${i}`,
            })
          );
        } else {
          transfers.push(
            transfer({
              pool,
              sourceAccountId: accY.id,
              targetAccountId: accX.id,
              amountPaise: 10000,
              idempotencyKey: `bidirectional_y_x_${i}`,
            })
          );
        }
      }

      // Must complete without deadlocks due to ascending lock ordering
      await Promise.all(transfers);

      const balX = await getAccountBalance(pool, accX.id);
      const balY = await getAccountBalance(pool, accY.id);

      expect(balX.isBalanced).toBe(true);
      expect(balY.isBalanced).toBe(true);
      expect(balX.cachedBalancePaise + balY.cachedBalancePaise).toBe(10000000);
    });
  });
});
