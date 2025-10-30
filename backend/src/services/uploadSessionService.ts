import { PrismaClient } from '@prisma/client'

// @ts-ignore - uploadSession will be available after running: npx prisma migrate dev && npx prisma generate
const prisma = new PrismaClient()

export class UploadSessionService {
    /**
     * Create a new upload session
     */
    async createSession(
        userId: string,
        galleryId: string,
        folderId: string,
        totalFiles: number,
        totalBytes: number
    ) {
        return await prisma.uploadSession.create({
            data: {
                userId,
                galleryId,
                folderId,
                totalFiles,
                totalBytes: BigInt(totalBytes),
                status: 'IN_PROGRESS'
            }
        })
    }

    /**
     * Update session progress
     */
    async updateProgress(
        sessionId: string,
        uploadedFiles: number,
        failedFiles: number,
        uploadedBytes: number
    ) {
        return await prisma.uploadSession.update({
            where: { id: sessionId },
            data: {
                uploadedFiles,
                failedFiles,
                uploadedBytes: BigInt(uploadedBytes),
                lastActivityAt: new Date()
            }
        })
    }

    /**
     * Mark session as completed
     */
    async completeSession(sessionId: string) {
        return await prisma.uploadSession.update({
            where: { id: sessionId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                lastActivityAt: new Date()
            }
        })
    }

    /**
     * Mark session as failed
     */
    async failSession(sessionId: string, errorMessage: string) {
        return await prisma.uploadSession.update({
            where: { id: sessionId },
            data: {
                status: 'FAILED',
                errorMessage,
                completedAt: new Date(),
                lastActivityAt: new Date()
            }
        })
    }

    /**
     * Pause session
     */
    async pauseSession(sessionId: string) {
        return await prisma.uploadSession.update({
            where: { id: sessionId },
            data: {
                status: 'PAUSED',
                lastActivityAt: new Date()
            }
        })
    }

    /**
     * Resume session
     */
    async resumeSession(sessionId: string) {
        const session = await prisma.uploadSession.findUnique({
            where: { id: sessionId },
            include: {
                photos: {
                    select: {
                        id: true,
                        filename: true,
                        uploadStatus: true
                    }
                }
            }
        })

        if (!session) {
            throw new Error('Session not found')
        }

        // Update status to IN_PROGRESS
        await prisma.uploadSession.update({
            where: { id: sessionId },
            data: {
                status: 'IN_PROGRESS',
                lastActivityAt: new Date()
            }
        })

        // Return list of already uploaded files
        const uploadedFiles = session.photos
            .filter(p => p.uploadStatus === 'COMPLETED')
            .map(p => p.filename)

        return {
            session,
            uploadedFiles,
            remaining: session.totalFiles - uploadedFiles.length
        }
    }

    /**
     * Cancel session
     */
    async cancelSession(sessionId: string) {
        return await prisma.uploadSession.update({
            where: { id: sessionId },
            data: {
                status: 'CANCELLED',
                completedAt: new Date(),
                lastActivityAt: new Date()
            }
        })
    }

    /**
     * Get session by ID
     */
    async getSession(sessionId: string) {
        return await prisma.uploadSession.findUnique({
            where: { id: sessionId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                gallery: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                photos: {
                    select: {
                        id: true,
                        filename: true,
                        uploadStatus: true,
                        thumbnailStatus: true,
                        fileSize: true
                    }
                }
            }
        })
    }

    /**
     * Get active sessions for a user
     */
    async getUserActiveSessions(userId: string) {
        return await prisma.uploadSession.findMany({
            where: {
                userId,
                status: {
                    in: ['IN_PROGRESS', 'PAUSED']
                }
            },
            include: {
                gallery: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            orderBy: {
                lastActivityAt: 'desc'
            }
        })
    }

    /**
     * Clean up old completed/failed sessions
     */
    async cleanupOldSessions(retentionDays: number = 7) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

        const result = await prisma.uploadSession.deleteMany({
            where: {
                lastActivityAt: { lt: cutoffDate },
                status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] }
            }
        })

        console.log(`🧹 Cleaned up ${result.count} old upload sessions`)
        return result.count
    }

    /**
     * Get session statistics
     */
    async getSessionStats(sessionId: string) {
        const session = await prisma.uploadSession.findUnique({
            where: { id: sessionId },
            include: {
                photos: {
                    select: {
                        uploadStatus: true,
                        thumbnailStatus: true,
                        fileSize: true
                    }
                }
            }
        })

        if (!session) {
            throw new Error('Session not found')
        }

        const completedPhotos = session.photos.filter(p => p.uploadStatus === 'COMPLETED').length
        const failedPhotos = session.photos.filter(p => p.uploadStatus === 'FAILED').length
        const pendingPhotos = session.totalFiles - completedPhotos - failedPhotos

        const thumbnailsCompleted = session.photos.filter(p => p.thumbnailStatus === 'COMPLETED').length
        const thumbnailsPending = session.photos.filter(p => p.thumbnailStatus === 'PENDING').length
        const thumbnailsFailed = session.photos.filter(p => p.thumbnailStatus === 'FAILED').length

        const totalUploadedBytes = session.photos
            .filter(p => p.uploadStatus === 'COMPLETED')
            .reduce((sum, p) => sum + p.fileSize, 0)

        const elapsedTime = Date.now() - session.startedAt.getTime()
        const uploadSpeed = totalUploadedBytes / (elapsedTime / 1000) // bytes per second

        return {
            sessionId: session.id,
            status: session.status,
            totalFiles: session.totalFiles,
            completedPhotos,
            failedPhotos,
            pendingPhotos,
            thumbnailsCompleted,
            thumbnailsPending,
            thumbnailsFailed,
            totalBytes: Number(session.totalBytes),
            uploadedBytes: totalUploadedBytes,
            uploadSpeed,
            elapsedTime,
            startedAt: session.startedAt,
            completedAt: session.completedAt,
            lastActivityAt: session.lastActivityAt
        }
    }
}

export const uploadSessionService = new UploadSessionService()
