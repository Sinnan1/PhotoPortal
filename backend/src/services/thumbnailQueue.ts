import { PrismaClient } from '@prisma/client'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { Readable } from 'stream'
import path from 'path'
import { UPLOAD_CONFIG } from '../config/uploadConfig'
import { isRawFile, createPlaceholderThumbnail, SHARP_SUPPORTED_RAW } from '../utils/s3Storage'

// @ts-ignore - thumbnailStatus, uploadStatus will be available after running: npx prisma migrate dev && npx prisma generate
const prisma = new PrismaClient()

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-005',
    endpoint: `https://s3.${process.env.AWS_REGION || 'us-east-005'}.backblazeb2.com`,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
})

interface ThumbnailJob {
    photoId: string
    s3Key: string
    galleryId: string
    originalFilename: string
    priority?: number
}

class ThumbnailQueue {
    private queue: ThumbnailJob[] = []
    private processing = false
    private concurrency = UPLOAD_CONFIG.THUMBNAIL_QUEUE_CONCURRENCY
    private activeJobs = 0

    /**
     * Add a thumbnail generation job to the queue
     */
    async add(job: ThumbnailJob) {
        this.queue.push(job)
        console.log(`📸 Thumbnail job queued: ${job.originalFilename} (Queue size: ${this.queue.length})`)

        // Start processing if not already running
        if (!this.processing) {
            this.process()
        }
    }

    /**
     * Add multiple jobs at once
     */
    async addBatch(jobs: ThumbnailJob[]) {
        this.queue.push(...jobs)
        console.log(`📸 ${jobs.length} thumbnail jobs queued (Queue size: ${this.queue.length})`)

        if (!this.processing) {
            this.process()
        }
    }

    /**
     * Process the queue
     */
    private async process() {
        if (this.processing) return
        this.processing = true

        console.log(`🔄 Starting thumbnail queue processing (${this.queue.length} jobs)`)

        while (this.queue.length > 0 || this.activeJobs > 0) {
            // Process jobs up to concurrency limit
            while (this.activeJobs < this.concurrency && this.queue.length > 0) {
                const job = this.queue.shift()
                if (job) {
                    this.activeJobs++
                    this.processJob(job)
                        .catch(error => {
                            console.error(`❌ Thumbnail job failed: ${job.originalFilename}`, error)
                        })
                        .finally(() => {
                            this.activeJobs--
                        })
                }
            }

            // Wait a bit before checking again
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        this.processing = false
        console.log(`✅ Thumbnail queue processing complete`)
    }

    /**
     * Process a single thumbnail job
     */
    private async processJob(job: ThumbnailJob) {
        try {
            console.log(`🔄 Processing thumbnail: ${job.originalFilename}`)

            // Update status to PROCESSING
            await prisma.photo.update({
                where: { id: job.photoId },
                data: { thumbnailStatus: 'PROCESSING' }
            })

            // Generate thumbnails
            const thumbnailUrls = await this.generateThumbnails(
                job.s3Key,
                job.galleryId,
                job.originalFilename
            )

            // Update photo record with thumbnail URLs
            await prisma.photo.update({
                where: { id: job.photoId },
                data: {
                    thumbnailUrl: thumbnailUrls.small,
                    mediumUrl: thumbnailUrls.medium,
                    largeUrl: thumbnailUrls.large,
                    thumbnailStatus: 'COMPLETED'
                }
            })

            console.log(`✅ Thumbnail completed: ${job.originalFilename}`)
        } catch (error) {
            console.error(`❌ Thumbnail failed: ${job.originalFilename}`, error)

            // Mark as failed in database
            await prisma.photo.update({
                where: { id: job.photoId },
                data: {
                    thumbnailStatus: 'FAILED',
                    thumbnailUrl: null,
                    mediumUrl: null,
                    largeUrl: null
                }
            }).catch(() => { })
        }
    }

    /**
     * Generate all thumbnail sizes for a photo
     */
    private async generateThumbnails(
        s3Key: string,
        galleryId: string,
        originalFilename: string
    ): Promise<{ small: string; medium: string; large: string }> {
        // Get file from S3
        const { fileBuffer, fileSize } = await this.getFileFromS3(s3Key)

        // Extract filename parts
        const rawExtension = path.extname(originalFilename)
        const fileExtension = rawExtension.toLowerCase()
        const baseName = path.basename(originalFilename, rawExtension)

        const thumbnailUrls: { small?: string; medium?: string; large?: string } = {}

        // Generate each thumbnail size
        for (const [sizeName, dimensions] of Object.entries(UPLOAD_CONFIG.THUMBNAIL_SIZES)) {
            try {
                let thumbnailBuffer: Buffer

                // Handle RAW files
                if (isRawFile(originalFilename)) {
                    if (SHARP_SUPPORTED_RAW.includes(fileExtension)) {
                        try {
                            thumbnailBuffer = await sharp(fileBuffer)
                                .resize(dimensions.width, dimensions.height, {
                                    fit: 'inside',
                                    withoutEnlargement: true
                                })
                                .jpeg({ quality: 80 })
                                .toBuffer()
                        } catch (sharpError) {
                            console.warn(`Sharp failed for ${originalFilename} (${sizeName}), using placeholder`)
                            thumbnailBuffer = await createPlaceholderThumbnail(originalFilename)
                            thumbnailBuffer = await sharp(thumbnailBuffer)
                                .resize(dimensions.width, dimensions.height, { fit: 'inside' })
                                .jpeg({ quality: 80 })
                                .toBuffer()
                        }
                    } else {
                        // Unsupported RAW format - use placeholder
                        thumbnailBuffer = await createPlaceholderThumbnail(originalFilename)
                        thumbnailBuffer = await sharp(thumbnailBuffer)
                            .resize(dimensions.width, dimensions.height, { fit: 'inside' })
                            .jpeg({ quality: 80 })
                            .toBuffer()
                    }
                } else {
                    // Regular image file
                    thumbnailBuffer = await sharp(fileBuffer)
                        .resize(dimensions.width, dimensions.height, {
                            fit: 'inside',
                            withoutEnlargement: true
                        })
                        .jpeg({ quality: 80 })
                        .toBuffer()
                }

                // Upload thumbnail to S3
                const thumbnailKey = `${galleryId}/thumbnails/${baseName}_${sizeName}.jpg`
                const thumbnailUrl = await this.uploadThumbnailToS3(thumbnailKey, thumbnailBuffer)

                thumbnailUrls[sizeName as keyof typeof thumbnailUrls] = thumbnailUrl
            } catch (error) {
                console.error(`Failed to generate ${sizeName} thumbnail for ${originalFilename}:`, error)
                throw error
            }
        }

        if (!thumbnailUrls.small || !thumbnailUrls.medium || !thumbnailUrls.large) {
            throw new Error('Failed to generate all required thumbnail sizes')
        }

        return {
            small: thumbnailUrls.small,
            medium: thumbnailUrls.medium,
            large: thumbnailUrls.large
        }
    }

    /**
     * Get file from S3
     */
    private async getFileFromS3(key: string): Promise<{ fileBuffer: Buffer; fileSize: number }> {
        // First, get file size
        const headCommand = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: key
        })

        const { ContentLength } = await s3Client.send(headCommand)
        const fileSize = ContentLength || 0
        const isLargeFile = fileSize > 50 * 1024 * 1024 // 50MB threshold

        let fileBuffer: Buffer

        if (isLargeFile) {
            // For large files, download only first 10MB for thumbnail generation
            const getCommand = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME!,
                Key: key,
                Range: 'bytes=0-10485760' // First 10MB
            })

            const { Body } = await s3Client.send(getCommand)
            if (!Body) {
                throw new Error('File not found in storage')
            }

            fileBuffer = await this.streamToBuffer(Body as Readable)
        } else {
            // For smaller files, download the entire file
            const getCommand = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME!,
                Key: key
            })

            const { Body } = await s3Client.send(getCommand)
            if (!Body) {
                throw new Error('File not found in storage')
            }

            fileBuffer = await this.streamToBuffer(Body as Readable)
        }

        return { fileBuffer, fileSize }
    }

    /**
     * Upload thumbnail to S3
     */
    private async uploadThumbnailToS3(key: string, buffer: Buffer): Promise<string> {
        const uploadCommand = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: key,
            Body: buffer,
            ContentType: 'image/jpeg',
            Metadata: {
                thumbnailCreatedAt: new Date().toISOString()
            }
        })

        await s3Client.send(uploadCommand)

        const bucketName = process.env.S3_BUCKET_NAME!
        const endpoint = `https://s3.${process.env.AWS_REGION || 'us-east-005'}.backblazeb2.com`
        return `${endpoint}/${bucketName}/${key}`
    }

    /**
     * Convert stream to buffer
     */
    private async streamToBuffer(stream: Readable): Promise<Buffer> {
        const chunks: Buffer[] = []
        for await (const chunk of stream) {
            chunks.push(chunk)
        }
        return Buffer.concat(chunks)
    }

    /**
     * Get queue size
     */
    getQueueSize(): number {
        return this.queue.length
    }

    /**
     * Get active jobs count
     */
    getActiveJobs(): number {
        return this.activeJobs
    }

    /**
     * Get queue status
     */
    getStatus() {
        return {
            queueSize: this.queue.length,
            activeJobs: this.activeJobs,
            processing: this.processing,
            concurrency: this.concurrency
        }
    }
}

export const thumbnailQueue = new ThumbnailQueue()
