import { getPool } from '@ledgerguard/core/db';
import logger from '@ledgerguard/core/logger';

/**
 * Inserts an immutable audit log entry into audit_logs table.
 *
 * @param {object} params
 * @param {string|null} [params.actorId]
 * @param {string} params.action
 * @param {string} params.entityType
 * @param {string} params.entityId
 * @param {object} [params.details={}]
 * @param {string|null} [params.ipAddress=null]
 */
export async function recordAuditLog({
  actorId = null,
  action,
  entityType,
  entityId,
  details = {},
  ipAddress = null,
}) {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actorId, action, entityType, entityId, JSON.stringify(details), ipAddress]
    );
  } catch (err) {
    logger.error({ err, action, entityId }, 'Failed to record audit log');
  }
}
