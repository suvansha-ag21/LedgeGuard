export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { 
  jsonResponse, 
  errorResponse, 
  handleOptions, 
  authenticateRequest 
} from '@ledgerguard/core/api';

export async function OPTIONS(request) {
  return handleOptions(request);
}

export async function GET(request) {
  try {
    await authenticateRequest(request, ['ADMIN']);
    const pool = getPool();

    const url = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));

    const res = await pool.query(
      `SELECT * FROM reconciliation_runs ORDER BY ran_at DESC LIMIT $1`,
      [limit]
    );

    const runs = res.rows.map((r) => ({
      ...r,
      total_entries_count: Number(r.total_entries_count),
      net_ledger_sum: Number(r.net_ledger_sum),
    }));

    return jsonResponse({ runs });
  } catch (err) {
    return errorResponse(err);
  }
}
