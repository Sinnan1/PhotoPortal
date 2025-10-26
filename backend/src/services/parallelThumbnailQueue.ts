/**
 * Parallel Thumbnail Queue - Uses Worker Threads for Multi-Core Processing
 * Dramatically faster than sequential processing
 */

import { PrismaClient } from '@prisma/client'
import { Worker } from 'worker_threads'
import path from 'path'
import os from 'os'
import { UPLOAD_CONFIG } from '../config/uploadConfig'

const prisma = new PrismaClient()

interface ThumbnailJob {
    photoId: string
    s3Key: string
    galleryId: string
    originalFilename: string
    priority?: number
}

interface WorkerResult {
    success: boolean
    sizeName?: string
    url?: string
    error?: string
}

class ParallelThumbnailQueue {
    private queue: ThumbnailJob[] = []
    private processing = false
    private maxWorkers: number
    private activeWorkers = 0
    private s3Config: any

    constructor() {
        // Use all available CPU cores (or limit to 8 for safety)
        const cpuCount = os.cpus().length
        this.maxWorkers = Math.min(cpuCount, 8)
        
        console.log(`🚀 Parallel Thumbnail Queue initialized with ${this.maxWorkers} workers (${cpuCount} CPUs available)`)

        // Prepare S3 config for workers
        this.s3Config = {
            region: process.env.AWS_REGION || 'us-east-005',
            endpoint: `https://s3.${process.env.AWS_REGION || 'us-east-005'}.backblazeb2.com`,
            bucketName: process.env.S3_BUCKET_NAME!,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
        }
    }

    /**
     * Add a thumbnail generation job to the queue
     */
    async add(job: ThumbnailJob) {
        this.queue.push(job)
        console.log(`📸 Thumbnail job queued: ${job.originalFilename} (Queue: ${this.queue.length})`)

        if (!this.processing) {
            this.process()
        }
    }

    /**
     * Add multiple jobs at once
     */
    async addBatch(jobs: ThumbnailJob[]) {
        this.queue.push(...jobs)
        console.log(`📸 ${jobs.length} thumbnail jobs queued (Queue: ${this.queue.length})`)

        if (!this.processing) {
            this.process()
        }
    }

    /**
     * Process the queue with parallel workers
     */
    private async process() {
        if (this.processing) return
        this.processing = true

        console.log(`🔄 Starting parallel thumbnail processing (${this.queue.length} jobs, ${this.maxWorkers} workers)`)

        while (this.queue.length > 0 || this.activeWorkers > 0) {
            // Start new workers up to max limit
            while (this.activeWorkers < this.maxWorkers && this.queue.length > 0) {
                const job = this.queue.shift()
                if (job) {
                    this.activeWorkers++
                    this.processJobParallel(job)
                        .catch(error => {
                            console.error(`❌ Thumbnail job failed: ${job.originalFilename}`, error)
                        })
                        .finally(() => {
                            this.activeWorkers--
                        })
                }
            }

            // Wait before checking again
            await new Promise(resolve => setTimeout(resolve, 50))
        }

        this.processing = false
        console.log(`✅ Parallel thumbnail processing complete`)
    }

    /**
     * Process a single job using parallel workers for each thumbnail size
     */
    private async processJobParallel(job: ThumbnailJob) {
        try {
            console.log(`🔄 Processing thumbnail (parallel): ${job.originalFilename}`)

            // Photo is already created, just generate thumbnails
            console.log(`⚙️ Generating thumbnails for: ${job.originalFilename}`)

            // Generate all thumbnail sizes in parallel using worker threads
            const thumbnailPromises = Object.entries(UPLOAD_CONFIG.THUMBNAIL_SIZES).map(
                ([sizeName, dimensions]) => this.generateThumbnailWithWorker(job, sizeName, dimensions)
            )

            const results = await Promise.all(thumbnailPromises)

            // Collect URLs
            const thumbnailUrls: Record<string, string> = {}
            for (const result of results) {
                if (result.success && result.sizeName && result.url) {
                    thumbnailUrls[result.sizeName] = result.url
                } else {
                    throw new Error(`Failed to generate ${result.sizeName} thumbnail`)
                }
            }

            // Update photo record with thumbnail URLs
            await prisma.photo.update({
                where: { id: job.photoId },
                data: {
                    thumbnailUrl: thumbnailUrls.medium, // Use medium as default thumbnail
                    mediumUrl: thumbnailUrls.medium,
                    largeUrl: thumbnailUrls.medium // We only generate one size now
                }
            })

            console.log(`✅ Thumbnail completed (parallel): ${job.originalFilename}`)
        } catch (error) {
            console.error(`❌ Thumbnail failed: ${job.originalFilename}`, error)

            // Log failure (photo record already exists with original URL)
            console.error(`Failed to generate thumbnails for photo ${job.photoId}`)
        }
    }

    /**
     * Generate a single thumbnail size using a worker thread
     */
    private generateThumbnailWithWorker(
        job: ThumbnailJob,
        sizeName: string,
        dimensions: { width: number; height: number }
    ): Promise<WorkerResult> {
        return new Promise((resolve, reject) => {
            const workerPath = path.join(__dirname, '../workers/thumbnailWorker.js')
            
            const worker = new Worker(workerPath, {
                workerData: {
                    photoId: job.photoId,
                    s3Key: job.s3Key,
                    galleryId: job.galleryId,
                    originalFilename: job.originalFilename,
                    thumbnailSize: {
                        name: sizeName,
                        width: dimensions.width,
                        height: dimensions.height
                    },
                    s3Config: this.s3Config
                }
            })

            // Set timeout for worker (30 seconds)
            const timeout = setTimeout(() => {
                worker.terminate()
                reject(new Error(`Worker timeout for ${sizeName}`))
            }, 30000)

            worker.on('message', (result: WorkerResult) => {
                clearTimeout(timeout)
                worker.terminate()
                resolve(result)
            })

            worker.on('error', (error) => {
                clearTimeout(timeout)
                worker.terminate()
                reject(error)
            })

            worker.on('exit', (code) => {
                clearTimeout(timeout)
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`))
                }
            })
        })
    }

    /**
     * Get queue status
     */
    getStatus() {
        return {
            queueSize: this.queue.length,
            activeWorkers: this.activeWorkers,
            maxWorkers: this.maxWorkers,
            processing: this.processing,
            cpuCount: os.cpus().length
        }
    }

    /**
     * Get queue size
     */
    getQueueSize(): number {
        return this.queue.length
    }

    /**
     * Get active workers count
     */
    getActiveWorkers(): number {
        return this.activeWorkers
    }
}

export const parallelThumbnailQueue = new ParallelThumbnailQueue()
