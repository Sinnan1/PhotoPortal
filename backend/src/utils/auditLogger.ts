import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuditLogEntry {
  adminId: string;
  action: string;
  targetType: 'user' | 'gallery' | 'photo' | 'system' | 'config' | 'invitation';
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  adminId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogExportOptions {
  startDate: Date;
  endDate: Date;
  format?: 'json' | 'csv';
  adminId?: string;
  targetType?: string;
}

export class AuditLogger {
  /**
   * Log an administrative action
   */
  static async logAction(entry: AuditLogEntry): Promise<void> {
    try {
      // Validate adminId exists in database before logging
      if (entry.adminId === 'unknown' || !entry.adminId) {
        console.warn('Skipping audit log entry with invalid adminId:', entry.adminId);
        return;
      }

      // Check if admin user exists in database
      const adminExists = await prisma.user.findUnique({
        where: { id: entry.adminId },
        select: { id: true }
      });

      if (!adminExists) {
        console.warn('Skipping audit log entry for non-existent admin:', entry.adminId);
        return;
      }

      await prisma.adminAuditLog.create({
        data: {
          adminId: entry.adminId,
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId,
          details: entry.details,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
      // Don't throw error to avoid breaking the main operation
      // In production, you might want to use a more robust logging system
    }
  }

  /**
   * Retrieve audit logs with filtering and pagination
   */
  static async getAuditLogs(filters: AuditLogFilters = {}) {
    const {
      adminId,
      action,
      targetType,
      targetId,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = filters;

    const where: any = {};

    if (adminId) where.adminId = adminId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Search audit logs by action or details content
   */
  static async searchAuditLogs(
    searchTerm: string,
    filters: Omit<AuditLogFilters, 'action'> = {}
  ) {
    const {
      adminId,
      targetType,
      targetId,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = filters;

    const where: any = {
      OR: [
        { action: { contains: searchTerm, mode: 'insensitive' } },
        { targetId: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    if (adminId) where.adminId = adminId;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Export audit logs for compliance and reporting
   */
  static async exportAuditLogs(options: AuditLogExportOptions): Promise<string> {
    const { startDate, endDate, format = 'json', adminId, targetType } = options;

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (adminId) where.adminId = adminId;
    if (targetType) where.targetType = targetType;

    const logs = await prisma.adminAuditLog.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (format === 'csv') {
      return this.convertToCSV(logs);
    }

    return JSON.stringify(logs, null, 2);
  }

  /**
   * Get audit log statistics
   */
  static async getAuditStats(startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalLogs,
      actionStats,
      adminStats,
      targetTypeStats,
    ] = await Promise.all([
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.groupBy({
        by: ['action'],
        where,
        _count: {
          action: true,
        },
        orderBy: {
          _count: {
            action: 'desc',
          },
        },
      }),
      prisma.adminAuditLog.groupBy({
        by: ['adminId'],
        where,
        _count: {
          adminId: true,
        },
        orderBy: {
          _count: {
            adminId: 'desc',
          },
        },
      }),
      prisma.adminAuditLog.groupBy({
        by: ['targetType'],
        where,
        _count: {
          targetType: true,
        },
        orderBy: {
          _count: {
            targetType: 'desc',
          },
        },
      }),
    ]);

    return {
      totalLogs,
      actionStats,
      adminStats,
      targetTypeStats,
    };
  }

  /**
   * Convert audit logs to CSV format
   */
  private static convertToCSV(logs: any[]): string {
    if (logs.length === 0) return '';

    const headers = [
      'ID',
      'Admin ID',
      'Admin Name',
      'Admin Email',
      'Action',
      'Target Type',
      'Target ID',
      'Details',
      'IP Address',
      'User Agent',
      'Created At',
    ];

    const csvRows = [headers.join(',')];

    logs.forEach((log) => {
      const row = [
        log.id,
        log.adminId,
        log.admin.name,
        log.admin.email,
        log.action,
        log.targetType,
        log.targetId || '',
        JSON.stringify(log.details || {}),
        log.ipAddress || '',
        log.userAgent || '',
        log.createdAt.toISOString(),
      ];

      // Escape commas and quotes in CSV
      const escapedRow = row.map((field) => {
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      });

      csvRows.push(escapedRow.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Clean up old audit logs (for maintenance)
   */
  static async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.adminAuditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}