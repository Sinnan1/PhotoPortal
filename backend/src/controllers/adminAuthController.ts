import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { AdminAuthRequest } from '../middleware/adminAuth'
import { AuditLogger } from '../utils/auditLogger'
import {
	validateEmail,
	validatePassword,
	validateName,
	sanitizeString
} from '../utils/validation'

const prisma = new PrismaClient()

// Track failed login attempts to prevent brute force attacks
const failedAttempts = new Map<string, { count: number; lastAttempt: Date }>()
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

/**
 * Admin login with enhanced security checks and logging
 */
export const adminLogin = async (req: Request, res: Response) => {
	try {
		const { email, password } = req.body
		const ipAddress = req.ip
		const userAgent = req.get('User-Agent')

		// Validate input
		if (!email || !password) {
			await AuditLogger.logAction({
				adminId: 'SYSTEM',
				action: 'LOGIN_INVALID_INPUT',
				targetType: 'system',
				ipAddress,
				userAgent
			})
			return res.status(400).json({
				success: false,
				error: 'Email and password are required'
			})
		}

		// Validate email format
		const emailValidation = validateEmail(email)
		if (!emailValidation.isValid) {
			await AuditLogger.logAction({
				adminId: 'SYSTEM',
				action: 'LOGIN_INVALID_EMAIL_FORMAT',
				targetType: 'system',
				details: { email, errors: emailValidation.errors },
				ipAddress,
				userAgent
			})
			return res.status(400).json({
				success: false,
				error: 'Invalid email format',
				details: emailValidation.errors
			})
		}

		// Sanitize email input
		const sanitizedEmail = email.toLowerCase().trim()

		// Check for rate limiting based on IP
		const attemptKey = `${email}:${ipAddress}`
		const attempts = failedAttempts.get(attemptKey)

		if (attempts && attempts.count >= MAX_FAILED_ATTEMPTS) {
			const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime()
			if (timeSinceLastAttempt < LOCKOUT_DURATION) {
				await AuditLogger.logAction({
					adminId: 'SYSTEM',
					action: 'LOGIN_RATE_LIMITED',
					targetType: 'system',
					details: { email },
					ipAddress,
					userAgent
				})
				return res.status(429).json({
					success: false,
					error: 'Too many failed attempts. Please try again later.',
					retryAfter: Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 1000)
				})
			} else {
				// Reset attempts after lockout period
				failedAttempts.delete(attemptKey)
			}
		}

		// Find admin user with sanitized email
		const admin = await prisma.user.findUnique({
			where: {
				email: sanitizedEmail,
				role: 'ADMIN'
			}
		})

		if (!admin) {
			// Record failed attempt
			recordFailedAttempt(attemptKey)
			await AuditLogger.logAction({
				adminId: 'SYSTEM',
				action: 'LOGIN_USER_NOT_FOUND',
				targetType: 'system',
				details: { email },
				ipAddress,
				userAgent
			})
			return res.status(401).json({
				success: false,
				error: 'Invalid admin credentials'
			})
		}

		// Check password
		const isValidPassword = await bcrypt.compare(password, admin.password)

		if (!isValidPassword) {
			// Record failed attempt
			recordFailedAttempt(attemptKey)
			await AuditLogger.logAction({
				adminId: admin.id,
				action: 'LOGIN_INVALID_PASSWORD',
				targetType: 'system',
				details: { email },
				ipAddress,
				userAgent
			})
			return res.status(401).json({
				success: false,
				error: 'Invalid admin credentials'
			})
		}

		// Clear failed attempts on successful login
		failedAttempts.delete(attemptKey)

		// Generate JWT token with shorter expiration for admin (2 hours)
		const token = jwt.sign(
			{ userId: admin.id, role: admin.role, type: 'admin' },
			process.env.JWT_SECRET!,
			{ expiresIn: '2h' }
		)

		// Create admin session with enhanced tracking
		const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
		const adminSession = await prisma.adminSession.create({
			data: {
				adminId: admin.id,
				sessionToken: token,
				ipAddress,
				userAgent,
				expiresAt
			}
		})

		// Log successful admin login
		await AuditLogger.logAction({
			adminId: admin.id,
			action: 'LOGIN_SUCCESS',
			targetType: 'system',
			details: { sessionId: adminSession.id },
			ipAddress,
			userAgent
		})

		res.json({
			success: true,
			data: {
				admin: {
					id: admin.id,
					email: admin.email,
					name: admin.name,
					role: admin.role
				},
				token,
				sessionId: adminSession.id,
				expiresAt: adminSession.expiresAt
			}
		})
	} catch (error) {
		console.error('Admin login error:', error)
		await AuditLogger.logAction({
			adminId: 'SYSTEM',
			action: 'LOGIN_ERROR',
			targetType: 'system',
			details: { error: error instanceof Error ? error.message : 'Unknown error' },
			ipAddress: req.ip,
			userAgent: req.get('User-Agent')
		})
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Admin logout with proper session cleanup
 */
export const adminLogout = async (req: AdminAuthRequest, res: Response) => {
	try {
		const adminId = req.admin?.id
		const sessionId = req.admin?.sessionId
		const ipAddress = req.ip
		const userAgent = req.get('User-Agent')

		if (!adminId || !sessionId) {
			return res.status(400).json({
				success: false,
				error: 'Invalid session'
			})
		}

		// Delete the admin session
		await prisma.adminSession.delete({
			where: { id: sessionId }
		})

		// Log admin logout
		await AuditLogger.logAction({
			adminId,
			action: 'LOGOUT_SUCCESS',
			targetType: 'system',
			details: { sessionId },
			ipAddress,
			userAgent
		})

		res.json({
			success: true,
			message: 'Admin logged out successfully'
		})
	} catch (error) {
		console.error('Admin logout error:', error)
		await AuditLogger.logAction({
			adminId: req.admin?.id || 'SYSTEM',
			action: 'LOGOUT_ERROR',
			targetType: 'system',
			details: { error: error instanceof Error ? error.message : 'Unknown error' },
			ipAddress: req.ip,
			userAgent: req.get('User-Agent')
		})
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Get current admin profile and session info
 */
export const getAdminProfile = async (req: AdminAuthRequest, res: Response) => {
	try {
		const adminId = req.admin!.id

		const admin = await prisma.user.findUnique({
			where: { id: adminId },
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true
			}
		})

		if (!admin) {
			return res.status(404).json({
				success: false,
				error: 'Admin not found'
			})
		}

		// Get current session info
		const session = await prisma.adminSession.findUnique({
			where: { id: req.admin!.sessionId },
			select: {
				id: true,
				expiresAt: true,
				createdAt: true,
				ipAddress: true
			}
		})

		res.json({
			success: true,
			data: {
				admin,
				session
			}
		})
	} catch (error) {
		console.error('Get admin profile error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Validate admin session and extend if valid
 */
export const validateAdminSession = async (req: AdminAuthRequest, res: Response) => {
	try {
		const sessionId = req.admin!.sessionId
		const adminId = req.admin!.id

		// Session is already validated by middleware, just return success
		const session = await prisma.adminSession.findUnique({
			where: { id: sessionId },
			select: {
				id: true,
				expiresAt: true,
				createdAt: true
			}
		})

		await AuditLogger.logAction({
			adminId,
			action: 'SESSION_VALIDATED',
			targetType: 'system',
			details: { sessionId },
			ipAddress: req.ip,
			userAgent: req.get('User-Agent')
		})

		res.json({
			success: true,
			data: {
				valid: true,
				session,
				admin: {
					id: req.admin!.id,
					email: req.admin!.email,
					role: req.admin!.role
				}
			}
		})
	} catch (error) {
		console.error('Admin session validation error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Get all active admin sessions for the current admin
 */
export const getAdminSessions = async (req: AdminAuthRequest, res: Response) => {
	try {
		const adminId = req.admin!.id

		const sessions = await prisma.adminSession.findMany({
			where: {
				adminId,
				expiresAt: {
					gt: new Date()
				}
			},
			select: {
				id: true,
				ipAddress: true,
				userAgent: true,
				createdAt: true,
				expiresAt: true
			},
			orderBy: {
				createdAt: 'desc'
			}
		})

		res.json({
			success: true,
			data: { sessions }
		})
	} catch (error) {
		console.error('Get admin sessions error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Extend current admin session
 */
export const extendAdminSession = async (req: AdminAuthRequest, res: Response) => {
	try {
		const sessionId = req.admin!.sessionId
		const adminId = req.admin!.id

		// Extend session by 2 hours
		const newExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)

		await prisma.adminSession.update({
			where: { id: sessionId },
			data: { expiresAt: newExpiresAt }
		})

		await AuditLogger.logAction({
			adminId,
			action: 'SESSION_EXTENDED',
			targetType: 'system',
			details: {
				sessionId,
				newExpiresAt: newExpiresAt.toISOString()
			},
			ipAddress: req.ip,
			userAgent: req.get('User-Agent')
		})

		res.json({
			success: true,
			data: {
				newExpiresAt,
				message: 'Session extended successfully'
			}
		})
	} catch (error) {
		console.error('Extend admin session error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Revoke a specific admin session
 */
export const revokeAdminSession = async (req: AdminAuthRequest, res: Response) => {
	try {
		const sessionId = req.params.sessionId as string
		const adminId = req.admin!.id

		// Ensure admin can only revoke their own sessions
		const session = await prisma.adminSession.findFirst({
			where: {
				id: sessionId,
				adminId
			}
		})

		if (!session) {
			return res.status(404).json({
				success: false,
				error: 'Session not found'
			})
		}

		await prisma.adminSession.delete({
			where: { id: sessionId }
		})

		await AuditLogger.logAction({
			adminId,
			action: 'SESSION_REVOKED',
			targetType: 'system',
			details: { revokedSessionId: sessionId },
			ipAddress: req.ip,
			userAgent: req.get('User-Agent')
		})

		res.json({
			success: true,
			message: 'Session revoked successfully'
		})
	} catch (error) {
		console.error('Revoke admin session error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Record failed login attempt for rate limiting
 */
function recordFailedAttempt(attemptKey: string) {
	const current = failedAttempts.get(attemptKey)
	if (current) {
		failedAttempts.set(attemptKey, {
			count: current.count + 1,
			lastAttempt: new Date()
		})
	} else {
		failedAttempts.set(attemptKey, {
			count: 1,
			lastAttempt: new Date()
		})
	}
}

/**
 * Setup first admin account (public endpoint when no admin exists)
 */
export const setupFirstAdmin = async (req: Request, res: Response) => {
	try {
		const { email, password, name } = req.body
		const ipAddress = req.ip
		const userAgent = req.get('User-Agent')

		// Validate input
		if (!email || !password || !name) {
			return res.status(400).json({
				success: false,
				error: 'Email, password, and name are required'
			})
		}

		// Validate email format
		const emailValidation = validateEmail(email)
		if (!emailValidation.isValid) {
			return res.status(400).json({
				success: false,
				error: 'Invalid email format',
				details: emailValidation.errors
			})
		}

		// Validate name
		const nameValidation = validateName(name)
		if (!nameValidation.isValid) {
			return res.status(400).json({
				success: false,
				error: 'Invalid name format',
				details: nameValidation.errors
			})
		}

		// Check if any admin already exists
		const existingAdmin = await prisma.user.findFirst({
			where: { role: 'ADMIN' }
		})

		if (existingAdmin) {
			await AuditLogger.logAction({
				adminId: 'SYSTEM',
				action: 'FIRST_ADMIN_SETUP_BLOCKED',
				targetType: 'system',
				details: {
					attemptedEmail: email,
					reason: 'Admin already exists'
				},
				ipAddress,
				userAgent
			})
			return res.status(403).json({
				success: false,
				error: 'Admin account already exists. First admin setup is not available.'
			})
		}

		// Validate password strength for admin
		const passwordValidation = validatePassword(password, {
			minLength: 16,
			requireUppercase: true,
			requireLowercase: true,
			requireNumbers: true,
			requireSpecialChars: true
		})

		if (!passwordValidation.isValid) {
			return res.status(400).json({
				success: false,
				error: 'Admin password does not meet security requirements',
				details: passwordValidation.errors
			})
		}

		if (passwordValidation.strength === 'weak') {
			return res.status(400).json({
				success: false,
				error: 'Admin password is too weak',
				details: passwordValidation.errors
			})
		}

		// Check if user with this email already exists
		const sanitizedEmail = email.toLowerCase().trim()
		const existingUser = await prisma.user.findUnique({
			where: { email: sanitizedEmail }
		})

		if (existingUser) {
			return res.status(400).json({
				success: false,
				error: 'User with this email already exists'
			})
		}

		// Hash password with high salt rounds for admin
		const hashedPassword = await bcrypt.hash(password, 14)

		// Create first admin with sanitized data
		const admin = await prisma.user.create({
			data: {
				email: sanitizedEmail,
				password: hashedPassword,
				name: sanitizeString(name).trim(),
				role: 'ADMIN'
			},
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true
			}
		})

		// Log the creation
		await AuditLogger.logAction({
			adminId: admin.id,
			action: 'FIRST_ADMIN_CREATED',
			targetType: 'user',
			targetId: admin.id,
			details: {
				email: admin.email,
				name: admin.name,
				createdBy: 'FIRST_ADMIN_SETUP'
			},
			ipAddress,
			userAgent
		})

		res.status(201).json({
			success: true,
			data: {
				admin: {
					id: admin.id,
					email: admin.email,
					name: admin.name,
					role: admin.role,
					createdAt: admin.createdAt
				},
				message: 'First admin account created successfully'
			}
		})
	} catch (error) {
		console.error('Setup first admin error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Invite a new admin (requires existing admin authentication)
 */
export const inviteAdmin = async (req: AdminAuthRequest, res: Response) => {
	try {
		const { email, name } = req.body
		const invitedBy = req.admin!.id
		const ipAddress = req.ip
		const userAgent = req.get('User-Agent')

		// Validate input
		if (!email || !name) {
			return res.status(400).json({
				success: false,
				error: 'Email and name are required'
			})
		}

		// Check if user with this email already exists
		const existingUser = await prisma.user.findUnique({
			where: { email }
		})

		if (existingUser) {
			return res.status(400).json({
				success: false,
				error: 'User with this email already exists'
			})
		}

		// Check if there's already a pending invitation for this email
		const existingInvitation = await prisma.adminInvitation.findFirst({
			where: {
				email,
				status: 'PENDING',
				expiresAt: {
					gt: new Date()
				}
			}
		})

		if (existingInvitation) {
			return res.status(400).json({
				success: false,
				error: 'Pending invitation already exists for this email'
			})
		}

		// Generate secure invitation token
		const token = jwt.sign(
			{ email, name, invitedBy },
			process.env.JWT_SECRET!,
			{ expiresIn: '7d' }
		)

		// Create invitation record
		const invitation = await prisma.adminInvitation.create({
			data: {
				email,
				name,
				invitedBy,
				token,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
			},
			include: {
				invitedByUser: {
					select: {
						name: true,
						email: true
					}
				}
			}
		})

		// Log the invitation
		await AuditLogger.logAction({
			adminId: invitedBy,
			action: 'ADMIN_INVITED',
			targetType: 'user',
			details: {
				invitedEmail: email,
				invitedName: name,
				invitationId: invitation.id
			},
			ipAddress,
			userAgent
		})

		// TODO: Send invitation email (implement email service)
		// For now, return the invitation details
		res.status(201).json({
			success: true,
			data: {
				invitation: {
					id: invitation.id,
					email: invitation.email,
					name: invitation.name,
					token: invitation.token,
					expiresAt: invitation.expiresAt,
					invitedBy: invitation.invitedByUser
				},
				message: 'Admin invitation created successfully'
			}
		})
	} catch (error) {
		console.error('Invite admin error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Verify admin invitation token (public endpoint)
 */
export const verifyAdminInvitation = async (req: Request, res: Response) => {
	try {
		const token = req.params.token as string

		if (!token) {
			return res.status(400).json({
				success: false,
				error: 'Invitation token is required'
			})
		}

		// Find invitation by token
		const invitation = await prisma.adminInvitation.findFirst({
			where: {
				token,
				status: 'PENDING',
				expiresAt: {
					gt: new Date()
				}
			},
			include: {
				invitedByUser: {
					select: {
						name: true,
						email: true
					}
				}
			}
		})

		if (!invitation) {
			return res.status(404).json({
				success: false,
				error: 'Invalid or expired invitation token'
			})
		}

		// Verify JWT token
		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
			if (decoded.email !== invitation.email) {
				throw new Error('Token email mismatch')
			}
		} catch (jwtError) {
			return res.status(400).json({
				success: false,
				error: 'Invalid invitation token'
			})
		}

		res.json({
			success: true,
			data: {
				invitation: {
					id: invitation.id,
					email: invitation.email,
					name: invitation.name,
					expiresAt: invitation.expiresAt,
					invitedBy: invitation.invitedByUser
				}
			}
		})
	} catch (error) {
		console.error('Verify admin invitation error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Activate admin account from invitation (public endpoint)
 */
export const activateAdminAccount = async (req: Request, res: Response) => {
	try {
		const { token, password } = req.body
		const ipAddress = req.ip
		const userAgent = req.get('User-Agent')

		// Validate input
		if (!token || !password) {
			return res.status(400).json({
				success: false,
				error: 'Token and password are required'
			})
		}

		// Validate password strength
		if (password.length < 16) {
			return res.status(400).json({
				success: false,
				error: 'Admin password must be at least 16 characters long'
			})
		}

		// Find and verify invitation
		const invitation = await prisma.adminInvitation.findFirst({
			where: {
				token,
				status: 'PENDING',
				expiresAt: {
					gt: new Date()
				}
			}
		})

		if (!invitation) {
			return res.status(404).json({
				success: false,
				error: 'Invalid or expired invitation token'
			})
		}

		// Verify JWT token
		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
			if (decoded.email !== invitation.email) {
				throw new Error('Token email mismatch')
			}
		} catch (jwtError) {
			return res.status(400).json({
				success: false,
				error: 'Invalid invitation token'
			})
		}

		// Check if user already exists
		const existingUser = await prisma.user.findUnique({
			where: { email: invitation.email }
		})

		if (existingUser) {
			return res.status(400).json({
				success: false,
				error: 'User with this email already exists'
			})
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 12)

		// Create admin user and update invitation in transaction
		const result = await prisma.$transaction(async (tx) => {
			// Create admin user
			const admin = await tx.user.create({
				data: {
					email: invitation.email,
					password: hashedPassword,
					name: invitation.name,
					role: 'ADMIN'
				},
				select: {
					id: true,
					email: true,
					name: true,
					role: true,
					createdAt: true
				}
			})

			// Update invitation status
			await tx.adminInvitation.update({
				where: { id: invitation.id },
				data: {
					status: 'ACCEPTED',
					acceptedAt: new Date()
				}
			})

			return admin
		})

		// Log the activation
		await AuditLogger.logAction({
			adminId: result.id,
			action: 'ADMIN_ACCOUNT_ACTIVATED',
			targetType: 'user',
			targetId: result.id,
			details: {
				email: result.email,
				name: result.name,
				invitationId: invitation.id,
				invitedBy: invitation.invitedBy
			},
			ipAddress,
			userAgent
		})

		res.status(201).json({
			success: true,
			data: {
				admin: result,
				message: 'Admin account activated successfully'
			}
		})
	} catch (error) {
		console.error('Activate admin account error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Update admin profile (protected endpoint)
 */
export const updateAdminProfile = async (req: AdminAuthRequest, res: Response) => {
	try {
		const { name } = req.body
		const adminId = req.admin!.id
		const ipAddress = req.ip
		const userAgent = req.get('User-Agent')

		// Validate input
		if (!name || name.trim().length === 0) {
			return res.status(400).json({
				success: false,
				error: 'Name is required'
			})
		}

		// Update admin profile
		const updatedAdmin = await prisma.user.update({
			where: { id: adminId },
			data: { name: name.trim() },
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				updatedAt: true
			}
		})

		// Log the update
		await AuditLogger.logAction({
			adminId,
			action: 'ADMIN_PROFILE_UPDATED',
			targetType: 'user',
			targetId: adminId,
			details: {
				updatedFields: { name: name.trim() }
			},
			ipAddress,
			userAgent
		})

		res.json({
			success: true,
			data: {
				admin: updatedAdmin,
				message: 'Profile updated successfully'
			}
		})
	} catch (error) {
		console.error('Update admin profile error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Change admin password (protected endpoint)
 */
export const changeAdminPassword = async (req: AdminAuthRequest, res: Response) => {
	try {
		const { currentPassword, newPassword } = req.body
		const adminId = req.admin!.id
		const ipAddress = req.ip
		const userAgent = req.get('User-Agent')

		// Validate input
		if (!currentPassword || !newPassword) {
			return res.status(400).json({
				success: false,
				error: 'Current password and new password are required'
			})
		}

		// Validate new password strength
		if (newPassword.length < 16) {
			return res.status(400).json({
				success: false,
				error: 'New password must be at least 16 characters long'
			})
		}

		// Get current admin data
		const admin = await prisma.user.findUnique({
			where: { id: adminId },
			select: {
				id: true,
				email: true,
				password: true
			}
		})

		if (!admin) {
			return res.status(404).json({
				success: false,
				error: 'Admin not found'
			})
		}

		// Verify current password
		const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password)
		if (!isCurrentPasswordValid) {
			await AuditLogger.logAction({
				adminId,
				action: 'PASSWORD_CHANGE_FAILED',
				targetType: 'user',
				targetId: adminId,
				details: {
					reason: 'Invalid current password'
				},
				ipAddress,
				userAgent
			})
			return res.status(400).json({
				success: false,
				error: 'Current password is incorrect'
			})
		}

		// Hash new password
		const hashedNewPassword = await bcrypt.hash(newPassword, 12)

		// Update password
		await prisma.user.update({
			where: { id: adminId },
			data: { password: hashedNewPassword }
		})

		// Invalidate all existing sessions except current one
		const currentSessionId = req.admin!.sessionId
		await prisma.adminSession.deleteMany({
			where: {
				adminId,
				id: {
					not: currentSessionId
				}
			}
		})

		// Log the password change
		await AuditLogger.logAction({
			adminId,
			action: 'ADMIN_PASSWORD_CHANGED',
			targetType: 'user',
			targetId: adminId,
			details: {
				sessionsInvalidated: true
			},
			ipAddress,
			userAgent
		})

		res.json({
			success: true,
			data: {
				message: 'Password changed successfully. All other sessions have been invalidated.'
			}
		})
	} catch (error) {
		console.error('Change admin password error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}