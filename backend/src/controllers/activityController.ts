import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AdminAuthRequest } from '../middleware/adminAuth'

const prisma = new PrismaClient()

/**
 * Get recent client activity (uploads, downloads, likes, views)
 */
export const getRecentActivity = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { limit = 50, userId, galleryId, actionType } = req.query

    const limitNum = Math.min(parseInt(limit as string) || 50, 100)

    // Build filter
    const where: any = {
      action: {
        in: [
          'USER_LOGIN',
          'CLIENT_LOGIN',
          'UPLOAD_PHOTOS',
          'DELETE_PHOTO',
          'LIKE_PHOTO',
          'UNLIKE_PHOTO',
          'FAVORITE_PHOTO',
          'UNFAVORITE_PHOTO',
          'DOWNLOAD_PHOTOS',
          'VIEW_GALLERY',
          'VIEW_PHOTO'
        ]
      }
    }

    if (userId) {
      where.adminId = userId as string
    }

    if (actionType) {
      where.action = actionType as string
    }

    // Get recent activity from audit logs
    const activities = await prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    // Transform to activity format
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      action: activity.action,
      user: activity.admin,
      targetType: activity.targetType,
      targetId: activity.targetId,
      details: activity.details,
      timestamp: activity.createdAt,
      ipAddress: activity.ipAddress
    }))

    res.json({
      success: true,
      data: {
        activities: formattedActivities,
        total: formattedActivities.length
      }
    })

  } catch (error) {
    console.error('Get recent activity error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity'
    })
  }
}

/**
 * Get activity summary/statistics
 */
export const getActivitySummary = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { timeRange = '24h' } = req.query

    // Calculate time range
    let startDate = new Date()
    switch (timeRange) {
      case '1h':
        startDate.setHours(startDate.getHours() - 1)
        break
      case '24h':
        startDate.setHours(startDate.getHours() - 24)
        break
      case '7d':
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(startDate.getDate() - 30)
        break
      default:
        startDate.setHours(startDate.getHours() - 24)
    }

    // Get activity counts
    const [
      totalLogins,
      totalUploads,
      totalDownloads,
      totalLikes,
      totalFavorites,
      activeUsers
    ] = await Promise.all([
      // Logins
      prisma.adminAuditLog.count({
        where: {
          action: { in: ['USER_LOGIN', 'CLIENT_LOGIN'] },
          createdAt: { gte: startDate }
        }
      }),
      // Uploads
      prisma.adminAuditLog.count({
        where: {
          action: 'UPLOAD_PHOTOS',
          createdAt: { gte: startDate }
        }
      }),
      // Downloads
      prisma.adminAuditLog.count({
        where: {
          action: 'DOWNLOAD_PHOTOS',
          createdAt: { gte: startDate }
        }
      }),
      // Likes
      prisma.adminAuditLog.count({
        where: {
          action: 'LIKE_PHOTO',
          createdAt: { gte: startDate }
        }
      }),
      // Favorites
      prisma.adminAuditLog.count({
        where: {
          action: 'FAVORITE_PHOTO',
          createdAt: { gte: startDate }
        }
      }),
      // Active users
      prisma.adminAuditLog.groupBy({
        by: ['adminId'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: true
      })
    ])

    res.json({
      success: true,
      data: {
        timeRange,
        startDate,
        summary: {
          totalLogins,
          totalUploads,
          totalDownloads,
          totalLikes,
          totalFavorites,
          activeUsers: activeUsers.length
        }
      }
    })

  } catch (error) {
    console.error('Get activity summary error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity summary'
    })
  }
}

/**
 * Get user-specific activity
 */
export const getUserActivity = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const { limit = 20 } = req.query

    const limitNum = Math.min(parseInt(limit as string) || 20, 100)

    const activities = await prisma.adminAuditLog.findMany({
      where: {
        adminId: userId
      },
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    res.json({
      success: true,
      data: {
        userId,
        activities: activities.map(a => ({
          id: a.id,
          action: a.action,
          targetType: a.targetType,
          targetId: a.targetId,
          details: a.details,
          timestamp: a.createdAt,
          ipAddress: a.ipAddress
        })),
        total: activities.length
      }
    })

  } catch (error) {
    console.error('Get user activity error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity'
    })
  }
}
