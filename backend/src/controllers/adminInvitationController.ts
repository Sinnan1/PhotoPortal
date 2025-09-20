import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AdminAuthRequest } from '../middleware/adminAuth'
import { AuditLogger } from '../utils/auditLogger'

const prisma = new PrismaClient()

/**
 * Get all admin invitations (with filtering and pagination)
 */
export const getAdminInvitations = async (req: AdminAuthRequest, res: Response) => {
	try {
		const adminId = req.admin!.id
		const { status, page = 1, limit = 20 } = req.query

		// Build where clause
		const where: any = {}
		if (status && typeof status === 'string') {
			where.status = status
		}

		// Get invitations with pagination
		const skip = (Number(page) - 1) * Number(limit)
		const [invitations, total] = await Promise.all([
			prisma.adminInvitation.findMany({
				where,
				include: {
					invitedByUser: {
						select: {
							name: true,
							email: true
						}
					}
				},
				orderBy: {
					createdAt: 'desc'
				},
				skip,
				take: Number(limit)
			}),
			prisma.adminInvitation.count({ where })
		])

		// Log the access
		await AuditLogger.logAction({
			adminId,
			action: 'INVITATIONS_VIEWED',
			targetType: 'system',
			details: {
				filters: { status },
				resultCount: invitations.length
			},
			ipAddress: req.ip,
			userAgent: req.get('User-Agent')
		})

		res.json({
			success: true,
			data: {
				invitations,
				pagination: {
					page: Number(page),
					limit: Number(limit),
					total,
					pages: Math.ceil(total / Number(limit))
				}
			}
		})
	} catch (error) {
		console.error('Get admin invitations error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Get a specific admin invitation by ID
 */
export const getAdminInvitation = async (req: AdminAuthRequest, res: Response) => {
	try {
		const { invitationId } = req.params
		const adminId = req.admin!.id

		const invitation = await prisma.adminInvitation.findUnique({
			where: { id: invitationId },
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
				error: 'Invitation not found'
			})
		}

		// Log the access
		await AuditLogger.logAction({
			adminId,
			action: 'INVITATION_VIEWED',
			targetType: 'invitation',
			targetId: invitationId,
			details: {
				invitationEmail: invitation.email,
				status: invitation.status
			},
			ipAddress: req.ip,
			userAgent: req.get('User-Agent')
		})

		res.json({
			success: true,
			data: { invitation }
		})
	} catch (error) {
		console.error('Get admin invitation error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Revoke an admin invitation
 */
export const revokeAdminInvitation = async (req: AdminAuthRequest, res: Response) => {
	try {
		const { invitationId } = req.params
		const adminId = req.admin!.id
		const ipAddress = req.ip
		const userAgent = req.get('User-Agent')

		// Find the invitation
		const invitation = await prisma.adminInvitation.findUnique({
			where: { id: invitationId }
		})

		if (!invitation) {
			return res.status(404).json({
				success: false,
				error: 'Invitation not found'
			})
		}

		// Check if invitation can be revoked
		if (invitation.status !== 'PENDING') {
			return res.status(400).json({
				success: false,
				error: `Cannot revoke invitation with status: ${invitation.status}`
			})
		}

		// Update invitation status
		const updatedInvitation = await prisma.adminInvitation.update({
			where: { id: invitationId },
			data: {
				status: 'REVOKED',
				updatedAt: new Date()
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

		// Log the revocation
		await AuditLogger.logAction({
			adminId,
			action: 'INVITATION_REVOKED',
			targetType: 'invitation',
			targetId: invitationId,
			details: {
				invitationEmail: invitation.email,
				invitationName: invitation.name,
				originalStatus: invitation.status,
				revokedBy: adminId
			},
			ipAddress,
			userAgent
		})

		res.json({
			success: true,
			data: {
				invitation: updatedInvitation,
				message: 'Invitation revoked successfully'
			}
		})
	} catch (error) {
		console.error('Revoke admin invitation error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Resend an admin invitation (creates a new token)
 */
export const resendAdminInvitation = async (req: AdminAuthRequest, res: Response) => {
	try {
		const { invitationId } = req.params
		const adminId = req.admin!.id
		const ipAddress = req.ip
		const userAgent = req.get('User-Agent')

		// Find the invitation
		const invitation = await prisma.adminInvitation.findUnique({
			where: { id: invitationId }
		})

		if (!invitation) {
			return res.status(404).json({
				success: false,
				error: 'Invitation not found'
			})
		}

		// Check if invitation can be resent
		if (invitation.status !== 'PENDING' && invitation.status !== 'EXPIRED') {
			return res.status(400).json({
				success: false,
				error: `Cannot resend invitation with status: ${invitation.status}`
			})
		}

		// Generate new token and extend expiration
		const jwt = require('jsonwebtoken')
		const newToken = jwt.sign(
			{ 
				email: invitation.email, 
				name: invitation.name, 
				invitedBy: invitation.invitedBy 
			},
			process.env.JWT_SECRET!,
			{ expiresIn: '7d' }
		)

		// Update invitation with new token and expiration
		const updatedInvitation = await prisma.adminInvitation.update({
			where: { id: invitationId },
			data: {
				token: newToken,
				status: 'PENDING',
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
				updatedAt: new Date()
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

		// Log the resend
		await AuditLogger.logAction({
			adminId,
			action: 'INVITATION_RESENT',
			targetType: 'invitation',
			targetId: invitationId,
			details: {
				invitationEmail: invitation.email,
				invitationName: invitation.name,
				originalStatus: invitation.status,
				resentBy: adminId
			},
			ipAddress,
			userAgent
		})

		res.json({
			success: true,
			data: {
				invitation: updatedInvitation,
				message: 'Invitation resent successfully'
			}
		})
	} catch (error) {
		console.error('Resend admin invitation error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Delete an admin invitation (permanent removal)
 */
export const deleteAdminInvitation = async (req: AdminAuthRequest, res: Response) => {
	try {
		const { invitationId } = req.params
		const adminId = req.admin!.id
		const ipAddress = req.ip
		const userAgent = req.get('User-Agent')

		// Find the invitation
		const invitation = await prisma.adminInvitation.findUnique({
			where: { id: invitationId }
		})

		if (!invitation) {
			return res.status(404).json({
				success: false,
				error: 'Invitation not found'
			})
		}

		// Delete the invitation
		await prisma.adminInvitation.delete({
			where: { id: invitationId }
		})

		// Log the deletion
		await AuditLogger.logAction({
			adminId,
			action: 'INVITATION_DELETED',
			targetType: 'invitation',
			targetId: invitationId,
			details: {
				invitationEmail: invitation.email,
				invitationName: invitation.name,
				status: invitation.status,
				deletedBy: adminId
			},
			ipAddress,
			userAgent
		})

		res.json({
			success: true,
			message: 'Invitation deleted successfully'
		})
	} catch (error) {
		console.error('Delete admin invitation error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

/**
 * Get invitation statistics
 */
export const getInvitationStats = async (req: AdminAuthRequest, res: Response) => {
	try {
		const adminId = req.admin!.id

		// Get counts by status
		const stats = await prisma.adminInvitation.groupBy({
			by: ['status'],
			_count: {
				status: true
			}
		})

		// Get recent invitations
		const recentInvitations = await prisma.adminInvitation.findMany({
			take: 5,
			orderBy: {
				createdAt: 'desc'
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

		// Transform stats into a more usable format
		const statusCounts = {
			PENDING: 0,
			ACCEPTED: 0,
			EXPIRED: 0,
			REVOKED: 0
		}

		stats.forEach(stat => {
			statusCounts[stat.status as keyof typeof statusCounts] = stat._count.status
		})

		// Log the access
		await AuditLogger.logAction({
			adminId,
			action: 'INVITATION_STATS_VIEWED',
			targetType: 'system',
			details: {
				totalInvitations: Object.values(statusCounts).reduce((a, b) => a + b, 0)
			},
			ipAddress: req.ip,
			userAgent: req.get('User-Agent')
		})

		res.json({
			success: true,
			data: {
				statusCounts,
				recentInvitations,
				totalInvitations: Object.values(statusCounts).reduce((a, b) => a + b, 0)
			}
		})
	} catch (error) {
		console.error('Get invitation stats error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}