import { Response } from 'express';
import { AuditLogger, AuditLogFilters, AuditLogExportOptions } from '../utils/auditLogger';
import { logAdminAction } from '../middleware/auditMiddleware';
import { AdminAuthRequest } from '../middleware/adminAuth';

export class AuditController {
    /**
     * Get audit logs with filtering and pagination
     */
    static async getAuditLogs(req: AdminAuthRequest, res: Response) {
        try {
            const {
                adminId,
                action,
                targetType,
                targetId,
                startDate,
                endDate,
                limit,
                offset,
                page,
                pageSize,
            } = req.query;

            // Handle pagination - support both offset/limit and page/pageSize
            let parsedLimit = 50;
            let parsedOffset = 0;

            if (page && pageSize) {
                const pageNum = parseInt(page as string, 10) || 1;
                const pageSizeNum = parseInt(pageSize as string, 10) || 50;
                parsedLimit = Math.min(pageSizeNum, 100); // Cap at 100 per page
                parsedOffset = (pageNum - 1) * parsedLimit;
            } else {
                parsedLimit = Math.min(parseInt(limit as string, 10) || 50, 100);
                parsedOffset = parseInt(offset as string, 10) || 0;
            }

            const filters: AuditLogFilters = {
                adminId: adminId as string,
                action: action as string,
                targetType: targetType as any,
                targetId: targetId as string,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                limit: parsedLimit,
                offset: parsedOffset,
            };

            const result = await AuditLogger.getAuditLogs(filters);

            // Log the audit log access
            await logAdminAction(
                req,
                'VIEW_AUDIT_LOGS',
                'system',
                undefined,
                {
                    filters,
                    resultCount: result.logs.length,
                }
            );

            res.json({
                success: true,
                data: result.logs,
                pagination: {
                    total: result.total,
                    limit: parsedLimit,
                    offset: parsedOffset,
                    hasMore: result.hasMore,
                    page: Math.floor(parsedOffset / parsedLimit) + 1,
                    totalPages: Math.ceil(result.total / parsedLimit),
                },
            });
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch audit logs',
            });
        }
    }

    /**
     * Search audit logs
     */
    static async searchAuditLogs(req: AdminAuthRequest, res: Response) {
        try {
            const { q: searchTerm } = req.query;

            if (!searchTerm || typeof searchTerm !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'Search term is required',
                });
            }

            const {
                adminId,
                targetType,
                targetId,
                startDate,
                endDate,
                limit,
                offset,
                page,
                pageSize,
            } = req.query;

            // Handle pagination
            let parsedLimit = 50;
            let parsedOffset = 0;

            if (page && pageSize) {
                const pageNum = parseInt(page as string, 10) || 1;
                const pageSizeNum = parseInt(pageSize as string, 10) || 50;
                parsedLimit = Math.min(pageSizeNum, 100);
                parsedOffset = (pageNum - 1) * parsedLimit;
            } else {
                parsedLimit = Math.min(parseInt(limit as string, 10) || 50, 100);
                parsedOffset = parseInt(offset as string, 10) || 0;
            }

            const filters = {
                adminId: adminId as string,
                targetType: targetType as any,
                targetId: targetId as string,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                limit: parsedLimit,
                offset: parsedOffset,
            };

            const result = await AuditLogger.searchAuditLogs(searchTerm, filters);

            // Log the search action
            await logAdminAction(
                req,
                'SEARCH_AUDIT_LOGS',
                'system',
                undefined,
                {
                    searchTerm,
                    filters,
                    resultCount: result.logs.length,
                }
            );

            res.json({
                success: true,
                data: result.logs,
                searchTerm,
                pagination: {
                    total: result.total,
                    limit: parsedLimit,
                    offset: parsedOffset,
                    hasMore: result.hasMore,
                    page: Math.floor(parsedOffset / parsedLimit) + 1,
                    totalPages: Math.ceil(result.total / parsedLimit),
                },
            });
        } catch (error) {
            console.error('Error searching audit logs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to search audit logs',
            });
        }
    }

    /**
     * Export audit logs
     */
    static async exportAuditLogs(req: AdminAuthRequest, res: Response) {
        try {
            const {
                startDate,
                endDate,
                format = 'json',
                adminId,
                targetType,
            } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Start date and end date are required for export',
                });
            }

            const exportOptions: AuditLogExportOptions = {
                startDate: new Date(startDate as string),
                endDate: new Date(endDate as string),
                format: format as 'json' | 'csv',
                adminId: adminId as string,
                targetType: targetType as any,
            };

            const exportData = await AuditLogger.exportAuditLogs(exportOptions);

            // Log the export action
            await logAdminAction(
                req,
                'EXPORT_AUDIT_LOGS',
                'system',
                undefined,
                {
                    exportOptions,
                    dataSize: exportData.length,
                }
            );

            // Set appropriate headers for download
            const filename = `audit_logs_${startDate}_${endDate}.${format}`;
            const contentType = format === 'csv' ? 'text/csv' : 'application/json';

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(exportData);
        } catch (error) {
            console.error('Error exporting audit logs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to export audit logs',
            });
        }
    }

    /**
     * Get audit log statistics
     */
    static async getAuditStats(req: AdminAuthRequest, res: Response) {
        try {
            const { startDate, endDate } = req.query;

            const stats = await AuditLogger.getAuditStats(
                startDate ? new Date(startDate as string) : undefined,
                endDate ? new Date(endDate as string) : undefined
            );

            // Log the stats access
            await logAdminAction(
                req,
                'VIEW_AUDIT_STATS',
                'system',
                undefined,
                {
                    dateRange: { startDate, endDate },
                    totalLogs: stats.totalLogs,
                }
            );

            res.json({
                success: true,
                data: stats,
            });
        } catch (error) {
            console.error('Error fetching audit stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch audit statistics',
            });
        }
    }

    /**
     * Get a specific audit log entry
     */
    static async getAuditLogById(req: AdminAuthRequest, res: Response) {
        try {
            const id = req.params.id as string;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Audit log ID is required',
                });
            }

            const log = await AuditLogger.getAuditLogs({
                limit: 1,
                offset: 0,
            });

            // Find the specific log (this is a simple implementation)
            // In a real scenario, you might want to add a getById method to AuditLogger
            const specificLog = log.logs.find(l => l.id === id);

            if (!specificLog) {
                return res.status(404).json({
                    success: false,
                    error: 'Audit log not found',
                });
            }

            // Log the access to specific audit log
            await logAdminAction(
                req,
                'VIEW_AUDIT_LOG_DETAIL',
                'system',
                id,
                {
                    auditLogId: id,
                }
            );

            res.json({
                success: true,
                data: specificLog,
            });
        } catch (error) {
            console.error('Error fetching audit log:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch audit log',
            });
        }
    }

    /**
     * Clean up old audit logs (maintenance endpoint)
     */
    static async cleanupOldLogs(req: AdminAuthRequest, res: Response) {
        try {
            const { retentionDays = 365 } = req.query;
            const days = parseInt(retentionDays as string, 10);

            if (days < 30) {
                return res.status(400).json({
                    success: false,
                    error: 'Retention period must be at least 30 days',
                });
            }

            const deletedCount = await AuditLogger.cleanupOldLogs(days);

            // Log the cleanup action
            await logAdminAction(
                req,
                'CLEANUP_AUDIT_LOGS',
                'system',
                undefined,
                {
                    retentionDays: days,
                    deletedCount,
                }
            );

            res.json({
                success: true,
                data: {
                    deletedCount,
                    retentionDays: days,
                },
            });
        } catch (error) {
            console.error('Error cleaning up audit logs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to cleanup audit logs',
            });
        }
    }
}