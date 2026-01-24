/**
 * Admin Thumbnail Controller
 * Provides endpoints to manage and regenerate thumbnails
 */

import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { parallelThumbnailQueue } from '../services/parallelThumbnailQueue'

const prisma = new PrismaClient()

/**
 * Get thumbnail queue status
 */
export const getThumbnailStatus = async (req: Request, res: Response) => {
    try {
        const [pending, processing, completed, failed] = await Promise.all([
            prisma.photo.count({ where: { thumbnailStatus: 'PENDING' } }),
            prisma.photo.count({ where: { thumbnailStatus: 'PROCESSING' } }),
            prisma.photo.count({ where: { thumbnailStatus: 'COMPLETED' } }),
            prisma.photo.count({ where: { thumbnailStatus: 'FAILED' } })
        ])

        const queueStatus = parallelThumbnailQueue.getStatus()

        res.json({
            success: true,
            data: {
                database: { pending, processing, completed, failed },
                queue: queueStatus
            }
        })
    } catch (error) {
        console.error('Failed to get thumbnail status:', error)
        res.status(500).json({ success: false, error: 'Failed to get thumbnail status' })
    }
}

/**
 * Regenerate thumbnails for photos that need them
 */
export const regeneratePendingThumbnails = async (req: Request, res: Response) => {
    try {
        const batchSize = parseInt(req.query.batchSize as string) || 500

        console.log('🔄 Starting thumbnail regeneration...')

        // Get photos that need thumbnails
        const photos = await prisma.photo.findMany({
            where: {
                OR: [
                    { thumbnailStatus: 'PENDING' },
                    { thumbnailStatus: 'FAILED' },
                    { thumbnailUrl: null },
                    { thumbnailUrl: '' }
                ]
            },
            take: batchSize,
            include: {
                folder: {
                    select: { galleryId: true }
                }
            }
        })

        if (photos.length === 0) {
            return res.json({
                success: true,
                message: 'No photos need thumbnail regeneration',
                queued: 0
            })
        }

        // Mark these photos as PROCESSING immediately to prevent re-queuing
        const photoIds = photos.map(p => p.id)
        await prisma.photo.updateMany({
            where: { id: { in: photoIds } },
            data: { thumbnailStatus: 'PROCESSING' }
        })

        // Queue thumbnail jobs
        let queued = 0
        for (const photo of photos) {
            // Extract S3 key from URL - handles any region (us-east-005, us-west-004, etc.)
            // URL format: https://s3.{region}.backblazeb2.com/{bucket}/{key}
            const urlMatch = photo.originalUrl.match(/backblazeb2\.com\/[^\/]+\/(.+)$/)
            const s3Key = urlMatch ? urlMatch[1] : photo.originalUrl.split('/').slice(4).join('/')

            await parallelThumbnailQueue.add({
                photoId: photo.id,
                s3Key,
                galleryId: photo.folder.galleryId,
                originalFilename: photo.filename
            })
            queued++
        }

        console.log(`📸 Queued ${queued} photos for thumbnail regeneration`)

        res.json({
            success: true,
            message: `Queued ${queued} photos for thumbnail regeneration`,
            queued,
            remaining: await prisma.photo.count({ where: { thumbnailStatus: 'PENDING' } })
        })
    } catch (error) {
        console.error('Failed to start thumbnail regeneration:', error)
        res.status(500).json({ success: false, error: 'Failed to start regeneration' })
    }
}
