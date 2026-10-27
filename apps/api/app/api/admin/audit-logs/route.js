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
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '30', 10)));
    const offset = (page - 1) * limit;

    const action = url.searchParams.get('action');
    const entityType = url.searchParams.get('entityType');

    let whereClauses = [];
    let queryParams = [];

    if (action) {
      queryParams.push(action);
      whereClauses.push(`al.action = $${queryParams.length}`);
    }

    if (entityType) {
      queryParams.push(entityType);
      whereClauses.push(`al.entity_type = $${queryParams.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await pool.query(`SELECT COUNT(*) FROM audit_logs al ${whereSql}`, queryParams);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const logsRes = await pool.query(
      `SELECT al.*, u.name as actor_name, u.email as actor_email 
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_id = u.id
       ${whereSql}
       ORDER BY al.created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    return jsonResponse({
      logs: logsRes.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
