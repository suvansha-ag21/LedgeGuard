export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { getAccountBalance } from '@ledgerguard/core/ledger';
import { 
  jsonResponse, 
  errorResponse, 
  handleOptions, 
  authenticateRequest 
} from '@ledgerguard/core/api';

export async function OPTIONS(request) {
  return handleOptions(request);
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const claims = await authenticateRequest(request);
    const pool = getPool();

    const result = await getAccountBalance(pool, id);

    if (claims.role !== 'ADMIN' && result.account.user_id !== claims.id) {
      return jsonResponse({ error: 'Access denied' }, 403);
    }

    return jsonResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
