import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from './helpers/createTestDb.js';
import {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  registerUser,
  loginUser,
} from '../src/auth/index.js';
import { getAccountBalance } from '../src/ledger/engine.js';
import { LedgerError } from '../src/ledger/errors.js';

describe('Phase 3: Authentication, Wallet Auto-Provisioning & Security', () => {
  let pool;

  beforeEach(async () => {
    const testDb = await createTestDb();
    pool = testDb.pool;
  });

  describe('Password Hashing & JWT Verification', () => {
    it('hashes passwords securely with bcrypt and verifies matches', async () => {
      const password = 'SecretPassword123!';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await comparePassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('signs and verifies JWT tokens with correct claims', async () => {
      const claims = { sub: 'usr_123', name: 'Aman', role: 'USER' };
      const token = await signToken(claims, '1h');

      expect(typeof token).toBe('string');
      const decoded = await verifyToken(token);

      expect(decoded.sub).toBe('usr_123');
      expect(decoded.name).toBe('Aman');
      expect(decoded.role).toBe('USER');
    });
  });

  describe('User Registration & Auto-Wallet Provisioning', () => {
    it('registers user, auto-provisions a wallet, and seeds welcome bonus', async () => {
      const { user, account, token } = await registerUser({
        pool,
        name: 'Priya Sharma',
        email: 'priya@example.com',
        password: 'SecurePassword123!',
        initialDepositPaise: 1000000, // ₹10,000.00
      });

      expect(user.id).toBeDefined();
      expect(user.name).toBe('Priya Sharma');
      expect(user.email).toBe('priya@example.com');
      expect(user.role).toBe('USER'); // Always USER on public signup

      expect(account.id).toBeDefined();
      expect(account.user_id).toBe(user.id);
      expect(account.type).toBe('USER_WALLET');
      expect(account.cached_balance).toBe(1000000);

      // Verify double-entry integrity on initial deposit
      const bal = await getAccountBalance(pool, account.id);
      expect(bal.cachedBalancePaise).toBe(1000000);
      expect(bal.verifiedBalancePaise).toBe(1000000);
      expect(bal.isBalanced).toBe(true);

      expect(token).toBeDefined();
    });

    it('prevents duplicate email registrations', async () => {
      await registerUser({
        pool,
        name: 'Aditya',
        email: 'aditya@example.com',
        password: 'Password123!',
      });

      await expect(
        registerUser({
          pool,
          name: 'Aditya Duplicate',
          email: 'aditya@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow(/already exists/i);
    });

    it('rejects passwords shorter than 8 characters', async () => {
      await expect(
        registerUser({
          pool,
          name: 'Short Pass',
          email: 'short@example.com',
          password: '123',
        })
      ).rejects.toThrow(LedgerError);
    });
  });

  describe('User Login', () => {
    it('authenticates valid credentials and retrieves primary wallet', async () => {
      await registerUser({
        pool,
        name: 'Zara Khan',
        email: 'zara@example.com',
        password: 'ValidPassword123!',
        initialDepositPaise: 500000,
      });

      const { user, account, token } = await loginUser({
        pool,
        email: 'zara@example.com',
        password: 'ValidPassword123!',
      });

      expect(user.email).toBe('zara@example.com');
      expect(account.name).toContain('Zara Khan');
      expect(account.cached_balance).toBe(500000);
      expect(token).toBeDefined();
    });

    it('rejects incorrect passwords', async () => {
      await registerUser({
        pool,
        name: 'Zara Khan',
        email: 'zara@example.com',
        password: 'ValidPassword123!',
      });

      await expect(
        loginUser({
          pool,
          email: 'zara@example.com',
          password: 'WrongPassword123!',
        })
      ).rejects.toThrow(LedgerError);
    });

    it('rejects non-existent users', async () => {
      await expect(
        loginUser({
          pool,
          email: 'unknown@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow(LedgerError);
    });
  });
});
