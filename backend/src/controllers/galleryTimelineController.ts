import { Request, Response } from 'express'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

interface AuthRequest extends Request {
    user?: {
        id: string
        email: string
        role: string
    }
}

/**
 * Get galleries organized by timeline (year -> month -> galleries)
 * GET /api/galleries/timeline
 */
export const getGalleriesTimeline = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id
        const userRole = req.user?.role

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        // Build where clause based on role
        const where: any = {}
        if (userRole === 'PHOTOGRAPHER') {
            where.photographerId = userId
        } else if (userRole === 'ADMIN') {
            // Admin can see all galleries
        } else {
            return res.status(403).json({ error: 'Forbidden' })
        }

        // Get all galleries with dates
        const galleriesWithDates = await prisma.gallery.findMany({
            where: {
                ...where,
                shootDate: { not: null },
            },
            select: {
                id: true,
                title: true,
                shootDate: true,
                shootYear: true,
                shootMonth: true,
            },
            orderBy: [
                { shootYear: 'desc' },
                { shootMonth: 'desc' },
                { shootDate: 'desc' },
            ],
        })

        // Get uncategorized galleries (no shootDate)
        const uncategorizedGalleries = await prisma.gallery.findMany({
            where: {
                ...where,
                shootDate: null,
            },
            select: {
                id: true,
                title: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        // Group galleries by year and month
        const yearMap = new Map<number, any>()

        for (const gallery of galleriesWithDates) {
            if (!gallery.shootYear || !gallery.shootMonth) continue

            const year = gallery.shootYear
            const month = gallery.shootMonth

            // Initialize year if not exists
            if (!yearMap.has(year)) {
                yearMap.set(year, {
                    year,
                    galleryCount: 0,
                    months: new Map<number, any>(),
                })
            }

            const yearData = yearMap.get(year)!
            yearData.galleryCount++

            // Initialize month if not exists
            if (!yearData.months.has(month)) {
                const monthNames = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December',
                ]
                yearData.months.set(month, {
                    month,
                    monthName: monthNames[month - 1],
                    galleryCount: 0,
                    galleries: [],
                    coverPhoto: null,
                })
            }

            const monthData = yearData.months.get(month)!
            monthData.galleryCount++

            // Add gallery to month
            monthData.galleries.push({
                id: gallery.id,
                title: gallery.title,
                shootDate: gallery.shootDate,
            })
        }

        // Convert Maps to arrays and sort
        const years = Array.from(yearMap.values()).map((yearData) => ({
            year: yearData.year,
            galleryCount: yearData.galleryCount,
            months: Array.from(yearData.months.values()).sort((a: any, b: any) => a.month - b.month),
        })).sort((a, b) => (b.year as number) - (a.year as number))

        // Format uncategorized galleries
        const uncategorized = uncategorizedGalleries.map((gallery) => ({
            id: gallery.id,
            title: gallery.title,
            createdAt: gallery.createdAt,
        }))

        res.json({
            years,
            uncategorized,
        })
    } catch (error) {
        console.error('Error fetching galleries timeline:', error)
        res.status(500).json({ error: 'Failed to fetch galleries timeline' })
    }
}

/**
 * Get galleries for a specific year and month (including groups)
 * GET /api/galleries/timeline/:year/:month
 */
export const getGalleriesByYearMonth = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id
        const userRole = req.user?.role
        const year = parseInt(req.params.year as string)
        const month = parseInt(req.params.month as string)

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            return res.status(400).json({ error: 'Invalid year or month' })
        }

        // Build where clause based on role
        const where: any = {
            shootYear: year,
            shootMonth: month,
        }

        if (userRole === 'PHOTOGRAPHER') {
            where.photographerId = userId
        } else if (userRole === 'ADMIN') {
            // Admin can see all galleries
        } else {
            return res.status(403).json({ error: 'Forbidden' })
        }

        // Get gallery groups for this month
        const groups = await prisma.galleryGroup.findMany({
            where,
            select: {
                id: true,
                name: true,
                description: true,
                coverPhoto: {
                    select: {
                        id: true,
                        thumbnailUrl: true,
                        mediumUrl: true,
                        largeUrl: true,
                        originalUrl: true,
                    },
                },
                _count: {
                    select: {
                        galleries: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        // Get all galleries for this month - minimal data, stats come from SQL
        const ungroupedGalleries = await prisma.gallery.findMany({
            where: where,
            select: {
                id: true,
                title: true,
                description: true,
                shootDate: true,
            },
            orderBy: { shootDate: 'desc' },
        })

        // Fetch stats and cover photo efficiently using raw query
        const galleryIds = ungroupedGalleries.map(g => g.id);

        let statsMap = new Map();

        if (galleryIds.length > 0) {
            const stats = await prisma.$queryRaw`
                SELECT 
                    g.id as "galleryId",
                    COUNT(DISTINCT p.id) as "photoCount",
                    COALESCE(SUM(p."fileSize"), 0) as "totalSize",
                    COUNT(DISTINCT lp."photoId") as "likedCount",
                    COUNT(DISTINCT fp."photoId") as "favoritedCount",
                    (
                        SELECT COALESCE(cover."thumbnailUrl", cover."mediumUrl", cover."originalUrl", first_photo."thumbnailUrl", first_photo."originalUrl")
                        FROM folders first_folder
                        LEFT JOIN photos cover ON cover.id = first_folder."coverPhotoId"
                        LEFT JOIN photos first_photo ON first_photo."folderId" = first_folder.id
                        WHERE first_folder."galleryId" = g.id
                        ORDER BY first_folder."createdAt" ASC
                        LIMIT 1
                    ) as "coverPhoto"
                FROM galleries g
                LEFT JOIN folders f ON f."galleryId" = g.id
                LEFT JOIN photos p ON p."folderId" = f.id
                LEFT JOIN liked_photos lp ON lp."photoId" = p.id
                LEFT JOIN favorited_photos fp ON fp."photoId" = p.id
                WHERE g.id IN (${Prisma.join(galleryIds)})
                GROUP BY g.id
            ` as any[];

            stats.forEach(stat => {
                statsMap.set(stat.galleryId, {
                    photoCount: Number(stat.photoCount),
                    totalSize: Number(stat.totalSize),
                    likedCount: Number(stat.likedCount),
                    favoritedCount: Number(stat.favoritedCount),
                    coverPhoto: stat.coverPhoto || null,
                });
            });
        }

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ]

        res.json({
            year,
            month,
            monthName: monthNames[month - 1],
            groups: groups.map((group) => ({
                id: group.id,
                name: group.name,
                description: group.description,
                galleryCount: group._count.galleries,
                coverPhoto: group.coverPhoto?.thumbnailUrl || group.coverPhoto?.mediumUrl || group.coverPhoto?.originalUrl || null,
            })),
            ungroupedGalleries: ungroupedGalleries.map((gallery) => {
                const stats = statsMap.get(gallery.id) || { photoCount: 0, totalSize: 0, likedCount: 0, favoritedCount: 0, coverPhoto: null };

                return {
                    id: gallery.id,
                    title: gallery.title,
                    description: gallery.description,
                    shootDate: gallery.shootDate,
                    coverPhoto: stats.coverPhoto,
                    photoCount: stats.photoCount,
                    likedBy: stats.likedCount,
                    favoritedBy: stats.favoritedCount,
                    totalSize: stats.totalSize,
                };
            }),
        })
    } catch (error) {
        console.error('Error fetching galleries by year/month:', error)
        res.status(500).json({ error: 'Failed to fetch galleries' })
    }
}

/**
 * Get uncategorized galleries (galleries without shootDate)
 * GET /api/galleries/uncategorized
 */
export const getUncategorizedGalleries = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id
        const userRole = req.user?.role

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        // Build where clause based on role
        const where: any = {
            shootDate: null,
        }

        if (userRole === 'PHOTOGRAPHER') {
            where.photographerId = userId
        } else if (userRole === 'ADMIN') {
            // Admin can see all galleries
        } else {
            return res.status(403).json({ error: 'Forbidden' })
        }

        const galleries = await prisma.gallery.findMany({
            where,
            select: {
                id: true,
                title: true,
                description: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        res.json({
            galleries: galleries.map((gallery) => ({
                id: gallery.id,
                title: gallery.title,
                description: gallery.description,
                createdAt: gallery.createdAt,
            })),
        })
    } catch (error) {
        console.error('Error fetching uncategorized galleries:', error)
        res.status(500).json({ error: 'Failed to fetch uncategorized galleries' })
    }
}

/**
 * Update gallery shoot date
 * PATCH /api/galleries/:id/date
 */
export const updateGalleryDate = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id
        const userRole = req.user?.role
        const galleryId = req.params.id as string
        const { shootDate } = req.body as { shootDate?: string | null }

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        // Verify ownership or admin
        const gallery = await prisma.gallery.findUnique({
            where: { id: galleryId },
            select: { photographerId: true },
        })

        if (!gallery) {
            return res.status(404).json({ error: 'Gallery not found' })
        }

        if (userRole !== 'ADMIN' && gallery.photographerId !== userId) {
            return res.status(403).json({ error: 'Forbidden' })
        }

        // Parse and validate shoot date
        let updateData: any = {}

        if (shootDate === null) {
            // Remove shoot date
            updateData = {
                shootDate: null,
                shootYear: null,
                shootMonth: null,
            }
        } else if (shootDate) {
            const parsedDate = new Date(shootDate)
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({ error: 'Invalid date format' })
            }

            updateData = {
                shootDate: parsedDate,
                shootYear: parsedDate.getUTCFullYear(),
                shootMonth: parsedDate.getUTCMonth() + 1,
            }
        }

        // Update gallery
        const updatedGallery = await prisma.gallery.update({
            where: { id: galleryId },
            data: updateData,
            select: {
                id: true,
                title: true,
                shootDate: true,
                shootYear: true,
                shootMonth: true,
            },
        })

        res.json(updatedGallery)
    } catch (error) {
        console.error('Error updating gallery date:', error)
        res.status(500).json({ error: 'Failed to update gallery date' })
    }
}
