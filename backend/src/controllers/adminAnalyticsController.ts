import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AdminAuthRequest } from '../middleware/adminAuth'
import { logAdminAction } from '../middleware/auditMiddleware'

const prisma = new PrismaClient()

/**
 * Interface for system statistics
 */
interface SystemStatistics {
  totalUsers: number
  activeUsers: number
  totalGalleries: number
  totalPhotos: number
  storageUsed: number
  storageLimit: number
  monthlyUploads: number
  monthlyDownloads: number
  systemUptime: number
  errorRate: number
}

/**
 * Interface for user analytics
 */
interface UserAnalytics {
  totalUsers: number
  activeUsers: number
  newUsers: number
  usersByRole: Record<string, number>
  userActivity: {
    logins: number
    uploads: number
    downloads: number
  }
  topUsers: Array<{
    id: string
    name: string
    email: string
    role: string
    activityScore: number
  }>
}

/**
 * Interface for storage analytics
 */
interface StorageAnalytics {
  totalStorage: number
  storageByType: Record<string, number>
  storageByUser: Array<{
    userId: string
    userName: string
    storageUsed: number
    photoCount: number
  }>
  storageGrowth: Array<{
    date: string
    totalStorage: number
    newStorage: number
  }>
}

/**
 * Interface for security logs
 */
interface SecurityLog {
  id: string
  eventType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  userId?: string
  userName?: string
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  details?: Record<string, any>
}

/**
 * Get comprehensive system statistics
 * Requirements: 4.1 - Display key metrics including user counts, gallery statistics, and storage usage
 */
export const getSystemStats = async (req: AdminAuthRequest, res: Response) => {
  try {
    const adminId = req.admin!.id

    // Get current date ranges
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // Get basic counts
    const [
      totalUsers,
      activeUsers,
      totalGalleries,
      totalPhotos,
      monthlyUploads,
      storageStats,
      downloadStats
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users (not suspended)
      prisma.user.count({
        where: { suspendedAt: null }
      }),
      
      // Total galleries
      prisma.gallery.count(),
      
      // Total photos
      prisma.photo.count(),
      
      // Monthly uploads (photos created this month)
      prisma.photo.count({
        where: {
          createdAt: { gte: monthStart }
        }
      }),
      
      // Storage statistics
      prisma.$queryRaw`
        SELECT 
          SUM(file_size) as total_storage,
          COUNT(*) as photo_count,
          AVG(file_size) as avg_file_size
        FROM photos
      ` as Promise<any[]>,
      
      // Download statistics for this month
      prisma.$queryRaw`
        SELECT 
          SUM(download_count) as total_downloads
        FROM photos p
        WHERE p.created_at >= ${monthStart}
      ` as Promise<any[]>
    ])

    // Calculate system uptime
    const systemUptime = Math.floor(process.uptime())

    // Get storage limit from system config (default 100GB if not set)
    const storageConfig = await prisma.systemConfig.findUnique({
      where: { configKey: 'storage_limit' }
    })
    const storageLimit = storageConfig ? 
      (storageConfig.configValue as any).bytes : 
      100 * 1024 * 1024 * 1024 // 100GB default

    // Calculate error rate (from recent audit logs)
    const recentErrors = await prisma.adminAuditLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        action: { contains: 'ERROR' }
      }
    })
    const totalRecentActions = await prisma.adminAuditLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })
    const errorRate = totalRecentActions > 0 ? (recentErrors / totalRecentActions) * 100 : 0

    const systemStats: SystemStatistics = {
      totalUsers,
      activeUsers,
      totalGalleries,
      totalPhotos,
      storageUsed: Number(storageStats[0]?.total_storage || 0),
      storageLimit,
      monthlyUploads,
      monthlyDownloads: Number(downloadStats[0]?.total_downloads || 0),
      systemUptime,
      errorRate
    }

    // Log admin action
    await logAdminAction(
      req,
      'VIEW_SYSTEM_STATISTICS',
      'system',
      undefined,
      { 
        totalUsers,
        totalGalleries,
        storageUsed: systemStats.storageUsed,
        storageUtilization: (systemStats.storageUsed / storageLimit) * 100
      }
    )

    res.json({
      success: true,
      data: systemStats
    })
  } catch (error) {
    console.error('Get system stats error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system statistics'
    })
  }
}/**
 * Ge
t user analytics with time-based filtering
 * Requirements: 4.2 - Show user engagement, upload patterns, and download statistics over time
 */
export const getUserAnalytics = async (req: AdminAuthRequest, res: Response) => {
  try {
    const adminId = req.admin!.id
    const { timeRange = '30d' } = req.query

    // Calculate date range
    let startDate: Date
    switch (timeRange) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get user statistics
    const [
      totalUsers,
      activeUsers,
      newUsers,
      usersByRole,
      userActivity,
      topActiveUsers
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users (not suspended)
      prisma.user.count({
        where: { suspendedAt: null }
      }),
      
      // New users in time range
      prisma.user.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),
      
      // Users by role
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      }),
      
      // User activity from audit logs
      prisma.adminAuditLog.groupBy({
        by: ['action'],
        where: {
          createdAt: { gte: startDate },
          targetType: { in: ['user', 'gallery', 'photo'] }
        },
        _count: { action: true }
      }),
      
      // Top active users (by gallery and photo activity)
      prisma.user.findMany({
        where: {
          role: 'PHOTOGRAPHER',
          suspendedAt: null
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          galleries: {
            where: {
              createdAt: { gte: startDate }
            },
            select: { id: true }
          },
          _count: {
            select: {
              galleries: true
            }
          }
        },
        orderBy: {
          galleries: {
            _count: 'desc'
          }
        },
        take: 10
      })
    ])

    // Calculate activity metrics
    const loginActivity = userActivity.find(a => a.action.includes('LOGIN'))?._count.action || 0
    const uploadActivity = userActivity.find(a => a.action.includes('UPLOAD'))?._count.action || 0
    const downloadActivity = userActivity.find(a => a.action.includes('DOWNLOAD'))?._count.action || 0

    // Format role statistics
    const roleStats = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.role
      return acc
    }, {} as Record<string, number>)

    // Calculate activity scores for top users
    const topUsers = await Promise.all(
      topActiveUsers.map(async (user) => {
        const photoCount = await prisma.photo.count({
          where: {
            folder: {
              gallery: {
                photographerId: user.id
              }
            },
            createdAt: { gte: startDate }
          }
        })

        const activityScore = user.galleries.length * 10 + photoCount
        
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          activityScore
        }
      })
    )

    const analytics: UserAnalytics = {
      totalUsers,
      activeUsers,
      newUsers,
      usersByRole: roleStats,
      userActivity: {
        logins: loginActivity,
        uploads: uploadActivity,
        downloads: downloadActivity
      },
      topUsers: topUsers.sort((a, b) => b.activityScore - a.activityScore)
    }

    // Log admin action
    await logAdminAction(
      req,
      'VIEW_USER_ANALYTICS',
      'system',
      undefined,
      { timeRange, totalUsers, newUsers }
    )

    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    console.error('Get user analytics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user analytics'
    })
  }
}

/**
 * Get storage usage tracking and reporting
 * Requirements: 4.3 - Display server performance, error rates, and uptime statistics
 */
export const getStorageAnalytics = async (req: AdminAuthRequest, res: Response) => {
  try {
    const adminId = req.admin!.id
    const { timeRange = '30d' } = req.query

    // Calculate date range
    let startDate: Date
    switch (timeRange) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get total storage statistics
    const totalStorageStats = await prisma.$queryRaw`
      SELECT 
        SUM(file_size) as total_storage,
        COUNT(*) as total_photos,
        AVG(file_size) as avg_file_size
      FROM photos
    ` as any[]

    // Get storage by file type (based on filename extensions)
    const storageByType = await prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN filename ILIKE '%.jpg' OR filename ILIKE '%.jpeg' THEN 'JPEG'
          WHEN filename ILIKE '%.png' THEN 'PNG'
          WHEN filename ILIKE '%.webp' THEN 'WEBP'
          WHEN filename ILIKE '%.tiff' OR filename ILIKE '%.tif' THEN 'TIFF'
          WHEN filename ILIKE '%.cr2' OR filename ILIKE '%.cr3' THEN 'Canon RAW'
          WHEN filename ILIKE '%.nef' THEN 'Nikon RAW'
          WHEN filename ILIKE '%.arw' THEN 'Sony RAW'
          WHEN filename ILIKE '%.dng' THEN 'DNG RAW'
          ELSE 'Other'
        END as file_type,
        SUM(file_size) as total_size,
        COUNT(*) as file_count
      FROM photos
      GROUP BY file_type
      ORDER BY total_size DESC
    ` as any[]

    // Get storage by user (photographers)
    const storageByUser = await prisma.$queryRaw`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        SUM(p.file_size) as storage_used,
        COUNT(p.id) as photo_count
      FROM users u
      JOIN galleries g ON u.id = g.photographer_id
      JOIN folders f ON g.id = f.gallery_id
      JOIN photos p ON f.id = p.folder_id
      WHERE u.role = 'PHOTOGRAPHER'
      GROUP BY u.id, u.name, u.email
      ORDER BY storage_used DESC
      LIMIT 20
    ` as any[]

    // Get storage growth over time
    const storageGrowth = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        SUM(file_size) as new_storage,
        COUNT(*) as new_photos
      FROM photos
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    ` as any[]

    // Calculate cumulative storage for growth chart
    let cumulativeStorage = 0
    const storageGrowthWithCumulative = storageGrowth.map((day: any) => {
      cumulativeStorage += Number(day.new_storage)
      return {
        date: day.date,
        totalStorage: cumulativeStorage,
        newStorage: Number(day.new_storage)
      }
    })

    // Format storage by type
    const storageByTypeFormatted = storageByType.reduce((acc: any, item: any) => {
      acc[item.file_type] = Number(item.total_size)
      return acc
    }, {})

    const analytics: StorageAnalytics = {
      totalStorage: Number(totalStorageStats[0]?.total_storage || 0),
      storageByType: storageByTypeFormatted,
      storageByUser: storageByUser.map((user: any) => ({
        userId: user.user_id,
        userName: user.user_name,
        storageUsed: Number(user.storage_used),
        photoCount: Number(user.photo_count)
      })),
      storageGrowth: storageGrowthWithCumulative
    }

    // Log admin action
    await logAdminAction(
      req,
      'VIEW_STORAGE_ANALYTICS',
      'system',
      undefined,
      { 
        timeRange, 
        totalStorage: analytics.totalStorage,
        topUserStorage: analytics.storageByUser[0]?.storageUsed || 0
      }
    )

    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    console.error('Get storage analytics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve storage analytics'
    })
  }
}

/**
 * Get system health monitoring and performance metrics
 * Requirements: 4.4 - Implement system health monitoring and performance metrics
 */
export const getSystemHealth = async (req: AdminAuthRequest, res: Response) => {
  try {
    const adminId = req.admin!.id

    // Get system performance metrics
    const memoryUsage = process.memoryUsage()
    const systemUptime = process.uptime()
    const cpuUsage = process.cpuUsage()

    // Get database performance metrics
    const dbStartTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbResponseTime = Date.now() - dbStartTime

    // Get recent error rates
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [totalActions, errorActions] = await Promise.all([
      prisma.adminAuditLog.count({
        where: { createdAt: { gte: last24Hours } }
      }),
      prisma.adminAuditLog.count({
        where: {
          createdAt: { gte: last24Hours },
          action: { contains: 'ERROR' }
        }
      })
    ])

    const errorRate = totalActions > 0 ? (errorActions / totalActions) * 100 : 0

    // Get storage health
    const storageStats = await prisma.$queryRaw`
      SELECT 
        SUM(file_size) as total_storage,
        COUNT(*) as total_files
      FROM photos
    ` as any[]

    const totalStorage = Number(storageStats[0]?.total_storage || 0)
    const storageConfig = await prisma.systemConfig.findUnique({
      where: { configKey: 'storage_limit' }
    })
    const storageLimit = storageConfig ? 
      (storageConfig.configValue as any).bytes : 
      100 * 1024 * 1024 * 1024 // 100GB default

    const storageUtilization = (totalStorage / storageLimit) * 100

    // Get active sessions count
    const activeSessions = await prisma.adminSession.count({
      where: {
        expiresAt: { gt: new Date() }
      }
    })

    // Get recent upload performance
    const recentUploads = await prisma.photo.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
      }
    })

    const healthMetrics = {
      system: {
        uptime: Math.floor(systemUptime),
        uptimeFormatted: `${Math.floor(systemUptime / 3600)}h ${Math.floor((systemUptime % 3600) / 60)}m`,
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          unit: 'MB'
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      },
      database: {
        responseTime: dbResponseTime,
        status: dbResponseTime < 100 ? 'excellent' : 
                dbResponseTime < 500 ? 'good' : 
                dbResponseTime < 1000 ? 'fair' : 'poor'
      },
      storage: {
        totalUsed: totalStorage,
        totalLimit: storageLimit,
        utilizationPercent: storageUtilization,
        status: storageUtilization < 70 ? 'healthy' : 
                storageUtilization < 85 ? 'warning' : 'critical'
      },
      performance: {
        errorRate,
        errorRateStatus: errorRate < 1 ? 'excellent' : 
                        errorRate < 5 ? 'good' : 
                        errorRate < 10 ? 'warning' : 'critical',
        activeSessions,
        recentUploads,
        uploadsPerHour: recentUploads
      },
      alerts: [] as any[]
    }

    // Generate alerts based on thresholds
    const alerts: any[] = []
    
    if (storageUtilization > 85) {
      alerts.push({
        type: 'storage',
        severity: 'CRITICAL',
        message: `Storage utilization is at ${storageUtilization.toFixed(1)}%`,
        action: 'Consider increasing storage limit or cleaning up old files'
      })
    } else if (storageUtilization > 70) {
      alerts.push({
        type: 'storage',
        severity: 'MEDIUM',
        message: `Storage utilization is at ${storageUtilization.toFixed(1)}%`,
        action: 'Monitor storage usage closely'
      })
    }

    if (errorRate > 10) {
      alerts.push({
        type: 'errors',
        severity: 'HIGH',
        message: `Error rate is ${errorRate.toFixed(1)}% in the last 24 hours`,
        action: 'Review error logs and investigate issues'
      })
    } else if (errorRate > 5) {
      alerts.push({
        type: 'errors',
        severity: 'MEDIUM',
        message: `Error rate is ${errorRate.toFixed(1)}% in the last 24 hours`,
        action: 'Monitor error patterns'
      })
    }

    if (dbResponseTime > 1000) {
      alerts.push({
        type: 'database',
        severity: 'HIGH',
        message: `Database response time is ${dbResponseTime}ms`,
        action: 'Check database performance and optimize queries'
      })
    }

    if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
      alerts.push({
        type: 'memory',
        severity: 'HIGH',
        message: 'Memory usage is above 90%',
        action: 'Consider restarting the application or increasing memory allocation'
      })
    }

    healthMetrics.alerts = alerts as any[]

    // Log admin action
    await logAdminAction(
      req,
      'VIEW_SYSTEM_HEALTH',
      'system',
      undefined,
      { 
        storageUtilization,
        errorRate,
        dbResponseTime,
        alertCount: alerts.length
      }
    )

    res.json({
      success: true,
      data: healthMetrics
    })
  } catch (error) {
    console.error('Get system health error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system health metrics'
    })
  }
}/**
 * G
et security event logging and suspicious activity detection
 * Requirements: 4.5 - Log and alert admins about suspicious activities or failed login attempts
 */
export const getSecurityLogs = async (req: AdminAuthRequest, res: Response) => {
  try {
    const adminId = req.admin!.id
    const { 
      timeRange = '7d',
      severity,
      eventType,
      page = 1,
      limit = 50
    } = req.query as any

    // Calculate date range
    let startDate: Date
    switch (timeRange) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }

    // Build where clause for security events
    const where: any = {
      createdAt: { gte: startDate },
      OR: [
        { action: { contains: 'LOGIN_FAILED' } },
        { action: { contains: 'UNAUTHORIZED' } },
        { action: { contains: 'SUSPICIOUS' } },
        { action: { contains: 'SECURITY' } },
        { action: { contains: 'ERROR' } },
        { action: { contains: 'DELETE' } },
        { action: { contains: 'SUSPEND' } },
        { action: { contains: 'ROLE_CHANGE' } }
      ]
    }

    if (eventType) {
      where.action = { contains: eventType.toUpperCase() }
    }

    const skip = (Number(page) - 1) * Number(limit)

    // Get security events from audit logs
    const [securityEvents, totalCount] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        include: {
          admin: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.adminAuditLog.count({ where })
    ])

    // Transform to security log format with severity assessment
    const securityLogs: SecurityLog[] = securityEvents.map(event => {
      let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
      let eventTypeFormatted = 'GENERAL'

      // Determine severity and event type based on action
      if (event.action.includes('LOGIN_FAILED')) {
        eventTypeFormatted = 'FAILED_LOGIN'
        severity = 'MEDIUM'
      } else if (event.action.includes('UNAUTHORIZED')) {
        eventTypeFormatted = 'UNAUTHORIZED_ACCESS'
        severity = 'HIGH'
      } else if (event.action.includes('DELETE')) {
        eventTypeFormatted = 'DATA_DELETION'
        severity = 'HIGH'
      } else if (event.action.includes('SUSPEND')) {
        eventTypeFormatted = 'USER_SUSPENSION'
        severity = 'MEDIUM'
      } else if (event.action.includes('ROLE_CHANGE')) {
        eventTypeFormatted = 'PRIVILEGE_CHANGE'
        severity = 'HIGH'
      } else if (event.action.includes('ERROR')) {
        eventTypeFormatted = 'SYSTEM_ERROR'
        severity = 'MEDIUM'
      } else if (event.action.includes('SUSPICIOUS')) {
        eventTypeFormatted = 'SUSPICIOUS_ACTIVITY'
        severity = 'CRITICAL'
      }

      // Filter by severity if specified
      if (severity && severity !== severity) {
        return null
      }

      return {
        id: event.id,
        eventType: eventTypeFormatted,
        severity,
        description: event.action,
        userId: event.adminId,
        userName: event.admin?.name || 'Unknown',
        ipAddress: event.ipAddress || undefined,
        userAgent: event.userAgent || undefined,
        timestamp: event.createdAt,
        details: event.details as Record<string, any> || {}
      }
    }).filter(Boolean) as SecurityLog[]

    // Get security statistics
    const securityStats = await Promise.all([
      // Failed login attempts
      prisma.adminAuditLog.count({
        where: {
          createdAt: { gte: startDate },
          action: { contains: 'LOGIN_FAILED' }
        }
      }),
      
      // Unauthorized access attempts
      prisma.adminAuditLog.count({
        where: {
          createdAt: { gte: startDate },
          action: { contains: 'UNAUTHORIZED' }
        }
      }),
      
      // User suspensions
      prisma.adminAuditLog.count({
        where: {
          createdAt: { gte: startDate },
          action: { contains: 'SUSPEND' }
        }
      }),
      
      // Data deletions
      prisma.adminAuditLog.count({
        where: {
          createdAt: { gte: startDate },
          action: { contains: 'DELETE' }
        }
      })
    ])

    // Detect suspicious patterns
    const suspiciousPatterns = await detectSuspiciousActivity(startDate)

    const response = {
      logs: securityLogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / Number(limit))
      },
      statistics: {
        failedLogins: securityStats[0],
        unauthorizedAccess: securityStats[1],
        userSuspensions: securityStats[2],
        dataDeletions: securityStats[3]
      },
      suspiciousPatterns,
      timeRange
    }

    // Log admin action
    await logAdminAction(
      req,
      'VIEW_SECURITY_LOGS',
      'system',
      undefined,
      { 
        timeRange,
        totalEvents: totalCount,
        suspiciousPatterns: suspiciousPatterns.length
      }
    )

    res.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('Get security logs error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security logs'
    })
  }
}

/**
 * Detect suspicious activity patterns
 */
async function detectSuspiciousActivity(startDate: Date) {
  const patterns = []

  try {
    // Pattern 1: Multiple failed login attempts from same IP
    const failedLoginsByIP = await prisma.$queryRaw`
      SELECT 
        ip_address,
        COUNT(*) as attempt_count,
        MIN(created_at) as first_attempt,
        MAX(created_at) as last_attempt
      FROM admin_audit_logs
      WHERE created_at >= ${startDate}
        AND action LIKE '%LOGIN_FAILED%'
        AND ip_address IS NOT NULL
      GROUP BY ip_address
      HAVING COUNT(*) >= 5
      ORDER BY attempt_count DESC
    ` as any[]

    failedLoginsByIP.forEach((pattern: any) => {
      patterns.push({
        type: 'MULTIPLE_FAILED_LOGINS',
        severity: 'HIGH',
        description: `${pattern.attempt_count} failed login attempts from IP ${pattern.ip_address}`,
        details: {
          ipAddress: pattern.ip_address,
          attemptCount: Number(pattern.attempt_count),
          timeSpan: pattern.last_attempt - pattern.first_attempt
        }
      })
    })

    // Pattern 2: Rapid successive admin actions
    const rapidActions = await prisma.$queryRaw`
      SELECT 
        admin_id,
        COUNT(*) as action_count,
        MIN(created_at) as first_action,
        MAX(created_at) as last_action
      FROM admin_audit_logs
      WHERE created_at >= ${startDate}
      GROUP BY admin_id
      HAVING COUNT(*) >= 50 
        AND EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) < 3600
      ORDER BY action_count DESC
    ` as any[]

    for (const pattern of rapidActions) {
      const admin = await prisma.user.findUnique({
        where: { id: pattern.admin_id },
        select: { name: true, email: true }
      })

      patterns.push({
        type: 'RAPID_ADMIN_ACTIONS',
        severity: 'MEDIUM',
        description: `${pattern.action_count} admin actions in short time by ${admin?.name || 'Unknown'}`,
        details: {
          adminId: pattern.admin_id,
          adminName: admin?.name,
          actionCount: Number(pattern.action_count),
          timeSpan: pattern.last_action - pattern.first_action
        }
      })
    }

    // Pattern 3: Unusual deletion activity
    const massiveDeletions = await prisma.$queryRaw`
      SELECT 
        admin_id,
        COUNT(*) as deletion_count,
        MIN(created_at) as first_deletion,
        MAX(created_at) as last_deletion
      FROM admin_audit_logs
      WHERE created_at >= ${startDate}
        AND action LIKE '%DELETE%'
      GROUP BY admin_id
      HAVING COUNT(*) >= 10
      ORDER BY deletion_count DESC
    ` as any[]

    for (const pattern of massiveDeletions) {
      const admin = await prisma.user.findUnique({
        where: { id: pattern.admin_id },
        select: { name: true, email: true }
      })

      patterns.push({
        type: 'MASSIVE_DELETIONS',
        severity: 'CRITICAL',
        description: `${pattern.deletion_count} deletion actions by ${admin?.name || 'Unknown'}`,
        details: {
          adminId: pattern.admin_id,
          adminName: admin?.name,
          deletionCount: Number(pattern.deletion_count),
          timeSpan: pattern.last_deletion - pattern.first_deletion
        }
      })
    }

  } catch (error) {
    console.error('Error detecting suspicious patterns:', error)
  }

  return patterns
}

/**
 * Get automated alert system for system limits and security events
 * Requirements: 4.6 - Add automated alert system for system limits and security events
 */
export const getSystemAlerts = async (req: AdminAuthRequest, res: Response) => {
  try {
    const adminId = req.admin!.id
    const { severity, type, page = 1, limit = 20 } = req.query as any

    const alerts = []

    // Check storage alerts
    const storageStats = await prisma.$queryRaw`
      SELECT SUM(file_size) as total_storage
      FROM photos
    ` as any[]

    const totalStorage = Number(storageStats[0]?.total_storage || 0)
    const storageConfig = await prisma.systemConfig.findUnique({
      where: { configKey: 'storage_limit' }
    })
    const storageLimit = storageConfig ? 
      (storageConfig.configValue as any).bytes : 
      100 * 1024 * 1024 * 1024 // 100GB default

    const storageUtilization = (totalStorage / storageLimit) * 100

    if (storageUtilization > 90) {
      alerts.push({
        id: 'storage-critical',
        type: 'STORAGE',
        severity: 'CRITICAL',
        title: 'Storage Critical',
        message: `Storage utilization is at ${storageUtilization.toFixed(1)}%`,
        action: 'Immediate action required: Clean up files or increase storage limit',
        timestamp: new Date(),
        resolved: false
      })
    } else if (storageUtilization > 80) {
      alerts.push({
        id: 'storage-warning',
        type: 'STORAGE',
        severity: 'HIGH',
        title: 'Storage Warning',
        message: `Storage utilization is at ${storageUtilization.toFixed(1)}%`,
        action: 'Consider cleaning up old files or increasing storage limit',
        timestamp: new Date(),
        resolved: false
      })
    }

    // Check user limit alerts
    const userCount = await prisma.user.count()
    const userLimitConfig = await prisma.systemConfig.findUnique({
      where: { configKey: 'user_limit' }
    })
    const userLimit = userLimitConfig ? 
      (userLimitConfig.configValue as any).limit : 
      1000 // Default limit

    if (userCount > userLimit * 0.9) {
      alerts.push({
        id: 'user-limit-warning',
        type: 'USER_LIMIT',
        severity: userCount > userLimit ? 'CRITICAL' : 'HIGH',
        title: userCount > userLimit ? 'User Limit Exceeded' : 'User Limit Warning',
        message: `Current users: ${userCount}, Limit: ${userLimit}`,
        action: userCount > userLimit ? 
          'Immediate action: Increase user limit or remove inactive users' :
          'Consider increasing user limit soon',
        timestamp: new Date(),
        resolved: false
      })
    }

    // Check security alerts
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const failedLogins = await prisma.adminAuditLog.count({
      where: {
        createdAt: { gte: last24Hours },
        action: { contains: 'LOGIN_FAILED' }
      }
    })

    if (failedLogins > 20) {
      alerts.push({
        id: 'security-failed-logins',
        type: 'SECURITY',
        severity: failedLogins > 50 ? 'CRITICAL' : 'HIGH',
        title: 'Multiple Failed Login Attempts',
        message: `${failedLogins} failed login attempts in the last 24 hours`,
        action: 'Review security logs and consider implementing additional security measures',
        timestamp: new Date(),
        resolved: false
      })
    }

    // Check system performance alerts
    const memoryUsage = process.memoryUsage()
    const memoryUtilization = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100

    if (memoryUtilization > 90) {
      alerts.push({
        id: 'performance-memory',
        type: 'PERFORMANCE',
        severity: 'HIGH',
        title: 'High Memory Usage',
        message: `Memory utilization is at ${memoryUtilization.toFixed(1)}%`,
        action: 'Consider restarting the application or investigating memory leaks',
        timestamp: new Date(),
        resolved: false
      })
    }

    // Check error rate alerts
    const totalActions = await prisma.adminAuditLog.count({
      where: { createdAt: { gte: last24Hours } }
    })
    const errorActions = await prisma.adminAuditLog.count({
      where: {
        createdAt: { gte: last24Hours },
        action: { contains: 'ERROR' }
      }
    })

    const errorRate = totalActions > 0 ? (errorActions / totalActions) * 100 : 0

    if (errorRate > 10) {
      alerts.push({
        id: 'performance-errors',
        type: 'PERFORMANCE',
        severity: errorRate > 20 ? 'CRITICAL' : 'HIGH',
        title: 'High Error Rate',
        message: `Error rate is ${errorRate.toFixed(1)}% in the last 24 hours`,
        action: 'Investigate error logs and fix underlying issues',
        timestamp: new Date(),
        resolved: false
      })
    }

    // Filter alerts by type and severity if specified
    let filteredAlerts = alerts
    if (type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === type.toUpperCase())
    }
    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity.toUpperCase())
    }

    // Apply pagination
    const skip = (Number(page) - 1) * Number(limit)
    const paginatedAlerts = filteredAlerts.slice(skip, skip + Number(limit))

    // Log admin action
    await logAdminAction(
      req,
      'VIEW_SYSTEM_ALERTS',
      'system',
      undefined,
      { 
        totalAlerts: filteredAlerts.length,
        criticalAlerts: filteredAlerts.filter(a => a.severity === 'CRITICAL').length,
        filters: { type, severity }
      }
    )

    res.json({
      success: true,
      data: {
        alerts: paginatedAlerts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: filteredAlerts.length,
          pages: Math.ceil(filteredAlerts.length / Number(limit))
        },
        summary: {
          total: filteredAlerts.length,
          critical: filteredAlerts.filter(a => a.severity === 'CRITICAL').length,
          high: filteredAlerts.filter(a => a.severity === 'HIGH').length,
          medium: filteredAlerts.filter(a => a.severity === 'MEDIUM').length,
          low: filteredAlerts.filter(a => a.severity === 'LOW').length
        }
      }
    })
  } catch (error) {
    console.error('Get system alerts error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system alerts'
    })
  }
}

/**
 * Export analytics data for reporting
 * Requirements: 4.6 - Provide exportable data for further analysis
 */
export const exportAnalyticsData = async (req: AdminAuthRequest, res: Response) => {
  try {
    const adminId = req.admin!.id
    const { 
      type = 'system_overview',
      format = 'json',
      timeRange = '30d'
    } = req.query as any

    // Calculate date range
    let startDate: Date
    switch (timeRange) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }

    let exportData: any = {}

    switch (type) {
      case 'system_overview':
        exportData = await generateSystemOverviewExport(startDate)
        break
      case 'user_analytics':
        exportData = await generateUserAnalyticsExport(startDate)
        break
      case 'storage_analytics':
        exportData = await generateStorageAnalyticsExport(startDate)
        break
      case 'security_logs':
        exportData = await generateSecurityLogsExport(startDate)
        break
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid export type'
        })
    }

    // Add metadata
    exportData.metadata = {
      exportType: type,
      timeRange,
      startDate,
      endDate: new Date(),
      exportedBy: req.admin!.email,
      exportedAt: new Date()
    }

    // Log admin action
    await logAdminAction(
      req,
      'EXPORT_ANALYTICS_DATA',
      'system',
      undefined,
      { type, format, timeRange }
    )

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${type}_${timeRange}.csv"`)
      
      // This is a simplified CSV conversion - in production you'd want a proper CSV library
      const csvData = JSON.stringify(exportData, null, 2)
      res.send(csvData)
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="${type}_${timeRange}.json"`)
      res.json({
        success: true,
        data: exportData
      })
    }
  } catch (error) {
    console.error('Export analytics data error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics data'
    })
  }
}

// Helper functions for export data generation
async function generateSystemOverviewExport(startDate: Date) {
  const [users, galleries, photos, storage] = await Promise.all([
    prisma.user.count(),
    prisma.gallery.count(),
    prisma.photo.count(),
    prisma.$queryRaw`SELECT SUM(file_size) as total FROM photos` as Promise<any[]>
  ])

  return {
    overview: {
      totalUsers: users,
      totalGalleries: galleries,
      totalPhotos: photos,
      totalStorage: Number(storage[0]?.total || 0)
    }
  }
}

async function generateUserAnalyticsExport(startDate: Date) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      suspendedAt: true,
      _count: {
        select: {
          galleries: true,
          accessibleGalleries: true
        }
      }
    }
  })

  return { users }
}

async function generateStorageAnalyticsExport(startDate: Date) {
  const storageData = await prisma.$queryRaw`
    SELECT 
      u.name as photographer_name,
      u.email as photographer_email,
      SUM(p.file_size) as storage_used,
      COUNT(p.id) as photo_count
    FROM users u
    JOIN galleries g ON u.id = g.photographer_id
    JOIN folders f ON g.id = f.gallery_id
    JOIN photos p ON f.id = p.folder_id
    WHERE u.role = 'PHOTOGRAPHER'
    GROUP BY u.id, u.name, u.email
    ORDER BY storage_used DESC
  ` as any[]

  return { storageByPhotographer: storageData }
}

async function generateSecurityLogsExport(startDate: Date) {
  const securityLogs = await prisma.adminAuditLog.findMany({
    where: {
      createdAt: { gte: startDate },
      OR: [
        { action: { contains: 'LOGIN_FAILED' } },
        { action: { contains: 'UNAUTHORIZED' } },
        { action: { contains: 'SUSPICIOUS' } },
        { action: { contains: 'DELETE' } },
        { action: { contains: 'SUSPEND' } }
      ]
    },
    include: {
      admin: {
        select: { name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return { securityLogs }
}