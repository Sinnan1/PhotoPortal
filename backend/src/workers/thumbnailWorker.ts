/**
 * Thumbnail Worker - Runs in separate thread for parallel processing
 * Uses all available CPU cores for maximum performance
 */

import { parentPort, workerData } from 'worker_threads'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { Readable } from 'stream'
import path from 'path'

interface WorkerData {
    photoId: string
    s3Key: string
    galleryId: string
    originalFilename: string
    thumbnailSize: {
        name: string
        width: number
        height: number
    }
    s3Config: {
        region: string
        endpoint: string
        bucketName: string
        accessKeyId: string
        secretAccessKey: string
    }
}

const s3Client = new S3Client({
    region: workerData.s3Config.region,
    endpoint: workerData.s3Config.endpoint,
    forcePathStyle: true,
    credentials: {
        accessKeyId: workerData.s3Config.accessKeyId,
        secretAccessKey: workerData.s3Config.secretAccessKey
    }
})

async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
        chunks.push(chunk)
    }
    return Buffer.concat(chunks)
}

async function getFileFromS3(key: string): Promise<Buffer> {
    const getCommand = new GetObjectCommand({
        Bucket: workerData.s3Config.bucketName,
        Key: key
    })

    const { Body } = await s3Client.send(getCommand)
    if (!Body) {
        throw new Error('File not found in storage')
    }

    return streamToBuffer(Body as Readable)
}

async function uploadThumbnailToS3(key: string, buffer: Buffer): Promise<string> {
    const uploadCommand = new PutObjectCommand({
        Bucket: workerData.s3Config.bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg',
        Metadata: {
            thumbnailCreatedAt: new Date().toISOString()
        }
    })

    await s3Client.send(uploadCommand)

    return `${workerData.s3Config.endpoint}/${workerData.s3Config.bucketName}/${key}`
}

async function generateThumbnail() {
    try {
        const { s3Key, galleryId, originalFilename, thumbnailSize } = workerData as WorkerData

        // Download original image
        const fileBuffer = await getFileFromS3(s3Key)

        // Generate thumbnail
        const thumbnailBuffer = await sharp(fileBuffer)
            .resize(thumbnailSize.width, thumbnailSize.height, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 85, mozjpeg: true }) // Use mozjpeg for better compression
            .toBuffer()

        // Upload thumbnail
        const rawExtension = path.extname(originalFilename)
        const baseName = path.basename(originalFilename, rawExtension)
        const thumbnailKey = `${galleryId}/thumbnails/${baseName}_${thumbnailSize.name}.jpg`
        const thumbnailUrl = await uploadThumbnailToS3(thumbnailKey, thumbnailBuffer)

        // Send success result back to main thread
        parentPort?.postMessage({
            success: true,
            sizeName: thumbnailSize.name,
            url: thumbnailUrl
        })
    } catch (error) {
        // Send error back to main thread
        parentPort?.postMessage({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}

// Start processing
generateThumbnail()
