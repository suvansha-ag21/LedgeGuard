export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { jsonResponse, handleOptions } from '@ledgerguard/core/api';

export async function OPTIONS(request) {
  return handleOptions(request);
}

export async function POST() {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieHeader = `auth_token=; Path=/; HttpOnly; SameSite=${isProd ? 'None' : 'Lax'}; Max-Age=0${isProd ? '; Secure' : ''}`;
  return jsonResponse({ message: 'Logged out successfully' }, 200, { 'Set-Cookie': cookieHeader });
}
