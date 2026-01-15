import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { deleteFromS3 } from '../utils/s3Storage'
import { AdminAuthRequest } from '../middleware/adminAuth'
import { logAdminAction, logBulkAdminAction } from '../middleware/auditMiddleware'

const prisma = new PrismaClient()

interface GallerySearchFilters {
  search?: string
  photographerId?: string
  status?: 'active' | 'expired' | 'password_protected' | 'public'
  dateFrom?: string
  dateTo?: string
  sortBy?: 'created' | 'updated' | 'title' | 'photos' | 'downloads'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

interface GalleryWithStats {
  id: string
  title: string
  description?: string | null
  password?: string | null
  expiresAt?: Date | null
  downloadLimit?: number | null
  downloadCount: number
  photographerId: string
  createdAt: Date
  updatedAt: Date
  photographer: {
    id: string
    name: string
    email: string
  }
  stats: {
    totalPhotos: number
    totalFolders: number
    totalLikes: number
    totalFavorites: number
    storageUsed: number
    clientsWithAccess: number
    lastActivity?: Date
  }
  status: 'active' | 'expired' | 'password_protected' | 'public'
}

/**
 * Get all galleries across all photographers with search and filtering
 * Requirements: 3.1, 3.2, 3.3
 */
export const getAllGalleries = async (req: AdminAuthRequest, res: Response) => {
  try {
    const {
      search,
      photographerId,
      status,
      dateFrom,
      dateTo,
      sortBy = 'created',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query as GallerySearchFilters

    // Build where clause for filtering
    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { photographer: { name: { contains: search, mode: 'insensitive' } } },
        { photographer: { email: { contains: search, mode: 'insensitive' } } }
      ]
    }

    if (photographerId) {
      where.photographerId = photographerId
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }

    // Status filtering
    if (status) {
      const now = new Date()
      switch (status) {
        case 'expired':
          where.expiresAt = { lt: now }
          break
        case 'password_protected':
          where.password = { not: null }
          break
        case 'public':
          where.password = null
          break
        case 'active':
          where.OR = [
            { expiresAt: null },
            { expiresAt: { gte: now } }
          ]
          break
      }
    }

    // Build orderBy clause
    let orderBy: any = {}
    switch (sortBy) {
      case 'title':
        orderBy = { title: sortOrder }
        break
      case 'updated':
        orderBy = { updatedAt: sortOrder }
        break
      case 'photos':
        // This will be handled after fetching due to aggregation complexity
        orderBy = { createdAt: sortOrder }
        break
      case 'downloads':
        orderBy = { downloadCount: sortOrder }
        break
      default:
        orderBy = { createdAt: sortOrder }
    }

    const skip = (Number(page) - 1) * Number(limit)

    // Get galleries with comprehensive data
    const galleries = await prisma.gallery.findMany({
      where,
      include: {
        photographer: {
          select: { id: true, name: true, email: true }
        },
        folders: {
          select: {
            _count: { select: { photos: true } }
          }
        },
        likedBy: { select: { userId: true } },
        favoritedBy: { select: { userId: true } },
        accessibleBy: {
          select: {
            userId: true,
            user: { select: { name: true, email: true } }
          }
        },
        _count: {
          select: {
            folders: true,
            likedBy: true,
            favoritedBy: true,
            accessibleBy: true
          }
        }
      },
      orderBy,
      skip,
      take: Number(limit)
    })

    // Get total count for pagination
    const totalCount = await prisma.gallery.count({ where })

    // Get storage stats for all galleries at once using raw SQL
    const galleryIds = galleries.map(g => g.id)
    let storageStats = new Map()

    if (galleryIds.length > 0) {
      const stats = await prisma.$queryRaw`
        SELECT 
          f."galleryId" as "galleryId",
          COALESCE(SUM(p."fileSize"), 0) as "storageUsed",
          MAX(p."createdAt") as "lastPhotoDate"
        FROM folders f
        LEFT JOIN photos p ON p."folderId" = f.id
        WHERE f."galleryId" = ANY(${galleryIds})
        GROUP BY f."galleryId"
      ` as any[]

      stats.forEach(s => {
        storageStats.set(s.galleryId, {
          storageUsed: Number(s.storageUsed),
          lastPhotoDate: s.lastPhotoDate
        })
      })
    }

    // Transform galleries to include statistics and status
    const galleriesWithStats: GalleryWithStats[] = galleries.map(gallery => {
      const now = new Date()
      const totalPhotos = gallery.folders.reduce((sum, folder) => sum + folder._count.photos, 0)
      const storage = storageStats.get(gallery.id) || { storageUsed: 0, lastPhotoDate: null }

      // Determine gallery status
      let status: 'active' | 'expired' | 'password_protected' | 'public' = 'active'
      if (gallery.expiresAt && gallery.expiresAt < now) {
        status = 'expired'
      } else if (gallery.password) {
        status = 'password_protected'
      } else {
        status = 'public'
      }

      return {
        id: gallery.id,
        title: gallery.title,
        description: gallery.description,
        password: gallery.password,
        expiresAt: gallery.expiresAt,
        downloadLimit: gallery.downloadLimit,
        downloadCount: gallery.downloadCount,
        photographerId: gallery.photographerId,
        createdAt: gallery.createdAt,
        updatedAt: gallery.updatedAt,
        photographer: gallery.photographer,
        stats: {
          totalPhotos,
          totalFolders: gallery._count.folders,
          totalLikes: gallery._count.likedBy,
          totalFavorites: gallery._count.favoritedBy,
          storageUsed: storage.storageUsed,
          clientsWithAccess: gallery._count.accessibleBy,
          lastActivity: storage.lastPhotoDate || gallery.updatedAt
        },
        status
      }
    })

    // Sort by photos if requested (post-processing sort)
    if (sortBy === 'photos') {
      galleriesWithStats.sort((a, b) => {
        const comparison = a.stats.totalPhotos - b.stats.totalPhotos
        return sortOrder === 'desc' ? -comparison : comparison
      })
    }

    await logAdminAction(
      req,
      'ADMIN_GALLERY_LIST_VIEW',
      'gallery',
      undefined,
      {
        filters: { search, photographerId, status, dateFrom, dateTo },
        pagination: { page, limit },
        totalResults: totalCount
      }
    )

    res.json({
      success: true,
      data: {
        galleries: galleriesWithStats,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / Number(limit))
        }
      }
    })
  } catch (error) {
    console.error('Admin get all galleries error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

/**
 * Get detailed gallery information for admin oversight
 * Requirements: 3.2, 3.3, 3.5
 */
export const getGalleryDetails = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const gallery = await prisma.gallery.findUnique({
      where: { id },
      include: {
        photographer: {
          select: { id: true, name: true, email: true, createdAt: true }
        },
        folders: {
          include: {
            photos: {
              include: {
                likedBy: {
                  select: {
                    userId: true,
                    user: { select: { name: true, email: true } },
                    createdAt: true
                  }
                },
                favoritedBy: {
                  select: {
                    userId: true,
                    user: { select: { name: true, email: true } },
                    createdAt: true
                  }
                },
                postBy: {
                  select: {
                    userId: true,
                    user: { select: { name: true, email: true } },
                    createdAt: true
                  }
                }
              }
            },
            children: {
              include: {
                _count: { select: { photos: true } }
              }
            },
            _count: { select: { photos: true, children: true } }
          }
        },
        likedBy: {
          select: {
            userId: true,
            user: { select: { name: true, email: true } },
            createdAt: true
          }
        },
        favoritedBy: {
          select: {
            userId: true,
            user: { select: { name: true, email: true } },
            createdAt: true
          }
        },
        accessibleBy: {
          select: {
            userId: true,
            user: { select: { name: true, email: true } },
            createdAt: true
          }
        }
      }
    })

    if (!gallery) {
      return res.status(404).json({
        success: false,
        error: 'Gallery not found'
      })
    }

    // Calculate comprehensive statistics
    const totalPhotos = gallery.folders.reduce((sum, folder) => sum + folder._count.photos, 0)
    const storageUsed = gallery.folders.reduce((sum, folder) =>
      sum + folder.photos.reduce((photoSum, photo) => photoSum + photo.fileSize, 0), 0
    )

    // Activity analysis
    const allPhotos = gallery.folders.flatMap(folder => folder.photos)
    const totalDownloads = allPhotos.reduce((sum, photo) => sum + photo.downloadCount, 0)
    const totalLikes = allPhotos.reduce((sum, photo) => sum + photo.likedBy.length, 0)
    const totalFavorites = allPhotos.reduce((sum, photo) => sum + photo.favoritedBy.length, 0)

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentActivity = {
      newPhotos: allPhotos.filter(photo => photo.createdAt > thirtyDaysAgo).length,
      newLikes: allPhotos.flatMap(photo => photo.likedBy).filter(like => like.createdAt > thirtyDaysAgo).length,
      newFavorites: allPhotos.flatMap(photo => photo.favoritedBy).filter(fav => fav.createdAt > thirtyDaysAgo).length
    }

    const detailedGallery = {
      ...gallery,
      stats: {
        totalPhotos,
        totalFolders: gallery.folders.length,
        storageUsed,
        totalDownloads,
        totalLikes,
        totalFavorites,
        clientsWithAccess: gallery.accessibleBy.length,
        recentActivity
      },
      status: gallery.expiresAt && gallery.expiresAt < new Date() ? 'expired' :
        gallery.password ? 'password_protected' : 'public'
    }

    await logAdminAction(
      req,
      'ADMIN_GALLERY_DETAIL_VIEW',
      'gallery',
      id,
      {
        galleryTitle: gallery.title,
        photographerName: gallery.photographer.name,
        totalPhotos,
        storageUsed
      }
    )

    res.json({
      success: true,
      data: detailedGallery
    })
  } catch (error) {
    console.error('Admin get gallery details error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

/**
 * Update gallery settings for admin oversight
 * Requirements: 3.4
 */
export const updateGallerySettings = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { title, description, password, expiresAt, downloadLimit, isActive } = req.body

    // Get existing gallery for audit logging
    const existingGallery = await prisma.gallery.findUnique({
      where: { id },
      include: {
        photographer: { select: { name: true, email: true } }
      }
    })

    if (!existingGallery) {
      return res.status(404).json({
        success: false,
        error: 'Gallery not found'
      })
    }

    // Prepare update data
    const updateData: any = {}
    const changes: any = {}

    if (title !== undefined && title !== existingGallery.title) {
      updateData.title = title
      changes.title = { from: existingGallery.title, to: title }
    }

    if (description !== undefined && description !== existingGallery.description) {
      updateData.description = description
      changes.description = { from: existingGallery.description, to: description }
    }

    if (downloadLimit !== undefined && downloadLimit !== existingGallery.downloadLimit) {
      updateData.downloadLimit = downloadLimit
      changes.downloadLimit = { from: existingGallery.downloadLimit, to: downloadLimit }
    }

    // Handle password update
    if (password !== undefined) {
      const newHashedPassword = password ? await bcrypt.hash(password, 12) : null
      updateData.password = newHashedPassword
      changes.password = {
        from: existingGallery.password ? 'protected' : 'public',
        to: password ? 'protected' : 'public'
      }
    }

    // Handle expiry date
    if (expiresAt !== undefined) {
      if (expiresAt) {
        const expiryDate = new Date(expiresAt)
        if (expiryDate < new Date()) {
          return res.status(400).json({
            success: false,
            error: 'Expiry date cannot be in the past'
          })
        }
        updateData.expiresAt = expiryDate
        changes.expiresAt = { from: existingGallery.expiresAt, to: expiryDate }
      } else {
        updateData.expiresAt = null
        changes.expiresAt = { from: existingGallery.expiresAt, to: null }
      }
    }

    // Handle gallery deactivation (soft delete approach)
    if (isActive !== undefined && isActive !== (existingGallery.expiresAt === null || existingGallery.expiresAt > new Date())) {
      if (!isActive) {
        // Deactivate by setting expiry to now
        updateData.expiresAt = new Date()
        changes.status = { from: 'active', to: 'deactivated' }
      } else if (existingGallery.expiresAt && existingGallery.expiresAt <= new Date()) {
        // Reactivate by removing expiry
        updateData.expiresAt = null
        changes.status = { from: 'deactivated', to: 'active' }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No changes provided'
      })
    }

    const updatedGallery = await prisma.gallery.update({
      where: { id },
      data: updateData,
      include: {
        photographer: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    await logAdminAction(
      req,
      'ADMIN_GALLERY_UPDATE',
      'gallery',
      id,
      {
        galleryTitle: existingGallery.title,
        photographerName: existingGallery.photographer.name,
        changes
      }
    )

    res.json({
      success: true,
      data: updatedGallery,
      message: 'Gallery updated successfully'
    })
  } catch (error) {
    console.error('Admin update gallery error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

/**
 * Get gallery statistics and analytics
 * Requirements: 3.4, 3.6
 */
export const getGalleryAnalytics = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { timeRange = '30d' } = req.query

    // Calculate date range
    let dateFrom: Date
    switch (timeRange) {
      case '7d':
        dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        dateFrom = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get overall gallery statistics
    const totalGalleries = await prisma.gallery.count()
    const activeGalleries = await prisma.gallery.count({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    })
    const expiredGalleries = await prisma.gallery.count({
      where: {
        expiresAt: { lte: new Date() }
      }
    })
    const passwordProtectedGalleries = await prisma.gallery.count({
      where: { password: { not: null } }
    })

    // Get galleries created in time range
    const newGalleries = await prisma.gallery.count({
      where: { createdAt: { gte: dateFrom } }
    })

    // Get storage statistics
    const storageStats = await prisma.$queryRaw`
      SELECT 
        COUNT(p.id) as total_photos,
        SUM(p."fileSize") as total_storage,
        AVG(p."fileSize") as avg_photo_size
      FROM photos p
      JOIN folders f ON p."folderId" = f.id
      JOIN galleries g ON f."galleryId" = g.id
    ` as any[]

    // Get top photographers by gallery count
    const topPhotographers = await prisma.user.findMany({
      where: { role: 'PHOTOGRAPHER' },
      include: {
        galleries: {
          select: { id: true, title: true, createdAt: true }
        },
        _count: { select: { galleries: true } }
      },
      orderBy: { galleries: { _count: 'desc' } },
      take: 10
    })

    // Get activity trends (galleries created per day in time range)
    const activityTrends = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as galleries_created
      FROM galleries
      WHERE "createdAt" >= ${dateFrom}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    ` as any[]

    // Get download statistics
    const downloadStats = await prisma.$queryRaw`
      SELECT 
        SUM(g."downloadCount") as total_gallery_downloads,
        SUM(p."downloadCount") as total_photo_downloads,
        AVG(g."downloadCount") as avg_gallery_downloads
      FROM galleries g
      LEFT JOIN folders f ON g.id = f."galleryId"
      LEFT JOIN photos p ON f.id = p."folderId"
    ` as any[]

    const analytics = {
      overview: {
        totalGalleries,
        activeGalleries,
        expiredGalleries,
        passwordProtectedGalleries,
        newGalleries
      },
      storage: {
        totalPhotos: Number(storageStats[0]?.total_photos || 0),
        totalStorage: Number(storageStats[0]?.total_storage || 0),
        averagePhotoSize: Number(storageStats[0]?.avg_photo_size || 0)
      },
      downloads: {
        totalGalleryDownloads: Number(downloadStats[0]?.total_gallery_downloads || 0),
        totalPhotoDownloads: Number(downloadStats[0]?.total_photo_downloads || 0),
        averageGalleryDownloads: Number(downloadStats[0]?.avg_gallery_downloads || 0)
      },
      topPhotographers: topPhotographers.map(photographer => ({
        id: photographer.id,
        name: photographer.name,
        email: photographer.email,
        galleryCount: photographer._count.galleries,
        recentGalleries: photographer.galleries
          .filter(g => g.createdAt >= dateFrom)
          .length
      })),
      activityTrends: activityTrends.map(trend => ({
        date: trend.date,
        galleriesCreated: Number(trend.galleries_created)
      }))
    }

    await logAdminAction(
      req,
      'ADMIN_GALLERY_ANALYTICS_VIEW',
      'system',
      undefined,
      { timeRange, totalGalleries, activeGalleries }
    )

    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    console.error('Admin gallery analytics error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

/**
 * Manage gallery access for clients
 * Requirements: 3.5
 */
export const manageGalleryAccess = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { clientIds, action } = req.body // action: 'grant' | 'revoke'

    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Client IDs array is required'
      })
    }

    if (!['grant', 'revoke'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be either "grant" or "revoke"'
      })
    }

    // Verify gallery exists
    const gallery = await prisma.gallery.findUnique({
      where: { id },
      include: {
        photographer: { select: { name: true, email: true } }
      }
    })

    if (!gallery) {
      return res.status(404).json({
        success: false,
        error: 'Gallery not found'
      })
    }

    // Verify all client IDs exist and are clients
    const clients = await prisma.user.findMany({
      where: {
        id: { in: clientIds },
        role: 'CLIENT'
      },
      select: { id: true, name: true, email: true }
    })

    if (clients.length !== clientIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Some client IDs are invalid or not client users'
      })
    }

    let result
    if (action === 'grant') {
      // Grant access
      result = await prisma.galleryAccess.createMany({
        data: clientIds.map((clientId: string) => ({
          galleryId: id,
          userId: clientId
        })),
        skipDuplicates: true
      })

      await logBulkAdminAction(
        req,
        'ADMIN_GALLERY_ACCESS_GRANTED',
        'gallery',
        clients.map(client => ({
          id: client.id,
          details: {
            clientName: client.name,
            clientEmail: client.email,
            galleryTitle: gallery.title,
            photographerName: gallery.photographer.name
          }
        })),
        { galleryId: id, action: 'grant' }
      )
    } else {
      // Revoke access
      result = await prisma.galleryAccess.deleteMany({
        where: {
          galleryId: id,
          userId: { in: clientIds }
        }
      })

      await logBulkAdminAction(
        req,
        'ADMIN_GALLERY_ACCESS_REVOKED',
        'gallery',
        clients.map(client => ({
          id: client.id,
          details: {
            clientName: client.name,
            clientEmail: client.email,
            galleryTitle: gallery.title,
            photographerName: gallery.photographer.name
          }
        })),
        { galleryId: id, action: 'revoke' }
      )
    }

    res.json({
      success: true,
      message: `Gallery access ${action === 'grant' ? 'granted to' : 'revoked from'} ${clients.length} client(s)`,
      data: {
        affectedClients: clients,
        operationCount: result.count || clients.length
      }
    })
  } catch (error) {
    console.error('Admin manage gallery access error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

/**
 * Delete gallery with comprehensive cleanup
 * Requirements: 3.6
 */
export const deleteGallery = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    // Get gallery with all related data for cleanup and audit
    const gallery = await prisma.gallery.findUnique({
      where: { id },
      include: {
        photographer: { select: { name: true, email: true } },
        folders: {
          include: {
            photos: {
              select: {
                id: true,
                filename: true,
                originalUrl: true,
                thumbnailUrl: true,
                largeUrl: true,
                mediumUrl: true,
                fileSize: true
              }
            }
          }
        },
        accessibleBy: {
          include: {
            user: { select: { name: true, email: true } }
          }
        },
        _count: {
          select: {
            folders: true,
            likedBy: true,
            favoritedBy: true,
            accessibleBy: true
          }
        }
      }
    })

    if (!gallery) {
      return res.status(404).json({
        success: false,
        error: 'Gallery not found'
      })
    }

    // Calculate statistics for audit log
    const allPhotos = gallery.folders.flatMap(folder => folder.photos)
    const totalPhotos = allPhotos.length
    const totalStorage = allPhotos.reduce((sum, photo) => sum + photo.fileSize, 0)

    // Delete all photos from S3 storage
    if (allPhotos.length > 0) {
      try {
        const deletePromises = allPhotos.map(async (photo) => {
          const urlsToDelete = [
            photo.originalUrl,
            photo.thumbnailUrl,
            photo.largeUrl,
            photo.mediumUrl
          ].filter(Boolean)

          const deleteS3Promises = urlsToDelete.map(url => {
            try {
              const urlObj = new URL(url!)
              const pathParts = urlObj.pathname.split('/')
              const key = pathParts.slice(2).join('/') // Remove empty string and bucket name
              return deleteFromS3(key)
            } catch (error) {
              console.error(`Failed to parse URL for deletion: ${url}`, error)
              return Promise.resolve()
            }
          })

          return Promise.all(deleteS3Promises)
        })

        await Promise.all(deletePromises)
        console.log(`Deleted ${totalPhotos} photos from S3 for gallery ${id}`)
      } catch (storageError) {
        console.error('Storage deletion error during admin gallery deletion:', storageError)
        // Continue with database deletion even if storage fails
      }
    }

    // Delete gallery from database (cascades to folders, photos, likes, favorites, access)
    await prisma.gallery.delete({
      where: { id }
    })

    await logAdminAction(
      req,
      'ADMIN_GALLERY_DELETE',
      'gallery',
      id,
      {
        galleryTitle: gallery.title,
        photographerName: gallery.photographer.name,
        photographerEmail: gallery.photographer.email,
        reason: reason || 'No reason provided',
        statistics: {
          totalPhotos,
          totalFolders: gallery._count.folders,
          totalStorage,
          clientsWithAccess: gallery._count.accessibleBy,
          totalLikes: gallery._count.likedBy,
          totalFavorites: gallery._count.favoritedBy
        },
        affectedClients: gallery.accessibleBy.map(access => ({
          name: access.user.name,
          email: access.user.email
        }))
      }
    )

    res.json({
      success: true,
      message: 'Gallery deleted successfully',
      data: {
        deletedGallery: {
          id: gallery.id,
          title: gallery.title,
          photographer: gallery.photographer
        },
        statistics: {
          photosDeleted: totalPhotos,
          foldersDeleted: gallery._count.folders,
          storageFreed: totalStorage,
          clientAccessRevoked: gallery._count.accessibleBy
        }
      }
    })
  } catch (error) {
    console.error('Admin delete gallery error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

/**
 * Bulk operations on galleries
 * Requirements: 3.4, 3.6
 */
export const bulkGalleryOperations = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { galleryIds, operation, operationData } = req.body

    if (!Array.isArray(galleryIds) || galleryIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Gallery IDs array is required'
      })
    }

    if (!['delete', 'expire', 'activate', 'update_settings'].includes(operation)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid operation'
      })
    }

    // Verify all galleries exist
    const galleries = await prisma.gallery.findMany({
      where: { id: { in: galleryIds } },
      include: {
        photographer: { select: { name: true, email: true } }
      }
    })

    if (galleries.length !== galleryIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Some gallery IDs are invalid'
      })
    }

    let results: any = {}

    switch (operation) {
      case 'expire':
        results = await prisma.gallery.updateMany({
          where: { id: { in: galleryIds } },
          data: { expiresAt: new Date() }
        })

        await logBulkAdminAction(
          req,
          'ADMIN_GALLERY_BULK_EXPIRE',
          'gallery',
          galleries.map(g => ({
            id: g.id,
            details: {
              galleryTitle: g.title,
              photographerName: g.photographer.name
            }
          })),
          { operation: 'expire', totalGalleries: galleries.length }
        )
        break

      case 'activate':
        results = await prisma.gallery.updateMany({
          where: { id: { in: galleryIds } },
          data: { expiresAt: null }
        })

        await logBulkAdminAction(
          req,
          'ADMIN_GALLERY_BULK_ACTIVATE',
          'gallery',
          galleries.map(g => ({
            id: g.id,
            details: {
              galleryTitle: g.title,
              photographerName: g.photographer.name
            }
          })),
          { operation: 'activate', totalGalleries: galleries.length }
        )
        break

      case 'update_settings':
        if (!operationData) {
          return res.status(400).json({
            success: false,
            error: 'Operation data required for update_settings'
          })
        }

        const updateData: any = {}
        if (operationData.downloadLimit !== undefined) {
          updateData.downloadLimit = operationData.downloadLimit
        }
        if (operationData.expiresAt !== undefined) {
          updateData.expiresAt = operationData.expiresAt ? new Date(operationData.expiresAt) : null
        }

        results = await prisma.gallery.updateMany({
          where: { id: { in: galleryIds } },
          data: updateData
        })

        await logBulkAdminAction(
          req,
          'ADMIN_GALLERY_BULK_UPDATE',
          'gallery',
          galleries.map(g => ({
            id: g.id,
            details: {
              galleryTitle: g.title,
              photographerName: g.photographer.name,
              changes: operationData
            }
          })),
          { operation: 'update_settings', totalGalleries: galleries.length }
        )
        break

      case 'delete':
        // This is more complex and should be handled carefully
        return res.status(400).json({
          success: false,
          error: 'Bulk delete not supported for safety reasons. Delete galleries individually.'
        })

      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported operation'
        })
    }

    res.json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      data: {
        operation,
        affectedGalleries: galleries.length,
        results
      }
    })
  } catch (error) {
    console.error('Admin bulk gallery operations error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

/**
 * Transfer gallery ownership from one photographer to another
 */
export const transferGalleryOwnership = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { newPhotographerId } = req.body

    if (!newPhotographerId) {
      return res.status(400).json({
        success: false,
        error: 'New photographer ID is required'
      })
    }

    // Get the gallery with current owner details
    const gallery = await prisma.gallery.findUnique({
      where: { id },
      include: {
        photographer: { select: { id: true, name: true, email: true } }
      }
    })

    if (!gallery) {
      return res.status(404).json({
        success: false,
        error: 'Gallery not found'
      })
    }

    // Verify the new owner exists and is a photographer
    const newPhotographer = await prisma.user.findUnique({
      where: { id: newPhotographerId },
      select: { id: true, name: true, email: true, role: true }
    })

    if (!newPhotographer) {
      return res.status(404).json({
        success: false,
        error: 'Target photographer not found'
      })
    }

    if (newPhotographer.role !== 'PHOTOGRAPHER') {
      return res.status(400).json({
        success: false,
        error: 'Target user is not a photographer'
      })
    }

    if (gallery.photographerId === newPhotographerId) {
      return res.status(400).json({
        success: false,
        error: 'Gallery already belongs to this photographer'
      })
    }

    // Transfer ownership
    const updatedGallery = await prisma.gallery.update({
      where: { id },
      data: { photographerId: newPhotographerId },
      include: {
        photographer: { select: { id: true, name: true, email: true } },
        folders: {
          include: {
            _count: { select: { photos: true } }
          }
        },
        _count: { select: { folders: true } }
      }
    })

    // Debug log to verify folders and photos are intact
    const totalPhotos = updatedGallery.folders.reduce((sum, f) => sum + f._count.photos, 0)
    console.log(`📋 Gallery transfer complete:`)
    console.log(`   - Gallery ID: ${id}`)
    console.log(`   - Title: ${gallery.title}`)
    console.log(`   - Folders: ${updatedGallery._count.folders}`)
    console.log(`   - Total Photos: ${totalPhotos}`)
    console.log(`   - Previous owner: ${gallery.photographer.name}`)
    console.log(`   - New owner: ${newPhotographer.name}`)

    // Log the audit action
    await logAdminAction(
      req,
      'ADMIN_GALLERY_OWNERSHIP_TRANSFER',
      'gallery',
      id,
      {
        galleryTitle: gallery.title,
        previousOwner: {
          id: gallery.photographer.id,
          name: gallery.photographer.name,
          email: gallery.photographer.email
        },
        newOwner: {
          id: newPhotographer.id,
          name: newPhotographer.name,
          email: newPhotographer.email
        }
      }
    )

    res.json({
      success: true,
      message: `Gallery "${gallery.title}" transferred to ${newPhotographer.name}`,
      data: {
        ...updatedGallery,
        totalSize: Number(updatedGallery.totalSize)
      },
      transferStats: {
        foldersCount: updatedGallery._count.folders,
        photosCount: totalPhotos
      }
    })
  } catch (error) {
    console.error('Admin transfer gallery ownership error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}