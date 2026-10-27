import { hashPassword, comparePassword, signToken } from './tokens.js';
import { createAccount, deposit } from '../ledger/engine.js';
import { ACCOUNT_TYPES } from '../ledger/constants.js';
import { LedgerError } from '../ledger/errors.js';
import logger from '../logger.js';

/**
 * Registers a new user, hashes their password, and automatically provisions an active wallet.
 * Public registration is strictly restricted to role = 'USER'.
 *
 * @param {object} params
 * @param {import('pg').Pool} params.pool
 * @param {string} params.name
 * @param {string} params.email
 * @param {string} params.password
 * @param {number} [params.initialDepositPaise=1000000] Default ₹10,000 simulated starting funds
 * @returns {Promise<{ user: object, account: object, token: string }>}
 */
export async function registerUser({
  pool,
  name,
  email,
  password,
  initialDepositPaise = 1000000,
}) {
  if (!name || name.trim().length < 2) {
    throw new LedgerError('Name must be at least 2 characters long', 400, 'INVALID_NAME');
  }
  if (!email || !email.includes('@')) {
    throw new LedgerError('Valid email address required', 400, 'INVALID_EMAIL');
  }
  if (!password || password.length < 8) {
    throw new LedgerError('Password must be at least 8 characters long', 400, 'WEAK_PASSWORD');
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if email already registered
  const existingRes = await pool.query(`SELECT id FROM users WHERE email = $1`, [normalizedEmail]);
  if (existingRes.rows.length > 0) {
    throw new LedgerError('An account with this email already exists', 409, 'EMAIL_EXISTS');
  }

  const passwordHash = await hashPassword(password);

  // Enforce role = 'USER' (public registration can never grant admin access)
  const userRole = 'USER';

  const userRes = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name.trim(), normalizedEmail, passwordHash, userRole]
  );
  const user = userRes.rows[0];

  // Automatically provision user wallet
  const account = await createAccount({
    pool,
    userId: user.id,
    name: `${user.name} (Wallet)`,
    type: ACCOUNT_TYPES.USER_WALLET,
    currency: 'INR',
  });

  // Seed initial simulated funds via atomic double-entry deposit if specified
  if (initialDepositPaise > 0) {
    try {
      await deposit({
        pool,
        accountId: account.id,
        amountPaise: initialDepositPaise,
        description: 'Welcome Bonus (Simulated INR)',
      });
      account.cached_balance = initialDepositPaise;
    } catch (err) {
      logger.warn({ err, userId: user.id }, 'Welcome bonus deposit failed; account created with ₹0');
    }
  }

  const token = await signToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accountId: account.id,
  });

  logger.info({ userId: user.id, accountId: account.id }, 'User registered and wallet auto-provisioned');

  return { user, account, token };
}

/**
 * Authenticates a user with email and password.
 *
 * @param {object} params
 * @param {import('pg').Pool} params.pool
 * @param {string} params.email
 * @param {string} params.password
 * @returns {Promise<{ user: object, account: object, token: string }>}
 */
export async function loginUser({ pool, email, password }) {
  const normalizedEmail = (email || '').trim().toLowerCase();

  const userRes = await pool.query(
    `SELECT id, name, email, password_hash, role, created_at 
     FROM users 
     WHERE email = $1`,
    [normalizedEmail]
  );

  if (userRes.rows.length === 0) {
    throw new LedgerError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const user = userRes.rows[0];
  const isValid = await comparePassword(password, user.password_hash);
  if (!isValid) {
    throw new LedgerError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  delete user.password_hash;

  // Retrieve user's primary wallet
  const accRes = await pool.query(
    `SELECT id, name, type, currency, cached_balance, status 
     FROM accounts 
     WHERE user_id = $1 AND type = $2 
     ORDER BY created_at ASC LIMIT 1`,
    [user.id, ACCOUNT_TYPES.USER_WALLET]
  );

  let account = accRes.rows[0] || null;
  if (account) {
    account.cached_balance = Number(account.cached_balance);
  }

  const token = await signToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accountId: account?.id || null,
  });

  return { user, account, token };
}
