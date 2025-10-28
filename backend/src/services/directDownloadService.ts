/**
 * Direct Download Service - B2 Pre-Signed URL Generation
 * 
 * This service generates pre-signed URLs for direct downloads from B2,
 * eliminating VPS bandwidth usage for downloads.
 * 
 * Benefits:
 * - Zero VPS bandwidth for downloads (saves 100GB per download)
 * - Faster downloads (direct from B2, no VPS bottleneck)
 * - Better scalability (no VPS resource usage)
 * - Simpler architecture (no streaming through VPS)
 * 
 * How it works:
 * 1. Client requests download
 * 2. VPS generates temporary signed URL (1KB bandwidth)
 * 3. Client downloads directly from B2 using signed URL
 * 4. VPS bandwidth used: ~1KB (vs 50GB with streaming)
 * 
 * @since Direct B2 downloads implementation
 */

import { PrismaClient } from '@prisma/client'
import { generatePresignedDownloadUrl } from '../utils/s3Storage'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export class DirectDownloadService {
    /**
     * Verify gallery access for downloads
     */
    static async verifyGalleryAccess(
        galleryId: string,
        userId: string,
        userRole: string,
        providedPassword?: string
    ): Promise<boolean> {
        const gallery = await prisma.gallery.findUnique({
            where: { id: galleryId },
            select: {
                id: true,
                password: true,
                photographerId: true,
                expiresAt: true
            }
        })

        if (!gallery) {
            return false
        }

        // Check if gallery has expired
        if (gallery.expiresAt && gallery.expiresAt < new Date()) {
            return false
        }

        // If no password protection, allow access
        if (!gallery.password) {
            return true
        }

        // Check if user is the photographer
        if (userRole === 'PHOTOGRAPHER' && userId === gallery.photographerId) {
            return true
        }

        // Check if user has explicit access
        const hasAccess = await prisma.galleryAccess.findUnique({
            where: { userId_galleryId: { userId, galleryId } }
        })

        if (hasAccess) {
            return true
        }

        // Verify password if provided
        if (providedPassword && gallery.password) {
            return await bcrypt.compare(providedPassword, gallery.password)
        }

        return false
    }

    /**
     * Generate direct download URL for a single photo
     */
    static async generatePhotoDownloadUrl(
        photoId: string,
        userId: string,
        userRole: string,
        providedPassword?: string
    ): Promise<{ url: string; filename: string }> {
        const photo = await prisma.photo.findUnique({
            where: { id: photoId },
            include: {
                folder: {
                    include: {
                        gallery: {
                            select: {
                                id: true,
                                password: true,
                                photographerId: true,
                                expiresAt: true
                            }
                        }
                    }
                }
            }
        })

        if (!photo) {
            throw new Error('Photo not found')
        }

        // Verify access
        const hasAccess = await this.verifyGalleryAccess(
            photo.folder.gallery.id,
            userId,
            userRole,
            providedPassword
        )

        if (!hasAccess) {
            throw new Error('Access denied')
        }

        // Extract S3 key from URL
        const originalUrl = new URL(photo.originalUrl)
        const pathParts = originalUrl.pathname.split('/').filter(part => part.length > 0)
        const s3Key = decodeURIComponent(pathParts.slice(1).join('/'))

        // Generate pre-signed URL (expires in 1 hour)
        const signedUrl = await generatePresignedDownloadUrl(s3Key, 3600, photo.filename)

        console.log(`✅ Generated direct download URL for photo: ${photo.filename}`)

        return {
            url: signedUrl,
            filename: photo.filename
        }
    }

    /**
     * Generate direct download URLs for multiple photos
     * Returns array of signed URLs for batch downloads
     */
    static async generateMultiplePhotoDownloadUrls(
        photoIds: string[],
        userId: string,
        userRole: string,
        providedPassword?: string
    ): Promise<Array<{ photoId: string; url: string; filename: string }>> {
        const photos = await prisma.photo.findMany({
            where: { id: { in: photoIds } },
            include: {
                folder: {
                    include: {
                        gallery: {
                            select: {
                                id: true,
                                password: true,
                                photographerId: true,
                                expiresAt: true
                            }
                        }
                    }
                }
            }
        })

        if (photos.length === 0) {
            throw new Error('No photos found')
        }

        // Verify access to all galleries
        const galleryIds = [...new Set(photos.map(p => p.folder.gallery.id))]
        for (const galleryId of galleryIds) {
            const hasAccess = await this.verifyGalleryAccess(
                galleryId,
                userId,
                userRole,
                providedPassword
            )

            if (!hasAccess) {
                throw new Error(`Access denied to gallery ${galleryId}`)
            }
        }

        // Generate signed URLs for all photos
        const urlPromises = photos.map(async (photo) => {
            const originalUrl = new URL(photo.originalUrl)
            const pathParts = originalUrl.pathname.split('/').filter(part => part.length > 0)
            const s3Key = decodeURIComponent(pathParts.slice(1).join('/'))

            const signedUrl = await generatePresignedDownloadUrl(s3Key, 3600, photo.filename)

            return {
                photoId: photo.id,
                url: signedUrl,
                filename: photo.filename
            }
        })

        const results = await Promise.all(urlPromises)

        console.log(`✅ Generated ${results.length} direct download URLs`)

        return results
    }

    /**
     * Generate direct download URL for gallery ZIP
     * 
     * Note: This still requires creating the ZIP on VPS first time,
     * but subsequent downloads can be direct from B2 if we cache the ZIP.
     * 
     * For now, we'll return a flag indicating whether to use direct download
     * or streaming download based on whether a cached ZIP exists.
     */
    static async generateGalleryZipDownloadUrl(
        galleryId: string,
        userId: string,
        userRole: string,
        downloadType: 'all' | 'folder',
        folderId?: string,
        providedPassword?: string
    ): Promise<{ useDirectDownload: boolean; url?: string; filename?: string }> {
        // Verify access
        const hasAccess = await this.verifyGalleryAccess(
            galleryId,
            userId,
            userRole,
            providedPassword
        )

        if (!hasAccess) {
            throw new Error('Access denied')
        }

        // For now, we'll always use streaming download for ZIPs
        // In the future, we can implement ZIP caching in B2
        // and return direct download URLs for cached ZIPs

        // TODO: Implement ZIP caching
        // 1. Check if ZIP exists in B2
        // 2. If exists and still valid (photos haven't changed), return signed URL
        // 3. If not exists, return flag to use streaming download

        return {
            useDirectDownload: false
        }
    }

    /**
     * Generate direct download URLs for filtered photos (liked/favorited)
     */
    static async generateFilteredPhotoDownloadUrls(
        galleryId: string,
        userId: string,
        userRole: string,
        filterType: 'liked' | 'favorited',
        providedPassword?: string
    ): Promise<Array<{ photoId: string; url: string; filename: string }>> {
        // Verify access
        const hasAccess = await this.verifyGalleryAccess(
            galleryId,
            userId,
            userRole,
            providedPassword
        )

        if (!hasAccess) {
            throw new Error('Access denied')
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
            throw new Error(`No ${filterType} photos found`)
        }

        // Generate signed URLs
        const urlPromises = filteredPhotos.map(async (fp) => {
            const photo = fp.photo
            const originalUrl = new URL(photo.originalUrl)
            const pathParts = originalUrl.pathname.split('/').filter(part => part.length > 0)
            const s3Key = decodeURIComponent(pathParts.slice(1).join('/'))

            const signedUrl = await generatePresignedDownloadUrl(s3Key, 3600, photo.filename)

            return {
                photoId: photo.id,
                url: signedUrl,
                filename: photo.filename
            }
        })

        const results = await Promise.all(urlPromises)

        console.log(`✅ Generated ${results.length} direct download URLs for ${filterType} photos`)

        return results
    }
}
