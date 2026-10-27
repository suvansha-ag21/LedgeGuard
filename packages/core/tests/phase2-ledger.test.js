import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from './helpers/createTestDb.js';
import { 
  validateAmount, 
  createAccount, 
  deposit, 
  transfer, 
  withdraw, 
  getAccountBalance 
} from '../src/ledger/engine.js';
import { 
  InsufficientFundsError, 
  InvalidAmountError, 
  AccountFrozenError, 
  LedgerError 
} from '../src/ledger/errors.js';
import { ACCOUNT_STATUS } from '../src/ledger/constants.js';

describe('Phase 2: Core Double-Entry Ledger Engine', () => {
  let pool;

  beforeEach(async () => {
    const testDb = await createTestDb();
    pool = testDb.pool;
  });

  describe('validateAmount', () => {
    it('accepts positive safe integers', () => {
      expect(() => validateAmount(100)).not.toThrow();
      expect(() => validateAmount(50000)).not.toThrow();
      expect(() => validateAmount(100000000)).not.toThrow();
    });

    it('rejects floats, decimals, zeros, and non-numbers', () => {
      expect(() => validateAmount(0)).toThrow(InvalidAmountError);
      expect(() => validateAmount(-500)).toThrow(InvalidAmountError);
      expect(() => validateAmount(10.5)).toThrow(InvalidAmountError);
      expect(() => validateAmount('50000')).toThrow(InvalidAmountError);
      expect(() => validateAmount(NaN)).toThrow(InvalidAmountError);
      expect(() => validateAmount(Infinity)).toThrow(InvalidAmountError);
    });
  });

  describe('Deposits (EXTERNAL_BANK -> User Wallet)', () => {
    it('deposits funds and maintains strict zero-sum double entry invariant', async () => {
      const userAcc = await createAccount({ pool, name: "Aman's Wallet" });

      const { transaction, entries } = await deposit({
        pool,
        accountId: userAcc.id,
        amountPaise: 50000, // ₹500.00
        description: 'Test Deposit',
      });

      expect(transaction.type).toBe('DEPOSIT');
      expect(transaction.status).toBe('COMPLETED');
      expect(entries.length).toBe(2);

      // Invariant: sum of entries must equal exactly 0
      const sumEntries = entries.reduce((sum, e) => sum + e.amount_paise, 0);
      expect(sumEntries).toBe(0);

      // Verify balances
      const bal = await getAccountBalance(pool, userAcc.id);
      expect(bal.cachedBalancePaise).toBe(50000);
      expect(bal.verifiedBalancePaise).toBe(50000);
      expect(bal.isBalanced).toBe(true);
    });
  });

  describe('Transfers (Wallet -> Wallet)', () => {
    it('transfers funds atomically between accounts with zero-sum ledger entries', async () => {
      const aman = await createAccount({ pool, name: 'Aman' });
      const riya = await createAccount({ pool, name: 'Riya' });

      // Seed Aman with ₹1,000.00 (100,000 paise)
      await deposit({ pool, accountId: aman.id, amountPaise: 100000 });

      // Aman sends ₹400.00 (40,000 paise) to Riya
      const { transaction, entries } = await transfer({
        pool,
        sourceAccountId: aman.id,
        targetAccountId: riya.id,
        amountPaise: 40000,
        description: 'Dinner payment',
      });

      expect(transaction.type).toBe('TRANSFER');
      expect(entries.length).toBe(2);

      // Strict Zero-Sum Invariant
      const sum = entries.reduce((acc, e) => acc + e.amount_paise, 0);
      expect(sum).toBe(0);

      const amanBal = await getAccountBalance(pool, aman.id);
      expect(amanBal.cachedBalancePaise).toBe(60000);
      expect(amanBal.verifiedBalancePaise).toBe(60000);
      expect(amanBal.isBalanced).toBe(true);

      const riyaBal = await getAccountBalance(pool, riya.id);
      expect(riyaBal.cachedBalancePaise).toBe(40000);
      expect(riyaBal.verifiedBalancePaise).toBe(40000);
      expect(riyaBal.isBalanced).toBe(true);
    });

    it('rejects transfer when source account has insufficient balance (no overdraft)', async () => {
      const aman = await createAccount({ pool, name: 'Aman' });
      const riya = await createAccount({ pool, name: 'Riya' });

      await deposit({ pool, accountId: aman.id, amountPaise: 10000 }); // ₹100

      // Attempt to send ₹200
      await expect(
        transfer({
          pool,
          sourceAccountId: aman.id,
          targetAccountId: riya.id,
          amountPaise: 20000,
        })
      ).rejects.toThrow(InsufficientFundsError);

      // Balances must remain completely unchanged
      const amanBal = await getAccountBalance(pool, aman.id);
      expect(amanBal.cachedBalancePaise).toBe(10000);
    });

    it('rejects self-transfer', async () => {
      const aman = await createAccount({ pool, name: 'Aman' });
      await deposit({ pool, accountId: aman.id, amountPaise: 10000 });

      await expect(
        transfer({
          pool,
          sourceAccountId: aman.id,
          targetAccountId: aman.id,
          amountPaise: 5000,
        })
      ).rejects.toThrow(LedgerError);
    });

    it('rejects transfer if source account is frozen', async () => {
      const aman = await createAccount({ pool, name: 'Aman' });
      const riya = await createAccount({ pool, name: 'Riya' });
      await deposit({ pool, accountId: aman.id, amountPaise: 50000 });

      // Freeze Aman's account
      await pool.query(`UPDATE accounts SET status = $1 WHERE id = $2`, [ACCOUNT_STATUS.FROZEN, aman.id]);

      await expect(
        transfer({
          pool,
          sourceAccountId: aman.id,
          targetAccountId: riya.id,
          amountPaise: 10000,
        })
      ).rejects.toThrow(AccountFrozenError);
    });
  });

  describe('Withdrawals (Wallet -> EXTERNAL_BANK)', () => {
    it('processes withdrawals and updates balances cleanly', async () => {
      const aman = await createAccount({ pool, name: 'Aman' });
      await deposit({ pool, accountId: aman.id, amountPaise: 50000 });

      const { transaction, entries } = await withdraw({
        pool,
        accountId: aman.id,
        amountPaise: 20000,
        description: 'ATM Cash Out',
      });

      expect(transaction.type).toBe('WITHDRAWAL');
      expect(entries.length).toBe(2);

      const sum = entries.reduce((acc, e) => acc + e.amount_paise, 0);
      expect(sum).toBe(0);

      const amanBal = await getAccountBalance(pool, aman.id);
      expect(amanBal.cachedBalancePaise).toBe(30000);
      expect(amanBal.isBalanced).toBe(true);
    });

    it('rejects withdrawal if balance is insufficient', async () => {
      const aman = await createAccount({ pool, name: 'Aman' });
      await deposit({ pool, accountId: aman.id, amountPaise: 5000 });

      await expect(
        withdraw({
          pool,
          accountId: aman.id,
          amountPaise: 10000,
        })
      ).rejects.toThrow(InsufficientFundsError);
    });
  });
});
