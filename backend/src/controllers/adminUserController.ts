import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { AdminAuthRequest } from '../middleware/adminAuth'
import { logAdminAction } from '../middleware/auditMiddleware'
import {
    validateUserCreation,
    validateEmail,
    validatePassword,
    validateName,
    validateRole,
    validateSearchInput,
    validatePaginationParams,
    sanitizeString
} from '../utils/validation'

// Allow dependency injection for testing
let prisma: PrismaClient

// Initialize Prisma client
if (process.env.NODE_ENV === 'test') {
    // In test environment, prisma will be injected
    prisma = {} as PrismaClient
} else {
    prisma = new PrismaClient()
}

// Function to set prisma instance (for testing)
export const setPrismaInstance = (instance: PrismaClient) => {
    prisma = instance
}

/**
 * Interface for user search and filtering
 */
interface UserSearchFilters {
    search?: string
    role?: 'PHOTOGRAPHER' | 'CLIENT' | 'ADMIN'
    status?: 'active' | 'suspended'
    sortBy?: 'name' | 'email' | 'createdAt' | 'lastLogin'
    sortOrder?: 'asc' | 'desc'
    page?: number
    limit?: number
}

/**
 * Interface for user statistics
 */
interface UserStats {
    totalGalleries?: number
    totalPhotos?: number
    totalClients?: number
    lastLoginAt?: Date
    loginCount?: number
    storageUsed?: number
}

/**
 * Interface for detailed user information
 */
interface DetailedUser {
    id: string
    email: string
    name: string
    role: string
    createdAt: Date
    updatedAt: Date
    isActive: boolean
    suspendedAt?: Date
    suspendedBy?: string
    suspensionReason?: string
    stats: UserStats
}

/**
 * Get all users with search and filtering capabilities
 * Requirements: 2.1 - Display all users with roles, status, and key information
 */
export const getAllUsers = async (req: AdminAuthRequest, res: Response) => {
    try {
        const adminId = req.admin!.id
        const {
            search,
            role,
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 20
        } = req.query as UserSearchFilters

        // Validate pagination parameters
        const paginationValidation = validatePaginationParams(page, limit)
        if (!paginationValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid pagination parameters',
                details: paginationValidation.errors
            })
        }

        // Validate search input
        if (search) {
            const searchValidation = validateSearchInput(search as string)
            if (!searchValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid search term',
                    details: searchValidation.errors
                })
            }
        }

        // Validate role if provided
        if (role) {
            const roleValidation = validateRole(role as string)
            if (!roleValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role',
                    details: roleValidation.errors
                })
            }
        }

        // Build where clause for filtering with sanitized input
        const where: any = {}

        if (search) {
            const sanitizedSearch = sanitizeString(search as string)
            where.OR = [
                { name: { contains: sanitizedSearch, mode: 'insensitive' } },
                { email: { contains: sanitizedSearch, mode: 'insensitive' } }
            ]
        }

        if (role) {
            where.role = role
        }

        // Handle status filtering (active/suspended)
        if (status === 'suspended') {
            where.suspendedAt = { not: null }
        } else if (status === 'active') {
            where.suspendedAt = null
        }

        // Calculate pagination
        const skip = (Number(page) - 1) * Number(limit)
        const take = Number(limit)

        // Get users with basic stats
        const [users, totalCount] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                    suspendedAt: true,
                    suspendedBy: true,
                    suspensionReason: true,
                    galleries: {
                        select: { id: true }
                    },
                    clients: {
                        select: { id: true }
                    },
                    _count: {
                        select: {
                            galleries: true,
                            accessibleGalleries: true
                        }
                    }
                },
                orderBy: {
                    [sortBy]: sortOrder
                },
                skip,
                take
            }),
            prisma.user.count({ where })
        ])

        // Enhance users with additional stats
        const usersWithStats = users.map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            isActive: !user.suspendedAt,
            suspendedAt: user.suspendedAt,
            suspendedBy: user.suspendedBy,
            suspensionReason: user.suspensionReason,
            stats: {
                totalGalleries: user._count.galleries,
                totalClients: user.role === 'PHOTOGRAPHER' ? user.clients.length : 0,
                accessibleGalleries: user._count.accessibleGalleries
            }
        }))

        // Log admin action
        await logAdminAction(
            req,
            'VIEW_USER_LIST',
            'user',
            undefined,
            { filters: { search, role, status }, resultCount: users.length }
        )

        res.json({
            success: true,
            data: {
                users: usersWithStats,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: totalCount,
                    pages: Math.ceil(totalCount / Number(limit))
                }
            }
        })
    } catch (error) {
        console.error('Get all users error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve users'
        })
    }
}

/**
 * Get detailed information for a specific user
 * Requirements: 2.2 - Show user profile, gallery access, activity logs, and account status
 */
export const getUserDetails = async (req: AdminAuthRequest, res: Response) => {
    try {
        const userId = req.params.userId as string
        const adminId = req.admin!.id

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            })
        }

        // Get detailed user information
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                galleries: {
                    select: {
                        id: true,
                        title: true,
                        createdAt: true,
                        _count: {
                            select: { folders: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                accessibleGalleries: {
                    select: {
                        gallery: {
                            select: {
                                id: true,
                                title: true,
                                photographer: {
                                    select: { name: true, email: true }
                                }
                            }
                        },
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' }
                },
                clients: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' }
                },
                photographer: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            })
        }

        // Get user activity statistics
        const [photoCount, recentActivity] = await Promise.all([
            // Count photos in user's galleries
            user.role === 'PHOTOGRAPHER' ? prisma.photo.count({
                where: {
                    folder: {
                        gallery: {
                            photographerId: userId
                        }
                    }
                }
            }) : 0,
            // Get recent admin audit logs for this user
            prisma.adminAuditLog.findMany({
                where: {
                    OR: [
                        { targetId: userId },
                        { adminId: userId }
                    ]
                },
                select: {
                    id: true,
                    action: true,
                    targetType: true,
                    createdAt: true,
                    admin: {
                        select: { name: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            })
        ])

        const detailedUser: DetailedUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            isActive: !user.suspendedAt,
            suspendedAt: user.suspendedAt || undefined,
            suspendedBy: user.suspendedBy || undefined,
            suspensionReason: user.suspensionReason || undefined,
            stats: {
                totalGalleries: user.galleries.length,
                totalPhotos: photoCount,
                totalClients: user.clients.length
            }
        }

        // Log admin action
        await logAdminAction(
            req,
            'VIEW_USER_DETAILS',
            'user',
            userId,
            { userRole: user.role, userEmail: user.email }
        )

        res.json({
            success: true,
            data: {
                user: detailedUser,
                galleries: user.galleries,
                accessibleGalleries: user.accessibleGalleries,
                clients: user.clients,
                photographer: user.photographer,
                recentActivity
            }
        })
    } catch (error) {
        console.error('Get user details error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve user details'
        })
    }
}

/**
 * Update user role with proper validation
 * Requirements: 2.4 - Allow role changes with confirmation prompts
 */
export const updateUserRole = async (req: AdminAuthRequest, res: Response) => {
    try {
        const userId = req.params.userId as string
        const { role, reason } = req.body
        const adminId = req.admin!.id

        if (!userId || !role) {
            return res.status(400).json({
                success: false,
                error: 'User ID and role are required'
            })
        }

        // Validate role
        const validRoles = ['PHOTOGRAPHER', 'CLIENT', 'ADMIN']
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role specified'
            })
        }

        // Get current user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, role: true }
        })

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            })
        }

        // Prevent admin from changing their own role
        if (userId === adminId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot change your own role'
            })
        }

        // Store old role for logging
        const oldRole = user.role

        // Update user role
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                updatedAt: true
            }
        })

        // Log admin action
        await logAdminAction(
            req,
            'UPDATE_USER_ROLE',
            'user',
            userId,
            {
                targetUserEmail: user.email,
                oldRole,
                newRole: role,
                reason: reason || 'No reason provided'
            }
        )

        res.json({
            success: true,
            data: { user: updatedUser },
            message: `User role updated from ${oldRole} to ${role}`
        })
    } catch (error) {
        console.error('Update user role error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to update user role'
        })
    }
}

/**
 * Suspend a user account
 * Requirements: 2.5 - Immediately update access permissions and notify the user
 */
export const suspendUser = async (req: AdminAuthRequest, res: Response) => {
    try {
        const userId = req.params.userId as string
        const { reason } = req.body
        const adminId = req.admin!.id

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            })
        }

        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Suspension reason is required'
            })
        }

        // Get current user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, suspendedAt: true }
        })

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            })
        }

        // Prevent admin from suspending themselves
        if (userId === adminId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot suspend your own account'
            })
        }

        // Check if user is already suspended
        if (user.suspendedAt) {
            return res.status(400).json({
                success: false,
                error: 'User is already suspended'
            })
        }

        // Suspend user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                suspendedAt: new Date(),
                suspendedBy: adminId,
                suspensionReason: reason.trim()
            },
            select: {
                id: true,
                email: true,
                name: true,
                suspendedAt: true,
                suspensionReason: true
            }
        })

        // Log admin action
        await logAdminAction(
            req,
            'SUSPEND_USER',
            'user',
            userId,
            {
                targetUserEmail: user.email,
                reason: reason.trim()
            }
        )

        res.json({
            success: true,
            data: { user: updatedUser },
            message: 'User suspended successfully'
        })
    } catch (error) {
        console.error('Suspend user error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to suspend user'
        })
    }
}

/**
 * Activate a suspended user account
 * Requirements: 2.5 - Immediately update access permissions
 */
export const activateUser = async (req: AdminAuthRequest, res: Response) => {
    try {
        const userId = req.params.userId as string
        const { reason } = req.body
        const adminId = req.admin!.id

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            })
        }

        // Get current user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, suspendedAt: true }
        })

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            })
        }

        // Check if user is actually suspended
        if (!user.suspendedAt) {
            return res.status(400).json({
                success: false,
                error: 'User is not suspended'
            })
        }

        // Activate user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                suspendedAt: null,
                suspendedBy: null,
                suspensionReason: null
            },
            select: {
                id: true,
                email: true,
                name: true,
                suspendedAt: true
            }
        })

        // Log admin action
        await logAdminAction(
            req,
            'ACTIVATE_USER',
            'user',
            userId,
            {
                targetUserEmail: user.email,
                reason: reason || 'No reason provided'
            }
        )

        res.json({
            success: true,
            data: { user: updatedUser },
            message: 'User activated successfully'
        })
    } catch (error) {
        console.error('Activate user error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to activate user'
        })
    }
}/*
*
 * Delete a user account with proper data cleanup
 * Requirements: 2.6 - Require confirmation and handle data cleanup appropriately
 */
export const deleteUser = async (req: AdminAuthRequest, res: Response) => {
    try {
        const userId = req.params.userId as string
        const { reason, confirmEmail } = req.body
        const adminId = req.admin!.id

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            })
        }

        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Deletion reason is required'
            })
        }

        // Get current user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                galleries: { select: { id: true } },
                clients: { select: { id: true } }
            }
        })

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            })
        }

        // Prevent admin from deleting themselves
        if (userId === adminId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete your own account'
            })
        }

        // Require email confirmation for deletion
        if (confirmEmail !== user.email) {
            return res.status(400).json({
                success: false,
                error: 'Email confirmation does not match user email'
            })
        }

        // Log admin action before deletion
        await logAdminAction(
            req,
            'DELETE_USER',
            'user',
            userId,
            {
                targetUserEmail: user.email,
                targetUserName: user.name,
                targetUserRole: user.role,
                reason: reason.trim(),
                galleriesCount: user.galleries.length,
                clientsCount: user.clients.length
            }
        )

        // Delete user (Prisma will handle cascade deletions based on schema)
        await prisma.user.delete({
            where: { id: userId }
        })

        res.json({
            success: true,
            message: 'User deleted successfully',
            data: {
                deletedUser: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            }
        })
    } catch (error) {
        console.error('Delete user error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        })
    }
}

/**
 * Get user statistics and activity tracking
 * Requirements: 2.6 - Create user statistics and activity tracking endpoints
 */
export const getUserStatistics = async (req: AdminAuthRequest, res: Response) => {
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

        // Get comprehensive user statistics
        const [
            totalUsers,
            activeUsers,
            suspendedUsers,
            usersByRole,
            recentUsers,
            userActivity
        ] = await Promise.all([
            // Total users count
            prisma.user.count(),

            // Active users (not suspended)
            prisma.user.count({
                where: { suspendedAt: null }
            }),

            // Suspended users
            prisma.user.count({
                where: { suspendedAt: { not: null } }
            }),

            // Users by role
            prisma.user.groupBy({
                by: ['role'],
                _count: { role: true }
            }),

            // Recent users (created in time range)
            prisma.user.count({
                where: {
                    createdAt: { gte: startDate }
                }
            }),

            // User activity from audit logs
            prisma.adminAuditLog.groupBy({
                by: ['action'],
                where: {
                    createdAt: { gte: startDate },
                    targetType: 'user'
                },
                _count: { action: true }
            })
        ])

        // Get top photographers by gallery count
        const topPhotographers = await prisma.user.findMany({
            where: { role: 'PHOTOGRAPHER' },
            select: {
                id: true,
                name: true,
                email: true,
                _count: {
                    select: {
                        galleries: true,
                        clients: true
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

        // Get recent user registrations
        const recentRegistrations = await prisma.user.findMany({
            where: {
                createdAt: { gte: startDate }
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        })

        // Format role statistics
        const roleStats = usersByRole.reduce((acc, item) => {
            acc[item.role] = item._count.role
            return acc
        }, {} as Record<string, number>)

        // Log admin action
        await logAdminAction(
            req,
            'VIEW_USER_STATISTICS',
            'system',
            undefined,
            { timeRange }
        )

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    activeUsers,
                    suspendedUsers,
                    recentUsers,
                    timeRange
                },
                roleDistribution: roleStats,
                topPhotographers,
                recentRegistrations,
                activitySummary: userActivity
            }
        })
    } catch (error) {
        console.error('Get user statistics error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve user statistics'
        })
    }
}

/**
 * Search users with advanced filtering
 * Requirements: 2.3 - Provide search and filter capabilities by name, email, role, and status
 */
export const searchUsers = async (req: AdminAuthRequest, res: Response) => {
    try {
        const adminId = req.admin!.id
        const {
            q: searchQuery,
            role,
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 20
        } = req.query as any

        if (!searchQuery || searchQuery.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            })
        }

        // Build search conditions
        const where: any = {
            OR: [
                { name: { contains: searchQuery.trim(), mode: 'insensitive' } },
                { email: { contains: searchQuery.trim(), mode: 'insensitive' } }
            ]
        }

        // Add additional filters
        if (role) {
            where.role = role
        }

        if (status === 'suspended') {
            where.suspendedAt = { not: null }
        } else if (status === 'active') {
            where.suspendedAt = null
        }

        // Calculate pagination
        const skip = (Number(page) - 1) * Number(limit)
        const take = Number(limit)

        // Search users
        const [users, totalCount] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    createdAt: true,
                    suspendedAt: true,
                    _count: {
                        select: {
                            galleries: true,
                            clients: true,
                            accessibleGalleries: true
                        }
                    }
                },
                orderBy: {
                    [sortBy]: sortOrder
                },
                skip,
                take
            }),
            prisma.user.count({ where })
        ])

        // Log admin action
        await logAdminAction(
            req,
            'SEARCH_USERS',
            'user',
            undefined,
            {
                searchQuery: searchQuery.trim(),
                filters: { role, status },
                resultCount: users.length
            }
        )

        res.json({
            success: true,
            data: {
                users: users.map(user => ({
                    ...user,
                    isActive: !user.suspendedAt,
                    stats: {
                        totalGalleries: user._count.galleries,
                        totalClients: user._count.clients,
                        accessibleGalleries: user._count.accessibleGalleries
                    }
                })),
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: totalCount,
                    pages: Math.ceil(totalCount / Number(limit))
                },
                searchQuery: searchQuery.trim()
            }
        })
    } catch (error) {
        console.error('Search users error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to search users'
        })
    }
}

/**
 * Approve a pending photographer account
 * Requirements: 2.5 - Approve pending photographer registrations
 */
export const approvePendingUser = async (req: AdminAuthRequest, res: Response) => {
    try {
        const userId = req.params.userId as string
        const { reason } = req.body
        const adminId = req.admin!.id

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            })
        }

        // Get the pending user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                suspendedAt: true,
                suspensionReason: true
            }
        })

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            })
        }

        // Check if user is actually pending approval
        if (!user.suspendedAt || !user.suspensionReason?.includes('Pending admin approval')) {
            return res.status(400).json({
                success: false,
                error: 'User is not pending approval'
            })
        }

        // Approve the user by removing suspension
        const approvedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                suspendedAt: null,
                suspendedBy: null,
                suspensionReason: null
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                suspendedAt: true
            }
        })

        // Log admin action
        await logAdminAction(
            req,
            'APPROVE_USER',
            'user',
            userId,
            {
                targetUserEmail: user.email,
                targetUserRole: user.role,
                reason: reason || 'Photographer account approved'
            }
        )

        res.json({
            success: true,
            data: { user: approvedUser },
            message: 'User approved successfully'
        })
    } catch (error) {
        console.error('Approve user error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to approve user'
        })
    }
}

/**
 * Get pending user approvals
 * Requirements: 2.1 - Display pending photographer registrations
 */
export const getPendingApprovals = async (req: AdminAuthRequest, res: Response) => {
    try {
        const adminId = req.admin!.id

        // Get users pending approval
        const pendingUsers = await prisma.user.findMany({
            where: {
                suspendedAt: { not: null },
                suspensionReason: { contains: 'Pending admin approval' }
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                suspendedAt: true,
                suspensionReason: true
            },
            orderBy: { createdAt: 'desc' }
        })

        // Log admin action
        await logAdminAction(
            req,
            'VIEW_PENDING_APPROVALS',
            'user',
            undefined,
            { pendingCount: pendingUsers.length }
        )

        res.json({
            success: true,
            data: {
                pendingUsers,
                count: pendingUsers.length
            }
        })
    } catch (error) {
        console.error('Get pending approvals error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve pending approvals'
        })
    }
}

/**
 * Create a new user account (admin only)
 */
export const createUser = async (req: AdminAuthRequest, res: Response) => {
    try {
        const { email, name, password, role = 'CLIENT' } = req.body
        const adminId = req.admin!.id

        // Comprehensive validation
        const validation = validateUserCreation({ email, name, password, role })
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validation.errors
            })
        }

        // Additional password strength check for admin-created users
        const passwordValidation = validatePassword(password, {
            minLength: 12,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true
        })

        if (passwordValidation.strength === 'weak') {
            return res.status(400).json({
                success: false,
                error: 'Password is too weak for admin-created accounts',
                details: passwordValidation.errors
            })
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        })

        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists'
            })
        }

        // Hash password with high salt rounds for admin-created users
        const hashedPassword = await bcrypt.hash(password, 14)

        // Create user with sanitized data
        const newUser = await prisma.user.create({
            data: {
                email: email.toLowerCase().trim(),
                name: sanitizeString(name).trim(),
                password: hashedPassword,
                role
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        })

        // Log admin action
        await logAdminAction(
            req,
            'CREATE_USER',
            'user',
            newUser.id,
            {
                targetUserEmail: newUser.email,
                targetUserRole: newUser.role
            }
        )

        res.status(201).json({
            success: true,
            data: { user: newUser },
            message: 'User created successfully'
        })
    } catch (error) {
        console.error('Create user error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to create user'
        })
    }
}

