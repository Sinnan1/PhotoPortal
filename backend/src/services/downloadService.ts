/**
 * Download Service - Unified Server-Side Photo Download Processing
 * 
 * This service provides unified server-side download functionality for all photo download types.
 * It replaces the previous mixed implementation that used client-side JSZip for some downloads.
 * 
 * Key Features:
 * - Server-side zip creation using Archiver for all download types
 * - Direct S3 streaming to reduce memory usage
 * - Real-time progress tracking with download IDs
 * - Consistent error handling and recovery
 * - Support for concurrent downloads
 * - Configurable Multipart Downloads for large sets
 * 
 * Supported Download Types:
 * - All photos in a gallery
 * - Photos in a specific folder
 * - Liked photos by user
 * - Favorited photos by user
 * 
 * Performance Benefits:
 * - Eliminates client-side memory consumption for zip creation
 * - Direct S3 to zip streaming reduces server memory footprint
 * - Better scalability for concurrent downloads
 * - Consistent progress tracking across all download types
 * 
 * @since Migration from client-side JSZip completed
 */

import { PrismaClient } from '@prisma/client'
import archiver from 'archiver'
import { v4 as uuidv4 } from 'uuid'
import { getObjectStreamFromS3 } from '../utils/s3Storage'

const prisma = new PrismaClient()

export interface DownloadProgress {
    downloadId: string
    status: 'preparing' | 'processing' | 'ready' | 'error'
    progress: number // 0-100
    totalPhotos: number
    processedPhotos: number
    filename: string
    error?: string
    createdAt: Date
    updatedAt: Date
}

export interface DownloadStrategy {
    strategy: 'DIRECT_STREAM' | 'MULTIPART_MANIFEST'
    totalSize: number
    chunkSize: number
    estimatedParts?: number
}

// In-memory storage for download progress (in production, use Redis or database)
const downloadProgress = new Map<string, DownloadProgress>()

// Cleanup old download progress entries every 5 minutes
setInterval(() => {
    const now = new Date().getTime();
    for (const [id, progress] of downloadProgress.entries()) {
        // Remove if older than 30 minutes
        if (now - progress.updatedAt.getTime() > 30 * 60 * 1000) {
            downloadProgress.delete(id);
            console.log(`🧹 Cleaned up stale download progress: ${id}`);
        }
    }
}, 5 * 60 * 1000);

// Helper to get system configuration with fallback
async function getSystemConfig(key: string, defaultValue: any): Promise<any> {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { configKey: key }
        })
        return config ? config.configValue : defaultValue
    } catch (error) {
        console.warn(`Failed to fetch system config ${key}, using default:`, error)
        return defaultValue
    }
}

export class DownloadService {
    static createDownload(filename: string, totalPhotos: number): string {
        const downloadId = uuidv4()
        const progress: DownloadProgress = {
            downloadId,
            status: 'preparing',
            progress: 0,
            totalPhotos,
            processedPhotos: 0,
            filename,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        downloadProgress.set(downloadId, progress)
        return downloadId
    }

    static updateProgress(downloadId: string, updates: Partial<DownloadProgress>): void {
        const current = downloadProgress.get(downloadId)
        if (current) {
            const updated = {
                ...current,
                ...updates,
                updatedAt: new Date()
            }

            // Calculate progress percentage
            if (updated.totalPhotos > 0) {
                updated.progress = Math.round((updated.processedPhotos / updated.totalPhotos) * 100)
            }

            downloadProgress.set(downloadId, updated)
        }
    }

    static getProgress(downloadId: string): DownloadProgress | undefined {
        return downloadProgress.get(downloadId)
    }

    static cleanupDownload(downloadId: string): void {
        downloadProgress.delete(downloadId)
    }

    /**
     * Determines the download strategy (Single Zip vs Multipart) based on size
     */
    static async getDownloadStrategy(
        galleryId: string,
        userId: string,
        downloadType: 'all' | 'folder' | 'liked' | 'favorited',
        folderId?: string
    ): Promise<DownloadStrategy> {
        // Fetch configuration
        const downloadMode = await getSystemConfig('download.mode', 'single')
        const chunkSizeMB = await getSystemConfig('download.chunkSize', 2000)
        const chunkSizeBytes = chunkSizeMB * 1024 * 1024

        // Helper to query file size sum
        let totalSize = 0

        if (downloadType === 'all') {
            const result = await prisma.photo.aggregate({
                where: { folder: { galleryId } },
                _sum: { fileSize: true }
            })
            totalSize = result._sum.fileSize || 0
        } else if (downloadType === 'folder' && folderId) {
            const result = await prisma.photo.aggregate({
                where: { folderId },
                _sum: { fileSize: true }
            })
            totalSize = result._sum.fileSize || 0
        } else if (downloadType === 'liked') {
            const photos = await prisma.likedPhoto.findMany({
                where: { userId, photo: { folder: { galleryId } } },
                include: { photo: { select: { fileSize: true } } }
            })
            totalSize = photos.reduce((sum, p) => sum + (p.photo.fileSize || 0), 0)
        } else if (downloadType === 'favorited') {
            const photos = await prisma.favoritedPhoto.findMany({
                where: { userId, photo: { folder: { galleryId } } },
                include: { photo: { select: { fileSize: true } } }
            })
            totalSize = photos.reduce((sum, p) => sum + (p.photo.fileSize || 0), 0)
        }

        const strategy = (downloadMode === 'multipart' && totalSize > chunkSizeBytes)
            ? 'MULTIPART_MANIFEST'
            : 'DIRECT_STREAM'

        return {
            strategy,
            totalSize,
            chunkSize: chunkSizeBytes,
            estimatedParts: strategy === 'MULTIPART_MANIFEST' ? Math.ceil(totalSize / chunkSizeBytes) : 1
        }
    }

    // Helper to process photos sequentially to avoid VPS crashes
    private static async processPhotosSequentially(
        photos: any[],
        archive: archiver.Archiver,
        downloadId: string
    ): Promise<void> {
        let processedCount = 0
        const totalEntries = photos.length

        // Track entry completion via promise
        // We use this to wait for each file to be fully appended before moving to the next
        // Archiver manages backpressure, but rapid appending can still overwhelm resources
        // By waiting for the 'entry' event (or drain), we can control the pace more strictly if needed
        // However, standard archiver.append logic queues streams. To truly reduce open connections,
        // we must await the stream completion or at least until it's consumed.

        for (const photo of photos) {
            try {
                console.log(`📁 Queuing photo ${processedCount + 1}/${totalEntries}: ${photo.filename}`)

                // Extract S3 key from URL
                const originalUrl = new URL(photo.originalUrl)
                const pathParts = originalUrl.pathname.split('/').filter(part => part.length > 0)
                const bucketName = pathParts[0]
                const s3Key = decodeURIComponent(pathParts.slice(1).join('/'))

                // Get photo stream from S3
                // Important: getObjectStreamFromS3 opens the connection now
                const { stream } = await getObjectStreamFromS3(s3Key, bucketName)

                // Create a promise that resolves when this entry is fully processed by archiver
                // Note: archiver 'entry' event fires when the entry is added to the directory, which happens AFTER data is written
                const entryProcessedPromise = new Promise<void>((resolve, reject) => {
                    // We can't easily hook into "this specific entry finished" without complex listeners
                    // But we can pause the loop.
                    // Actually, stream.pipe(archive) is handled by archive.append internally.
                    // To force sequential processing (one connection at a time), we need to wait for the stream to end.
                    stream.on('end', () => resolve())
                    stream.on('error', (err: any) => reject(err))
                })

                // Add to archive
                archive.append(stream, { name: photo.filename })

                // WAIT for this file to finish downloading/archiving before starting the next one
                // This is crucial for preventing 1000 simultaneous S3 connections
                await entryProcessedPromise

                processedCount++
                this.updateProgress(downloadId, {
                    processedPhotos: processedCount
                })

                console.log(`✅ Processed photo ${processedCount}/${totalEntries}`)

            } catch (error) {
                console.error(`Failed to process photo ${photo.filename}:`, error)
                // Continue with next photo even if one fails
                processedCount++
                this.updateProgress(downloadId, {
                    processedPhotos: processedCount
                })
            }
        }
    }

    static async createGalleryPhotoZip(
        galleryId: string,
        userId: string,
        downloadType: 'all' | 'folder',
        folderId?: string,
        res?: any,
        partIndex?: number, // Optional: part index instead of IDs for URL safety
        ticket?: string // Optional: Original ticket to include in part links
    ): Promise<void> {
        // Fetch configuration
        const downloadMode = await getSystemConfig('download.mode', 'single')
        const chunkSizeMB = await getSystemConfig('download.chunkSize', 2000)
        const chunkSizeBytes = chunkSizeMB * 1024 * 1024

        const gallery = await prisma.gallery.findUnique({
            where: { id: galleryId },
            select: {
                id: true,
                title: true,
                password: true,
                photographerId: true,
                expiresAt: true,
                folders: {
                    include: {
                        photos: {
                            orderBy: { id: 'asc' }, // Stable sort required for partitioning
                            select: {
                                id: true,
                                filename: true,
                                originalUrl: true,
                                fileSize: true
                            }
                        }
                    }
                }
            }
        })

        if (!gallery) {
            throw new Error('Gallery not found')
        }

        if (gallery.expiresAt && gallery.expiresAt < new Date()) {
            throw new Error('Gallery has expired')
        }

        // Get photos based on download type
        let photos: any[] = []
        let baseFilename = ''

        if (downloadType === 'all') {
            photos = gallery.folders.flatMap(folder => folder.photos)
            baseFilename = `${gallery.title.replace(/[^a-zA-Z0-9]/g, '_')}_all_photos`
        } else if (downloadType === 'folder' && folderId) {
            const folder = gallery.folders.find(f => f.id === folderId)
            if (!folder) {
                throw new Error('Folder not found')
            }
            photos = folder.photos
            baseFilename = `${folder.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'folder'}_photos`
        }

        if (photos.length === 0) {
            throw new Error(`No photos found for ${downloadType} download`)
        }

        // Logic for Multipart:
        // 1. If partIndex is provided, recalculate chunks and pick the specific one.
        // 2. If no partIndex but downloadMode is multipart and size exceeds limit, generate manifest.

        let targetPhotos: any[] = photos
        let targetFilename = `${baseFilename}.zip`

        if (downloadMode === 'multipart') {
            const totalSize = photos.reduce((sum, p) => sum + (p.fileSize || 0), 0)

            // Generate parts list (needed for both manifest and part selection)
            const parts = []
            let currentChunk: any[] = []
            let currentChunkSize = 0
            let pIndex = 1

            for (const photo of photos) {
                if (currentChunkSize + (photo.fileSize || 0) > chunkSizeBytes && currentChunk.length > 0) {
                    parts.push({
                        index: pIndex,
                        filename: `${baseFilename}_part${pIndex}.zip`,
                        photos: currentChunk,
                        size: currentChunkSize,
                        count: currentChunk.length
                    })
                    pIndex++
                    currentChunk = []
                    currentChunkSize = 0
                }
                currentChunk.push(photo)
                currentChunkSize += (photo.fileSize || 0)
            }

            if (currentChunk.length > 0) {
                parts.push({
                    index: pIndex,
                    filename: `${baseFilename}_part${pIndex}.zip`,
                    photos: currentChunk,
                    size: currentChunkSize,
                    count: currentChunk.length
                })
            }

            // Case A: User requested specific part
            if (partIndex !== undefined) {
                const part = parts.find(p => p.index === partIndex)
                if (!part) {
                    throw new Error('Part not found')
                }
                targetPhotos = part.photos
                targetFilename = part.filename
                console.log(`📦 Delivering Part ${partIndex} (${targetPhotos.length} photos)`)
            }
            // Case B: Needs splitting, return manifest
            else if (totalSize > chunkSizeBytes) {
                console.log(`📦 Multipart download triggering for ${photos.length} photos (${(totalSize/1024/1024).toFixed(2)} MB)`)

                if (res) {
                    res.json({
                        multipart: true,
                        parts: parts.map(p => ({
                            part: p.index,
                            filename: p.filename,
                            size: p.size,
                            count: p.count,
                            // Use partIndex instead of photoIds for robust, short URLs
                            downloadUrl: `/api/photos/download/part?galleryId=${galleryId}&partIndex=${p.index}${ticket ? `&ticket=${ticket}` : ''}`
                        }))
                    })
                }
                return
            }
        }

        // Calculate exact size for Content-Length header
        let exactZipSize = 22; // Start with EOCD size

        for (const photo of targetPhotos) {
            const filenameLength = Buffer.byteLength(photo.filename);
            const fileOverhead = 92 + (2 * filenameLength); // 30 + 16 + 46 = 92
            exactZipSize += (photo.fileSize || 0) + fileOverhead;
        }

        // Create download tracking
        const downloadId = this.createDownload(targetFilename, targetPhotos.length)

        console.log(`📦 Starting download: ${downloadId} (${targetPhotos.length} photos, exact size: ${Math.round(exactZipSize / 1024 / 1024 * 10) / 10} MB)`)

        try {
            const useCompression = false

            if (res) {
                res.setHeader('Content-Type', 'application/zip')
                res.setHeader('Content-Disposition', `attachment; filename="${targetFilename}"`)
                res.setHeader('X-Download-ID', downloadId)
                res.setHeader('Access-Control-Expose-Headers', 'X-Download-ID')

                if (exactZipSize > 0) {
                    res.setHeader('Content-Length', exactZipSize)
                    console.log(`📦 Content-Length set to ${exactZipSize} bytes`)
                }
            }

            const archive = archiver('zip', {
                zlib: { level: useCompression ? 1 : 0 },
                store: !useCompression,
                highWaterMark: 1024 * 1024
            })

            // Error & Progress Handlers
            const archiveErrorHandler = (err: any) => {
                console.error('Archive error:', err)
                this.updateProgress(downloadId, { status: 'error', error: err.message })
                if (archive && typeof archive.destroy === 'function') {
                    try { archive.destroy() } catch (e) {}
                }
                if (res && !res.headersSent) {
                    res.status(500).json({ success: false, error: 'Failed to create archive' })
                }
            }

            const clientDisconnectHandler = () => {
                console.log('⚠️ Client disconnected, aborting archive creation')
                this.updateProgress(downloadId, { status: 'error', error: 'Client disconnected' })
                if (archive && typeof archive.destroy === 'function') {
                    try { archive.destroy() } catch (e) {}
                }
            }

            archive.on('error', archiveErrorHandler)
            if (res) {
                res.on('close', clientDisconnectHandler)
            }

            this.updateProgress(downloadId, { status: 'processing' })

            if (res) {
                archive.pipe(res)
            }

            // USE SEQUENTIAL PROCESSING
            await this.processPhotosSequentially(targetPhotos, archive, downloadId)

            // Finalize
            await archive.finalize()

            this.updateProgress(downloadId, {
                status: 'ready',
                processedPhotos: targetPhotos.length
            })

        } catch (error) {
            console.error(`Download service error for ${downloadId}:`, error)
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during zip creation.';
            this.updateProgress(downloadId, { status: 'error', error: errorMessage })
            throw new Error(errorMessage);
        } finally {
            setTimeout(() => {
                this.cleanupDownload(downloadId)
            }, 300000)
        }
    }

    static async createFilteredPhotoZip(
        galleryId: string,
        userId: string,
        filterType: 'liked' | 'favorited',
        res: any,
        partIndex?: number,
        ticket?: string // Optional: Original ticket to include in part links
    ): Promise<void> {
        // Fetch configuration
        const downloadMode = await getSystemConfig('download.mode', 'single')
        const chunkSizeMB = await getSystemConfig('download.chunkSize', 2000)
        const chunkSizeBytes = chunkSizeMB * 1024 * 1024

        const gallery = await prisma.gallery.findUnique({
            where: { id: galleryId },
            select: {
                id: true,
                title: true,
                password: true,
                photographerId: true,
                expiresAt: true
            }
        })

        if (!gallery) {
            throw new Error('Gallery not found')
        }

        if (gallery.expiresAt && gallery.expiresAt < new Date()) {
            throw new Error('Gallery has expired')
        }

        // Get filtered photos
        const photoQuery = filterType === 'liked'
            ? prisma.likedPhoto.findMany({
                where: {
                    userId,
                    photo: { folder: { galleryId } }
                },
                orderBy: { photoId: 'asc' }, // Stable sort
                include: {
                    photo: {
                        select: {
                            id: true,
                            filename: true,
                            originalUrl: true,
                            fileSize: true
                        }
                    }
                }
            })
            : prisma.favoritedPhoto.findMany({
                where: {
                    userId,
                    photo: { folder: { galleryId } }
                },
                orderBy: { photoId: 'asc' }, // Stable sort
                include: {
                    photo: {
                        select: {
                            id: true,
                            filename: true,
                            originalUrl: true,
                            fileSize: true
                        }
                    }
                }
            })

        let filteredPhotos = await photoQuery

        if (filteredPhotos.length === 0) {
            throw new Error(`No ${filterType} photos found in this gallery`)
        }

        const baseFilename = `${gallery.title.replace(/[^a-zA-Z0-9]/g, '_')}_${filterType}_photos`

        let targetPhotos: any[] = filteredPhotos.map(item => item.photo)
        let targetFilename = `${baseFilename}.zip`

        if (downloadMode === 'multipart') {
             const totalSize = targetPhotos.reduce((sum, p) => sum + (p.fileSize || 0), 0)

             // Generate parts list
             const parts = []
             let currentChunk: any[] = []
             let currentChunkSize = 0
             let pIndex = 1

             for (const photo of targetPhotos) {
                 if (currentChunkSize + (photo.fileSize || 0) > chunkSizeBytes && currentChunk.length > 0) {
                     parts.push({
                         index: pIndex,
                         filename: `${baseFilename}_part${pIndex}.zip`,
                         photos: currentChunk,
                         size: currentChunkSize,
                         count: currentChunk.length
                     })
                     pIndex++
                     currentChunk = []
                     currentChunkSize = 0
                 }
                 currentChunk.push(photo)
                 currentChunkSize += (photo.fileSize || 0)
             }

             if (currentChunk.length > 0) {
                 parts.push({
                     index: pIndex,
                     filename: `${baseFilename}_part${pIndex}.zip`,
                     photos: currentChunk,
                     size: currentChunkSize,
                     count: currentChunk.length
                 })
             }

             // Case A: User requested specific part
             if (partIndex !== undefined) {
                 const part = parts.find(p => p.index === partIndex)
                 if (!part) {
                     throw new Error('Part not found')
                 }
                 targetPhotos = part.photos
                 targetFilename = part.filename
                 console.log(`📦 Delivering Part ${partIndex} (${targetPhotos.length} photos)`)
             }
             // Case B: Needs splitting, return manifest
             else if (totalSize > chunkSizeBytes) {
                 console.log(`📦 Multipart download triggering for ${filteredPhotos.length} ${filterType} photos`)
                 if (res) {
                     res.json({
                         multipart: true,
                         parts: parts.map(p => ({
                             part: p.index,
                             filename: p.filename,
                             size: p.size,
                             count: p.count,
                             // Use partIndex instead of photoIds
                             downloadUrl: `/api/photos/download/part?galleryId=${galleryId}&partIndex=${p.index}&filter=${filterType}${ticket ? `&ticket=${ticket}` : ''}`
                         }))
                     })
                 }
                 return
             }
        }

        let exactZipSize = 22;

        for (const photo of targetPhotos) {
            const filenameLength = Buffer.byteLength(photo.filename);
            const fileOverhead = 92 + (2 * filenameLength);
            exactZipSize += (photo.fileSize || 0) + fileOverhead;
        }

        const downloadId = this.createDownload(targetFilename, targetPhotos.length)
        console.log(`📦 Starting ${filterType} download: ${downloadId}`)

        res.setHeader('Content-Type', 'application/zip')
        res.setHeader('Content-Disposition', `attachment; filename="${targetFilename}"`)
        res.setHeader('X-Download-ID', downloadId)

        if (exactZipSize > 0) {
            res.setHeader('Content-Length', exactZipSize)
        }

        const archive = archiver('zip', {
            zlib: { level: 0 },
            store: true,
            highWaterMark: 1024 * 1024
        })

        const archiveErrorHandler = (err: any) => {
            console.error('Archive error:', err)
            this.updateProgress(downloadId, { status: 'error', error: err.message })
            try { archive.destroy() } catch (e) {}
        }

        const clientDisconnectHandler = () => {
             console.log('⚠️ Client disconnected')
             this.updateProgress(downloadId, { status: 'error', error: 'Client disconnected' })
             try { archive.destroy() } catch (e) {}
        }

        archive.on('error', archiveErrorHandler)
        res.on('close', clientDisconnectHandler)

        this.updateProgress(downloadId, { status: 'processing' })
        archive.pipe(res)

        // Process sequentially
        await this.processPhotosSequentially(targetPhotos, archive, downloadId)

        await archive.finalize()

        this.updateProgress(downloadId, {
            status: 'ready',
            processedPhotos: targetPhotos.length
        })

        setTimeout(() => {
            this.cleanupDownload(downloadId)
        }, 300000)
    }
}
