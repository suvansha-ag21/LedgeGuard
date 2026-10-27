export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { comparePassword, signToken } from '@ledgerguard/core/auth';
import { LoginSchema } from '@ledgerguard/core/validation';
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
    const validated = LoginSchema.parse(body);

    const pool = getPool();
    const userRes = await pool.query(
      `SELECT id, name, email, password_hash, role 
       FROM users 
       WHERE email = $1`,
      [validated.email.toLowerCase()]
    );

    if (userRes.rows.length === 0) {
      return jsonResponse({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }, 401);
    }

    const user = userRes.rows[0];
    const isValid = await comparePassword(validated.password, user.password_hash);

    if (!isValid) {
      return jsonResponse({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }, 401);
    }

    // Fetch primary account
    const accRes = await pool.query(
      `SELECT id, name, type, currency, cached_balance, status 
       FROM accounts 
       WHERE user_id = $1 
       ORDER BY created_at ASC 
       LIMIT 1`,
      [user.id]
    );
    const primaryAccount = accRes.rows[0] ? {
      ...accRes.rows[0],
      cached_balance: Number(accRes.rows[0].cached_balance),
    } : null;

    const token = await signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    await recordAuditLog({
      actorId: user.id,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id,
    });

    const isProd = process.env.NODE_ENV === 'production';
    const cookieHeader = `auth_token=${token}; Path=/; HttpOnly; SameSite=${isProd ? 'None' : 'Lax'}; Max-Age=604800${isProd ? '; Secure' : ''}`;

    return jsonResponse(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        account: primaryAccount,
        token,
      },
      200,
      { 'Set-Cookie': cookieHeader }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
