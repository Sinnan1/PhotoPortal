import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AdminAuthRequest } from '../middleware/adminAuth'

const prisma = new PrismaClient()

// Active threshold: 2 minutes
const ACTIVE_THRESHOLD_MS = 2 * 60 * 1000

/**
 * Get all active users (admin only)
 * GET /api/admin/presence/active
 */
export const getActiveUsers = async (req: AdminAuthRequest, res: Response) => {
    try {
        const activeThreshold = new Date(Date.now() - ACTIVE_THRESHOLD_MS)

        const activeUsers = await prisma.userPresence.findMany({
            where: {
                lastSeenAt: { gte: activeThreshold }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                },
                gallery: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            orderBy: { lastSeenAt: 'desc' }
        })

        // Format response
        const formattedUsers = activeUsers.map(presence => ({
            userId: presence.userId,
            userName: presence.user.name,
            userEmail: presence.user.email,
            userRole: presence.user.role,
            galleryId: presence.galleryId,
            galleryTitle: presence.gallery?.title || null,
            lastSeenAt: presence.lastSeenAt,
            isOnline: true,
            device: {
                browser: presence.browser,
                browserVersion: presence.browserVersion,
                os: presence.os,
                type: presence.deviceType
            },
            ipAddress: presence.ipAddress
        }))

        res.json({
            success: true,
            data: {
                activeUsers: formattedUsers,
                totalActive: formattedUsers.length,
                activeThresholdMinutes: ACTIVE_THRESHOLD_MS / 60000
            }
        })

    } catch (error) {
        console.error('Get active users error:', error)
        res.status(500).json({ success: false, error: 'Failed to get active users' })
    }
}

/**
 * Get users viewing a specific gallery (admin only)
 * GET /api/admin/presence/gallery/:galleryId
 */
export const getGalleryPresence = async (req: AdminAuthRequest, res: Response) => {
    try {
        const galleryId = req.params.galleryId as string
        const activeThreshold = new Date(Date.now() - ACTIVE_THRESHOLD_MS)

        const viewers = await prisma.userPresence.findMany({
            where: {
                galleryId,
                lastSeenAt: { gte: activeThreshold }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                }
            },
            orderBy: { lastSeenAt: 'desc' }
        })

        const formattedViewers = viewers.map(presence => ({
            userId: presence.userId,
            userName: presence.user.name,
            userEmail: presence.user.email,
            userRole: presence.user.role,
            lastSeenAt: presence.lastSeenAt,
            device: {
                browser: presence.browser,
                browserVersion: presence.browserVersion,
                os: presence.os,
                type: presence.deviceType
            },
            ipAddress: presence.ipAddress
        }))

        res.json({
            success: true,
            data: {
                galleryId,
                viewers: formattedViewers,
                viewerCount: formattedViewers.length
            }
        })

    } catch (error) {
        console.error('Get gallery presence error:', error)
        res.status(500).json({ success: false, error: 'Failed to get gallery presence' })
    }
}

/**
 * Get presence statistics (admin only)
 * GET /api/admin/presence/stats
 */
export const getPresenceStats = async (req: AdminAuthRequest, res: Response) => {
    try {
        const activeThreshold = new Date(Date.now() - ACTIVE_THRESHOLD_MS)

        // Get counts by role
        const roleCounts = await prisma.userPresence.groupBy({
            by: ['userId'],
            where: {
                lastSeenAt: { gte: activeThreshold }
            }
        })

        // Get active galleries count
        const activeGalleries = await prisma.userPresence.findMany({
            where: {
                lastSeenAt: { gte: activeThreshold },
                galleryId: { not: null }
            },
            distinct: ['galleryId']
        })

        res.json({
            success: true,
            data: {
                totalActiveUsers: roleCounts.length,
                activeGalleriesCount: activeGalleries.length,
                updatedAt: new Date()
            }
        })

    } catch (error) {
        console.error('Get presence stats error:', error)
        res.status(500).json({ success: false, error: 'Failed to get presence stats' })
    }
}
