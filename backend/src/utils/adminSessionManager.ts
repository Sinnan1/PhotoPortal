import { PrismaClient } from '@prisma/client'
import * as cron from 'node-cron'

const prisma = new PrismaClient()

/**
 * Admin Session Manager - Handles session cleanup and management
 */
export class AdminSessionManager {
	private static instance: AdminSessionManager
	private cleanupJob: cron.ScheduledTask | null = null

	private constructor() {}

	public static getInstance(): AdminSessionManager {
		if (!AdminSessionManager.instance) {
			AdminSessionManager.instance = new AdminSessionManager()
		}
		return AdminSessionManager.instance
	}

	/**
	 * Start automatic cleanup of expired admin sessions
	 * Runs every 15 minutes
	 */
	public startAutomaticCleanup(): void {
		if (this.cleanupJob) {
			console.log('Admin session cleanup job is already running')
			return
		}

		// Run cleanup every 15 minutes
		this.cleanupJob = cron.schedule('*/15 * * * *', async () => {
			await this.cleanupExpiredSessions()
		}, {
			timezone: 'UTC'
		})

		console.log('Admin session automatic cleanup started (runs every 15 minutes)')
	}

	/**
	 * Stop automatic cleanup
	 */
	public stopAutomaticCleanup(): void {
		if (this.cleanupJob) {
			this.cleanupJob.stop()
			this.cleanupJob = null
			console.log('Admin session automatic cleanup stopped')
		}
	}

	/**
	 * Clean up expired admin sessions
	 */
	public async cleanupExpiredSessions(): Promise<number> {
		try {
			const result = await prisma.adminSession.deleteMany({
				where: {
					expiresAt: {
						lt: new Date()
					}
				}
			})

			if (result.count > 0) {
				console.log(`Cleaned up ${result.count} expired admin sessions`)
				
				// Log cleanup action
				await prisma.adminAuditLog.create({
					data: {
						adminId: 'SYSTEM',
						action: 'ADMIN_SESSION_CLEANUP',
						targetType: 'system',
						details: {
							cleanedSessions: result.count,
							timestamp: new Date().toISOString()
						}
					}
				})
			}

			return result.count
		} catch (error) {
			console.error('Failed to cleanup expired admin sessions:', error)
			return 0
		}
	}

	/**
	 * Get session statistics
	 */
	public async getSessionStats(): Promise<{
		totalActiveSessions: number
		expiredSessions: number
		sessionsCreatedToday: number
	}> {
		try {
			const now = new Date()
			const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

			const [totalActiveSessions, expiredSessions, sessionsCreatedToday] = await Promise.all([
				prisma.adminSession.count({
					where: {
						expiresAt: {
							gt: now
						}
					}
				}),
				prisma.adminSession.count({
					where: {
						expiresAt: {
							lt: now
						}
					}
				}),
				prisma.adminSession.count({
					where: {
						createdAt: {
							gte: todayStart
						}
					}
				})
			])

			return {
				totalActiveSessions,
				expiredSessions,
				sessionsCreatedToday
			}
		} catch (error) {
			console.error('Failed to get session stats:', error)
			return {
				totalActiveSessions: 0,
				expiredSessions: 0,
				sessionsCreatedToday: 0
			}
		}
	}

	/**
	 * Revoke all sessions for a specific admin
	 */
	public async revokeAllSessionsForAdmin(adminId: string): Promise<number> {
		try {
			const result = await prisma.adminSession.deleteMany({
				where: { adminId }
			})

			// Log the action
			await prisma.adminAuditLog.create({
				data: {
					adminId: 'SYSTEM',
					action: 'ADMIN_ALL_SESSIONS_REVOKED',
					targetType: 'user',
					targetId: adminId,
					details: {
						revokedSessions: result.count,
						timestamp: new Date().toISOString()
					}
				}
			})

			return result.count
		} catch (error) {
			console.error('Failed to revoke all sessions for admin:', error)
			return 0
		}
	}

	/**
	 * Check if admin has active sessions
	 */
	public async hasActiveSessions(adminId: string): Promise<boolean> {
		try {
			const count = await prisma.adminSession.count({
				where: {
					adminId,
					expiresAt: {
						gt: new Date()
					}
				}
			})
			return count > 0
		} catch (error) {
			console.error('Failed to check active sessions:', error)
			return false
		}
	}

	/**
	 * Extend session expiration
	 */
	public async extendSession(sessionId: string, additionalHours: number = 2): Promise<boolean> {
		try {
			const newExpiresAt = new Date(Date.now() + additionalHours * 60 * 60 * 1000)
			
			await prisma.adminSession.update({
				where: { id: sessionId },
				data: { expiresAt: newExpiresAt }
			})

			return true
		} catch (error) {
			console.error('Failed to extend session:', error)
			return false
		}
	}

	/**
	 * Get sessions by IP address (for security monitoring)
	 */
	public async getSessionsByIP(ipAddress: string): Promise<any[]> {
		try {
			return await prisma.adminSession.findMany({
				where: { ipAddress },
				include: {
					admin: {
						select: {
							id: true,
							email: true,
							name: true
						}
					}
				},
				orderBy: {
					createdAt: 'desc'
				}
			})
		} catch (error) {
			console.error('Failed to get sessions by IP:', error)
			return []
		}
	}
}

// Export singleton instance
export const adminSessionManager = AdminSessionManager.getInstance()