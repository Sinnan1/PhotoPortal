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

    static async createGalleryPhotoZip(
        galleryId: string,
        userId: string,
        downloadType: 'all' | 'folder',
        folderId?: string,
        res?: any
    ): Promise<void> {
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
                            select: {
                                id: true,
                                filename: true,
                                originalUrl: true
                            }
                        }
                    }
                }
            }
        })

        if (!gallery) {
            throw new Error('Gallery not found')
        }

        // Check if gallery has expired
        if (gallery.expiresAt && gallery.expiresAt < new Date()) {
            throw new Error('Gallery has expired')
        }

        // Get photos based on download type
        let photos: any[] = []
        let zipFilename = ''

        if (downloadType === 'all') {
            photos = gallery.folders.flatMap(folder => folder.photos)
            zipFilename = `${gallery.title.replace(/[^a-zA-Z0-9]/g, '_')}_all_photos.zip`
        } else if (downloadType === 'folder' && folderId) {
            const folder = gallery.folders.find(f => f.id === folderId)
            if (!folder) {
                throw new Error('Folder not found')
            }
            photos = folder.photos
            zipFilename = `${folder.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'folder'}_photos.zip`
        }

        if (photos.length === 0) {
            throw new Error(`No photos found for ${downloadType} download`)
        }

        // Create download tracking
        const downloadId = this.createDownload(zipFilename, photos.length)

        console.log(`📦 Starting ${downloadType} photos download: ${downloadId} (${photos.length} photos)`)

        try {
            // Set response headers for zip download
            if (res) {
                res.setHeader('Content-Type', 'application/zip')
                res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`)
                res.setHeader('X-Download-ID', downloadId)
                res.setHeader('Access-Control-Expose-Headers', 'X-Download-ID')
            }

            // Create zip archive with optimized settings for streaming
            // Use store mode (no compression) for large galleries to reduce CPU and memory
            const useCompression = photos.length < 500
            const archive = archiver('zip', {
                zlib: { level: useCompression ? 1 : 0 }, // No compression for large galleries
                store: !useCompression, // Store mode for large galleries
                highWaterMark: 1024 * 1024 // 1MB buffer to prevent memory buildup
            })
            
            console.log(`📦 Archive mode: ${useCompression ? 'compressed' : 'stored'} for ${photos.length} photos`)

            // Handle archive events
            const archiveErrorHandler = (err: any) => {
                console.error('Archive error:', err)
                this.updateProgress(downloadId, {
                    status: 'error',
                    error: err.message
                })
                
                // Destroy archive to free resources
                if (archive && typeof archive.destroy === 'function') {
                    try {
                        archive.destroy()
                        console.log('🧹 Archive destroyed after error')
                    } catch (destroyError) {
                        console.warn('Failed to destroy archive:', destroyError)
                    }
                }
                
                if (res && !res.headersSent) {
                    res.status(500).json({ success: false, error: 'Failed to create archive' })
                } else if (res) {
                    res.end()
                }
            }

            const archiveProgressHandler = (progress: any) => {
                // Update progress based on archive progress
                this.updateProgress(downloadId, {
                    status: 'processing',
                    processedPhotos: progress.entries.processed
                })
            }

            const clientDisconnectHandler = () => {
                console.log('⚠️ Client disconnected, aborting archive creation')
                this.updateProgress(downloadId, {
                    status: 'error',
                    error: 'Client disconnected'
                })
                
                // Destroy archive to stop processing
                if (archive && typeof archive.destroy === 'function') {
                    try {
                        archive.destroy()
                        console.log('🧹 Archive destroyed after client disconnect')
                    } catch (destroyError) {
                        console.warn('Failed to destroy archive:', destroyError)
                    }
                }
            }

            archive.on('error', archiveErrorHandler)
            archive.on('progress', archiveProgressHandler)
            
            // Handle client disconnect
            if (res) {
                res.on('close', clientDisconnectHandler)
            }

            // Update status to processing
            this.updateProgress(downloadId, { status: 'processing' })

            // Pipe archive to response
            if (res) {
                archive.pipe(res)
            }

            // Add photos to archive with better error handling and batching
            let processedCount = 0
            // Reduce batch size to 1 for large galleries to prevent memory issues
            // Process one photo at a time to minimize memory footprint
            const batchSize = photos.length > 500 ? 1 : 3
            
            console.log(`📦 Processing ${photos.length} photos with batch size ${batchSize}`)
            
            for (let i = 0; i < photos.length; i += batchSize) {
                const batch = photos.slice(i, i + batchSize)
                
                for (const photo of batch) {
                    let streamToDestroy: any = null
                    try {
                        console.log(`📁 Adding photo ${processedCount + 1}/${photos.length}: ${photo.filename}`)

                        // Extract S3 key from URL
                        const originalUrl = new URL(photo.originalUrl)
                        const pathParts = originalUrl.pathname.split('/').filter(part => part.length > 0)
                        const bucketName = pathParts[0]
                        const s3Key = decodeURIComponent(pathParts.slice(1).join('/'))

                        // Get photo stream from S3 with timeout and proper cleanup
                        const streamPromise = getObjectStreamFromS3(s3Key, bucketName)
                        const timeoutPromise = new Promise<never>((_, reject) => 
                            setTimeout(() => reject(new Error('S3 stream timeout')), 30000)
                        )
                        
                        let result: any
                        try {
                            result = await Promise.race([streamPromise, timeoutPromise])
                        } catch (error) {
                            // If timeout occurred, we need to destroy the stream from the losing promise
                            try {
                                const streamResult = await Promise.race([
                                    streamPromise,
                                    new Promise(resolve => setTimeout(() => resolve(null), 100))
                                ])
                                if (streamResult && (streamResult as any).stream) {
                                    const lostStream = (streamResult as any).stream
                                    if (lostStream && typeof lostStream.destroy === 'function') {
                                        lostStream.destroy()
                                        console.log(`🧹 Destroyed orphaned stream for ${photo.filename}`)
                                    }
                                }
                            } catch (cleanupError) {
                                // Ignore cleanup errors
                            }
                            throw error
                        }
                        
                        const { stream } = result
                        streamToDestroy = stream
                        
                        // Add to archive with original filename
                        archive.append(stream, { name: photo.filename })
                        
                        // Wait for archive to drain if it's getting full (backpressure)
                        // This prevents memory buildup when processing large galleries
                        if (archive.pointer() > 10 * 1024 * 1024) { // If archive buffer > 10MB
                            await new Promise<void>((resolve) => {
                                const checkDrain = () => {
                                    if (archive.pointer() < 5 * 1024 * 1024) { // Wait until < 5MB
                                        resolve()
                                    } else {
                                        setTimeout(checkDrain, 100)
                                    }
                                }
                                checkDrain()
                            })
                        }
                        
                        // Clear reference after successful append
                        streamToDestroy = null
                        
                        processedCount++
                        
                        // Update progress
                        this.updateProgress(downloadId, {
                            processedPhotos: processedCount
                        })
                        
                    } catch (error) {
                        console.error(`Failed to add photo ${photo.filename}:`, error)
                        
                        // Clean up stream if it exists
                        if (streamToDestroy && typeof streamToDestroy.destroy === 'function') {
                            try {
                                streamToDestroy.destroy()
                                console.log(`🧹 Destroyed stream after error for ${photo.filename}`)
                            } catch (destroyError) {
                                console.warn(`Failed to destroy stream:`, destroyError)
                            }
                        }
                        
                        processedCount++ // Still count as processed to continue
                        // Continue with other photos
                    }
                }
                
                // Small delay between batches to prevent overwhelming the system
                // No delay needed for single-photo batches (large galleries)
                if (i + batchSize < photos.length && batchSize > 1) {
                    await new Promise(resolve => setTimeout(resolve, 50))
                }
            }

            console.log(`✅ Added ${processedCount} photos to archive`)

            // Update status to ready
            this.updateProgress(downloadId, {
                status: 'ready',
                processedPhotos: processedCount
            })

            // Finalize the archive
            await archive.finalize()

        } catch (error) {
            console.error(`Download service error for ${downloadId}:`, error)
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during zip creation.';
            this.updateProgress(downloadId, {
                status: 'error',
                error: errorMessage
            })
            throw new Error(errorMessage);
        } finally {
            // Clean up after a delay
            setTimeout(() => {
                this.cleanupDownload(downloadId)
            }, 300000) // 5 minutes
        }
    }

    static async createFilteredPhotoZip(
        galleryId: string,
        userId: string,
        filterType: 'liked' | 'favorited',
        res: any
    ): Promise<void> {
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

        // Check if gallery has expired
        if (gallery.expiresAt && gallery.expiresAt < new Date()) {
            throw new Error('Gallery has expired')
        }

        // Get filtered photos
        const photoQuery = filterType === 'liked' 
            ? prisma.likedPhoto.findMany({
                where: {
                    userId,
                    photo: {
                        folder: {
                            galleryId
                        }
                    }
                },
                include: {
                    photo: {
                        select: {
                            id: true,
                            filename: true,
                            originalUrl: true
                        }
                    }
                }
            })
            : prisma.favoritedPhoto.findMany({
                where: {
                    userId,
                    photo: {
                        folder: {
                            galleryId
                        }
                    }
                },
                include: {
                    photo: {
                        select: {
                            id: true,
                            filename: true,
                            originalUrl: true
                        }
                    }
                }
            })

        const filteredPhotos = await photoQuery

        if (filteredPhotos.length === 0) {
            throw new Error(`No ${filterType} photos found in this gallery`)
        }

        // Create download tracking
        const zipFilename = `${gallery.title.replace(/[^a-zA-Z0-9]/g, '_')}_${filterType}_photos.zip`
        const downloadId = this.createDownload(zipFilename, filteredPhotos.length)

        console.log(`📦 Starting ${filterType} photos download: ${downloadId}`)

        // Set response headers for zip download
        res.setHeader('Content-Type', 'application/zip')
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`)
        res.setHeader('X-Download-ID', downloadId)

        // Create zip archive with optimized settings
        const useCompression = filteredPhotos.length < 500
        const archive = archiver('zip', {
            zlib: { level: useCompression ? 6 : 0 },
            store: !useCompression,
            highWaterMark: 1024 * 1024 // 1MB buffer
        })
        
        console.log(`📦 Archive mode: ${useCompression ? 'compressed' : 'stored'} for ${filteredPhotos.length} photos`)

        // Handle archive events
        const archiveErrorHandler = (err: any) => {
            console.error('Archive error:', err)
            this.updateProgress(downloadId, {
                status: 'error',
                error: err.message
            })
            
            // Destroy archive to free resources
            if (archive && typeof archive.destroy === 'function') {
                try {
                    archive.destroy()
                    console.log('🧹 Archive destroyed after error')
                } catch (destroyError) {
                    console.warn('Failed to destroy archive:', destroyError)
                }
            }
            
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: 'Failed to create archive' })
            }
        }

        const archiveProgressHandler = (progress: any) => {
            // Update progress based on archive progress
            const percentage = Math.round((progress.entries.processed / progress.entries.total) * 100)
            this.updateProgress(downloadId, {
                status: 'processing',
                processedPhotos: progress.entries.processed
            })
        }

        const clientDisconnectHandler = () => {
            console.log('⚠️ Client disconnected, aborting archive creation')
            this.updateProgress(downloadId, {
                status: 'error',
                error: 'Client disconnected'
            })
            
            // Destroy archive to stop processing
            if (archive && typeof archive.destroy === 'function') {
                try {
                    archive.destroy()
                    console.log('🧹 Archive destroyed after client disconnect')
                } catch (destroyError) {
                    console.warn('Failed to destroy archive:', destroyError)
                }
            }
        }

        archive.on('error', archiveErrorHandler)
        archive.on('progress', archiveProgressHandler)
        res.on('close', clientDisconnectHandler)

        // Update status to processing
        this.updateProgress(downloadId, { status: 'processing' })

        // Pipe archive to response
        archive.pipe(res)

        // Add photos to archive
        let processedCount = 0
        for (const filteredPhoto of filteredPhotos) {
            let streamToDestroy: any = null
            try {
                const photo = filteredPhoto.photo
                console.log(`📁 Adding photo ${processedCount + 1}/${filteredPhotos.length}: ${photo.filename}`)

                // Extract S3 key from URL
                const originalUrl = new URL(photo.originalUrl)
                const pathParts = originalUrl.pathname.split('/').filter(part => part.length > 0)
                const bucketName = pathParts[0]
                const s3Key = decodeURIComponent(pathParts.slice(1).join('/'))

                // Get photo stream from S3 with timeout and proper cleanup
                const streamPromise = getObjectStreamFromS3(s3Key, bucketName)
                const timeoutPromise = new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('S3 stream timeout')), 30000)
                )
                
                let result: any
                try {
                    result = await Promise.race([streamPromise, timeoutPromise])
                } catch (error) {
                    // If timeout occurred, destroy the stream from the losing promise
                    try {
                        const streamResult = await Promise.race([
                            streamPromise,
                            new Promise(resolve => setTimeout(() => resolve(null), 100))
                        ])
                        if (streamResult && (streamResult as any).stream) {
                            const lostStream = (streamResult as any).stream
                            if (lostStream && typeof lostStream.destroy === 'function') {
                                lostStream.destroy()
                                console.log(`🧹 Destroyed orphaned stream for ${photo.filename}`)
                            }
                        }
                    } catch (cleanupError) {
                        // Ignore cleanup errors
                    }
                    throw error
                }
                
                const { stream } = result
                streamToDestroy = stream
                
                // Add to archive with original filename
                archive.append(stream, { name: photo.filename })
                
                // Wait for archive to drain if it's getting full (backpressure)
                if (archive.pointer() > 10 * 1024 * 1024) { // If archive buffer > 10MB
                    await new Promise<void>((resolve) => {
                        const checkDrain = () => {
                            if (archive.pointer() < 5 * 1024 * 1024) { // Wait until < 5MB
                                resolve()
                            } else {
                                setTimeout(checkDrain, 100)
                            }
                        }
                        checkDrain()
                    })
                }
                
                // Clear reference after successful append
                streamToDestroy = null
                
                processedCount++
                
                // Update progress
                this.updateProgress(downloadId, {
                    processedPhotos: processedCount
                })
                
            } catch (error) {
                console.error(`Failed to add photo ${filteredPhoto.photo.filename}:`, error)
                
                // Clean up stream if it exists
                if (streamToDestroy && typeof streamToDestroy.destroy === 'function') {
                    try {
                        streamToDestroy.destroy()
                        console.log(`🧹 Destroyed stream after error for ${filteredPhoto.photo.filename}`)
                    } catch (destroyError) {
                        console.warn(`Failed to destroy stream:`, destroyError)
                    }
                }
                
                // Continue with other photos
            }
        }

        console.log(`✅ Added ${processedCount} photos to archive`)

        // Update status to ready
        this.updateProgress(downloadId, {
            status: 'ready',
            processedPhotos: processedCount
        })

        // Finalize the archive
        await archive.finalize()

        // Clean up after a delay
        setTimeout(() => {
            this.cleanupDownload(downloadId)
        }, 300000) // 5 minutes
    }

    static async verifyGalleryAccess(
        galleryId: string,
        userId: string,
        userRole: string,
        password?: string
    ): Promise<boolean> {
        const gallery = await prisma.gallery.findUnique({
            where: { id: galleryId },
            select: {
                password: true,
                photographerId: true
            }
        })

        if (!gallery) {
            return false
        }

        // Check if gallery has password protection
        if (gallery.password) {
            // Check if user is photographer owner or client with access
            if (userRole === 'PHOTOGRAPHER' && userId === gallery.photographerId) {
                return true
            }

            const hasAccess = await prisma.galleryAccess.findUnique({
                where: { userId_galleryId: { userId, galleryId } }
            })
            
            if (hasAccess) {
                return true
            }

            // Validate provided password
            if (!password) {
                return false
            }

            const bcrypt = await import('bcryptjs')
            return await bcrypt.default.compare(password, gallery.password)
        }

        return true
    }
}