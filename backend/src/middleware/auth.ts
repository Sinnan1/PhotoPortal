import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { AuditLogger } from '../utils/auditLogger'

const prisma = new PrismaClient()

interface AuthRequest extends Request {
	user?: {
		id: string
		email: string
		role: string
	}
}

// Admin-specific error types
export enum AdminErrorType {
	INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
	ADMIN_SESSION_EXPIRED = 'ADMIN_SESSION_EXPIRED',
	INVALID_ADMIN_ACTION = 'INVALID_ADMIN_ACTION',
	SYSTEM_CONFIG_ERROR = 'SYSTEM_CONFIG_ERROR',
	AUDIT_LOG_FAILURE = 'AUDIT_LOG_FAILURE'
}

export const authenticateToken = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const authHeader = req.headers['authorization']
		const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

		if (!token) {
			res.status(401).json({
				success: false,
				error: 'Access token required'
			})
			return
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

		// Get user from database to ensure they still exist
		const user = await prisma.user.findUnique({
			where: { id: decoded.userId },
			select: { id: true, email: true, role: true }
		})

		if (!user) {
			res.status(401).json({
				success: false,
				error: 'User not found'
			})
			return
		}

		req.user = user
		next()
	} catch (error) {
		res.status(403).json({
			success: false,
			error: 'Invalid or expired token'
		})
		return
	}
}

export const requireRole = (role: string) => {
	return (req: AuthRequest, res: Response, next: NextFunction): void => {
		if (req.user?.role !== role) {
			// Log unauthorized access attempts for admin routes
			if (req.path.startsWith('/admin')) {
				AuditLogger.logAction({
					adminId: req.user?.id || 'unknown',
					action: 'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
					targetType: 'system',
					details: {
						attemptedPath: req.path,
						requiredRole: role,
						userRole: req.user?.role
					},
					ipAddress: req.ip,
					userAgent: req.get('User-Agent')
				})
			}

			res.status(403).json({
				success: false,
				error: 'Insufficient permissions',
				errorType: AdminErrorType.INSUFFICIENT_PERMISSIONS
			})
			return
		}
		next()
	}
}

// Enhanced role checking that supports multiple roles
export const requireAnyRole = (roles: string[]) => {
	return (req: AuthRequest, res: Response, next: NextFunction): void => {
		if (!req.user?.role || !roles.includes(req.user.role)) {
			// Log unauthorized access attempts for admin routes
			if (req.path.startsWith('/admin')) {
				AuditLogger.logAction({
					adminId: req.user?.id || 'unknown',
					action: 'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
					targetType: 'system',
					details: {
						attemptedPath: req.path,
						requiredRoles: roles,
						userRole: req.user?.role
					},
					ipAddress: req.ip,
					userAgent: req.get('User-Agent')
				})
			}

			res.status(403).json({
				success: false,
				error: 'Insufficient permissions',
				errorType: AdminErrorType.INSUFFICIENT_PERMISSIONS
			})
			return
		}
		next()
	}
}

// Admin-specific authentication that integrates with existing auth
export const requireAdminOrOwner = (req: AuthRequest, res: Response, next: NextFunction): void => {
	// Allow admin access to any resource
	if (req.user?.role === 'ADMIN') {
		return next()
	}

	// For non-admin users, check if they own the resource
	// This will be used in gallery and photo routes
	// const resourceUserId = req.params.userId || req.body.userId
	// if (resourceUserId && req.user?.id === resourceUserId) {
		// return next()
//	}

	// Check if it's a photographer accessing their own galleries/photos
	if (req.user?.role === 'PHOTOGRAPHER') {
		return next() // Let the specific controller handle ownership validation
	}

	res.status(403).json({
		success: false,
		error: 'Insufficient permissions - admin access or resource ownership required',
		errorType: AdminErrorType.INSUFFICIENT_PERMISSIONS
	})
	return
}