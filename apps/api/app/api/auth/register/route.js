export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { hashPassword, signToken } from '@ledgerguard/core/auth';
import { RegisterSchema } from '@ledgerguard/core/validation';
import { createAccount } from '@ledgerguard/core/ledger';
import { 
  jsonResponse, 
  errorResponse, 
  handleOptions, 
  checkRateLimit 
} from '@ledgerguard/core/api';
import { recordAuditLog } from '@ledgerguard/core/api';

export async function OPTIONS(request) {
  return handleOptions(request);
}

export async function POST(request) {
  try {
    checkRateLimit(request);
    const body = await request.json();
    const validated = RegisterSchema.parse(body);

    const pool = getPool();

    // Check existing email
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [validated.email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return jsonResponse({ error: 'Email already registered', code: 'EMAIL_ALREADY_EXISTS' }, 400);
    }

    const passwordHash = await hashPassword(validated.password);

    // Create user record
    const userRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [validated.name, validated.email.toLowerCase(), passwordHash, validated.role]
    );
    const user = userRes.rows[0];

    // Automatically create a default wallet account for the user
    const defaultAccount = await createAccount({
      pool,
      userId: user.id,
      name: `${user.name}'s Primary Wallet`,
      type: 'USER_WALLET',
    });

    // Record audit log
    await recordAuditLog({
      actorId: user.id,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: user.id,
      details: { email: user.email, role: user.role, accountId: defaultAccount.id },
    });

    const token = await signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // Set cookie
    const isProd = process.env.NODE_ENV === 'production';
    const cookieHeader = `auth_token=${token}; Path=/; HttpOnly; SameSite=${isProd ? 'None' : 'Lax'}; Max-Age=604800${isProd ? '; Secure' : ''}`;

    return jsonResponse(
      {
        user,
        account: defaultAccount,
        token,
      },
      201,
      { 'Set-Cookie': cookieHeader }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
