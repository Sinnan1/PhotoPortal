import express from 'express';
import { AuditController } from '../controllers/auditController';
import { authenticateAdmin } from '../middleware/adminAuth';
import { auditSystemAction } from '../middleware/auditMiddleware';

const router = express.Router();

// All audit routes require admin authentication
router.use(authenticateAdmin);

/**
 * GET /api/admin/audit/logs
 * Get audit logs with filtering and pagination
 * Query parameters:
 * - adminId: Filter by admin ID
 * - action: Filter by action (partial match)
 * - targetType: Filter by target type
 * - targetId: Filter by target ID
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * - limit: Number of results per page (max 100)
 * - offset: Offset for pagination
 * - page: Page number (alternative to offset)
 * - pageSize: Page size (alternative to limit)
 */
router.get('/logs', AuditController.getAuditLogs);

/**
 * GET /api/admin/audit/search
 * Search audit logs by action or target ID
 * Query parameters:
 * - q: Search term (required)
 * - adminId: Filter by admin ID
 * - targetType: Filter by target type
 * - targetId: Filter by target ID
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * - limit: Number of results per page (max 100)
 * - offset: Offset for pagination
 * - page: Page number (alternative to offset)
 * - pageSize: Page size (alternative to limit)
 */
router.get('/search', AuditController.searchAuditLogs);

/**
 * GET /api/admin/audit/export
 * Export audit logs for compliance and reporting
 * Query parameters:
 * - startDate: Start date for export (required, ISO string)
 * - endDate: End date for export (required, ISO string)
 * - format: Export format ('json' or 'csv', default: 'json')
 * - adminId: Filter by admin ID
 * - targetType: Filter by target type
 */
router.get('/export', 
  auditSystemAction('EXPORT_AUDIT_LOGS'),
  AuditController.exportAuditLogs
);

/**
 * GET /api/admin/audit/stats
 * Get audit log statistics
 * Query parameters:
 * - startDate: Start date for stats (ISO string)
 * - endDate: End date for stats (ISO string)
 */
router.get('/stats', AuditController.getAuditStats);

/**
 * GET /api/admin/audit/logs/:id
 * Get a specific audit log entry by ID
 */
router.get('/logs/:id', AuditController.getAuditLogById);

/**
 * DELETE /api/admin/audit/cleanup
 * Clean up old audit logs (maintenance endpoint)
 * Query parameters:
 * - retentionDays: Number of days to retain logs (default: 365, minimum: 30)
 */
router.delete('/cleanup',
  auditSystemAction('CLEANUP_AUDIT_LOGS'),
  AuditController.cleanupOldLogs
);

export default router;