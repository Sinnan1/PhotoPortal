import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { UAParser } from 'ua-parser-js'

const prisma = new PrismaClient()

// In-memory rate limiter
const userHeartbeatTimestamps = new Map<string, number>()
const RATE_LIMIT_MS = 45000 // 45 seconds

/**
 * Check rate limit for heartbeat endpoint
 */
const checkRateLimit = (userId: string): boolean => {
    const lastHeartbeat = userHeartbeatTimestamps.get(userId)
    const now = Date.now()

    if (lastHeartbeat && now - lastHeartbeat < RATE_LIMIT_MS) {
        return false // Rate limited
    }

    userHeartbeatTimestamps.set(userId, now)
    return true
}

/**
 * Parse user agent string into device info
 */
const parseUserAgent = (userAgent: string | undefined) => {
    if (!userAgent) {
        return { browser: null, browserVersion: null, os: null, deviceType: null }
    }

    const parser = new UAParser(userAgent)
    const result = parser.getResult()

    // Determine device type
    let deviceType = 'desktop'
    if (result.device?.type) {
        deviceType = result.device.type // mobile, tablet, etc.
    }

    return {
        browser: result.browser?.name || null,
        browserVersion: result.browser?.version || null,
        os: result.os?.name ? `${result.os.name} ${result.os.version || ''}`.trim() : null,
        deviceType
    }
}

/**
 * Update user presence (heartbeat)
 * POST /api/presence/heartbeat
 */
export const updatePresence = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' })
        }

        // Check rate limit
        if (!checkRateLimit(userId)) {
            return res.status(429).json({
                success: false,
                error: 'Rate limited',
                retryAfter: Math.ceil(RATE_LIMIT_MS / 1000)
            })
        }

        const { galleryId } = req.body
        const userAgent = req.headers['user-agent']
        const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0] || null

        // Parse user agent
        const deviceInfo = parseUserAgent(userAgent)

        // Upsert presence record
        const presence = await prisma.userPresence.upsert({
            where: { userId },
            update: {
                galleryId: galleryId || null,
                lastSeenAt: new Date(),
                userAgent,
                ipAddress,
                ...deviceInfo
            },
            create: {
                userId,
                galleryId: galleryId || null,
                userAgent,
                ipAddress,
                ...deviceInfo
            }
        })

        res.json({ success: true, data: { lastSeenAt: presence.lastSeenAt } })

    } catch (error) {
        console.error('Update presence error:', error)
        res.status(500).json({ success: false, error: 'Failed to update presence' })
    }
}

/**
 * Clear user presence (on logout or leave)
 * DELETE /api/presence
 */
export const clearPresence = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' })
        }

        await prisma.userPresence.deleteMany({
            where: { userId }
        })

        // Clear rate limit entry
        userHeartbeatTimestamps.delete(userId)

        res.json({ success: true })

    } catch (error) {
        console.error('Clear presence error:', error)
        res.status(500).json({ success: false, error: 'Failed to clear presence' })
    }
}

/**
 * Cleanup stale presence records (older than 5 minutes)
 * Called periodically from server startup
 */
export const cleanupStalePresence = async () => {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

        const deleted = await prisma.userPresence.deleteMany({
            where: { lastSeenAt: { lt: fiveMinutesAgo } }
        })

        if (deleted.count > 0) {
            console.log(`🧹 Cleaned up ${deleted.count} stale presence records`)
        }

    } catch (error) {
        console.error('Cleanup stale presence error:', error)
    }
}
