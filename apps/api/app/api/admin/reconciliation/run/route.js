export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPool } from '@ledgerguard/core/db';
import { runReconciliationAudit } from '@ledgerguard/core/ledger';
import { 
  jsonResponse, 
  errorResponse, 
  handleOptions, 
  authenticateRequest 
} from '@ledgerguard/core/api';
import { recordAuditLog } from '@ledgerguard/core/api';

export async function OPTIONS(request) {
  return handleOptions(request);
}

export async function POST(request) {
  try {
    const claims = await authenticateRequest(request, ['ADMIN']);
    const pool = getPool();

    const auditResult = await runReconciliationAudit(pool);

    await recordAuditLog({
      actorId: claims.id,
      action: 'RECONCILIATION_RUN_TRIGGERED',
      entityType: 'RECONCILIATION_RUN',
      entityId: auditResult.id,
      details: { status: auditResult.status, mismatchesCount: auditResult.mismatches?.length || 0 },
    });

    return jsonResponse({
      message: 'Reconciliation audit completed successfully',
      result: auditResult,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
