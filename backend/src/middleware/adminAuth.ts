import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface AdminAuthRequest extends Request {
	admin?: {
		id: string
		email: string
		role: string
		sessionId: string
	}
}

export interface AdminSession {
	id: string
	adminId: string
	sessionToken: string
	ipAddress?: string
	userAgent?: string
	expiresAt: Date
	createdAt: Date
}

/**
 * Enhanced admin authentication middleware with additional security checks
 */
export const authenticateAdmin = async (
	req: AdminAuthRequest,
	res: Response,
	next: NextFunction
) => {
	try {
		const authHeader = req.headers['authorization']
		const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

		if (!token) {
			await logSecurityEvent('ADMIN_AUTH_MISSING_TOKEN', req.ip, req.get('User-Agent'))
			return res.status(401).json({
				success: false,
				error: 'Admin access token required'
			})
		}

		// Verify JWT token
		const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
		
		// Validate admin session in database
		const adminSession = await prisma.adminSession.findUnique({
			where: { sessionToken: token },
			include: {
				admin: {
					select: { id: true, email: true, role: true }
				}
			}
		})

		if (!adminSession) {
			await logSecurityEvent('ADMIN_AUTH_INVALID_SESSION', req.ip, req.get('User-Agent'))
			return res.status(401).json({
				success: false,
				error: 'Invalid admin session'
			})
		}

		// Check if session has expired
		if (adminSession.expiresAt < new Date()) {
			// Clean up expired session
			await prisma.adminSession.delete({
				where: { id: adminSession.id }
			})
			await logSecurityEvent('ADMIN_AUTH_EXPIRED_SESSION', req.ip, req.get('User-Agent'), adminSession.adminId)
			return res.status(401).json({
				success: false,
				error: 'Admin session expired'
			})
		}

		// Validate admin role
		if (adminSession.admin.role !== 'ADMIN') {
			await logSecurityEvent('ADMIN_AUTH_INVALID_ROLE', req.ip, req.get('User-Agent'), adminSession.adminId)
			return res.status(403).json({
				success: false,
				error: 'Admin privileges required'
			})
		}

		// Enhanced security: IP address validation (optional but recommended)
		if (adminSession.ipAddress && adminSession.ipAddress !== req.ip) {
			await logSecurityEvent('ADMIN_AUTH_IP_MISMATCH', req.ip, req.get('User-Agent'), adminSession.adminId)
			// For now, we'll log but not block - this can be made stricter based on requirements
		}

		// User agent validation (basic check)
		if (adminSession.userAgent && adminSession.userAgent !== req.get('User-Agent')) {
			await logSecurityEvent('ADMIN_AUTH_USER_AGENT_MISMATCH', req.ip, req.get('User-Agent'), adminSession.adminId)
			// For now, we'll log but not block
		}

		// Set admin info in request
		req.admin = {
			id: adminSession.admin.id,
			email: adminSession.admin.email,
			role: adminSession.admin.role,
			sessionId: adminSession.id
		}

		// Update session activity (extend expiration by 2 hours)
		const newExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
		await prisma.adminSession.update({
			where: { id: adminSession.id },
			data: { expiresAt: newExpiresAt }
		})

		next()
	} catch (error) {
		console.error('Admin authentication error:', error)
		await logSecurityEvent('ADMIN_AUTH_ERROR', req.ip, req.get('User-Agent'))
		return res.status(403).json({
			success: false,
			error: 'Invalid or expired admin token'
		})
	}
}

/**
 * Middleware to require admin role specifically
 */
export const requireAdmin = (req: AdminAuthRequest, res: Response, next: NextFunction) => {
	if (!req.admin || req.admin.role !== 'ADMIN') {
		return res.status(403).json({
			success: false,
			error: 'Admin privileges required'
		})
	}
	next()
}

/**
 * Log security events for admin authentication
 */
async function logSecurityEvent(
	action: string, 
	ipAddress?: string, 
	userAgent?: string, 
	adminId?: string
) {
	try {
		await prisma.adminAuditLog.create({
			data: {
				adminId: adminId || 'SYSTEM',
				action,
				targetType: 'security',
				details: {
					ipAddress,
					userAgent,
					timestamp: new Date().toISOString()
				},
				ipAddress,
				userAgent
			}
		})
	} catch (error) {
		console.error('Failed to log security event:', error)
	}
}

/**
 * Clean up expired admin sessions
 */
export const cleanupExpiredSessions = async () => {
	try {
		const result = await prisma.adminSession.deleteMany({
			where: {
				expiresAt: {
					lt: new Date()
				}
			}
		})
		console.log(`Cleaned up ${result.count} expired admin sessions`)
		return result.count
	} catch (error) {
		console.error('Failed to cleanup expired sessions:', error)
		return 0
	}
}

export { AdminAuthRequest }