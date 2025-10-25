import { Request, Response } from 'express'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { Readable } from 'stream'
import { isRawFile, createPlaceholderThumbnail, getContentType, SHARP_SUPPORTED_RAW } from '../utils/s3Storage'
import path from 'path'

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-005',
    endpoint: `https://s3.${process.env.AWS_REGION || 'us-east-005'}.backblazeb2.com`,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
})

// Helper to convert stream to buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks = []
    for await (const chunk of stream) {
        chunks.push(chunk)
    }
    return Buffer.concat(chunks)
}

export const generateThumbnail = async (req: Request, res: Response) => {
    try {
        const { key, galleryId } = req.body

        if (!key || !galleryId) {
            return res.status(400).json({ error: 'key and galleryId are required' })
        }

        // First, get file size to determine if we should use partial download
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
                return res.status(404).json({ error: 'File not found in storage' })
            }

            fileBuffer = await streamToBuffer(Body as Readable)
        } else {
            // For smaller files, download the entire file
            const getCommand = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME!,
                Key: key
            })

            const { Body } = await s3Client.send(getCommand)
            if (!Body) {
                return res.status(404).json({ error: 'File not found in storage' })
            }

            fileBuffer = await streamToBuffer(Body as Readable)
        }

        // Extract filename parts for thumbnail naming
        const originalFilename = path.basename(key)
        const rawExtension = path.extname(originalFilename)
        const fileExtension = rawExtension.toLowerCase()
        const baseName = path.basename(originalFilename, rawExtension)

        // Generate multiple thumbnail sizes
        const thumbnailSizes = [
            { name: 'small', width: 400, height: 400 },
            { name: 'medium', width: 1200, height: 1200 },
            { name: 'large', width: 2000, height: 2000 }
        ]

        const uploadedThumbnails: string[] = []

        // Generate and upload each thumbnail size
        for (const size of thumbnailSizes) {
            const thumbnailFilename = `${galleryId}/thumbnails/${baseName}_${size.name}.jpg`
            let thumbnailBuffer: Buffer

            // Use your existing thumbnail generation logic
            if (isRawFile(originalFilename)) {
                if (SHARP_SUPPORTED_RAW.includes(fileExtension)) {
                    try {
                        thumbnailBuffer = await sharp(fileBuffer)
                            .resize(size.width, size.height, {
                                fit: 'inside',
                                withoutEnlargement: true
                            })
                            .jpeg({ quality: 80 })
                            .toBuffer()
                    } catch (sharpError) {
                        console.warn(`Sharp failed for ${originalFilename} (${size.name}), creating placeholder:`, sharpError)
                        thumbnailBuffer = await createPlaceholderThumbnail(originalFilename)
                        // Resize placeholder to match size
                        thumbnailBuffer = await sharp(thumbnailBuffer)
                            .resize(size.width, size.height, { fit: 'inside' })
                            .jpeg({ quality: 80 })
                            .toBuffer()
                    }
                } else {
                    console.log(`Creating placeholder thumbnail for RAW file: ${originalFilename} (${size.name})`)
                    thumbnailBuffer = await createPlaceholderThumbnail(originalFilename)
                    // Resize placeholder to match size
                    thumbnailBuffer = await sharp(thumbnailBuffer)
                        .resize(size.width, size.height, { fit: 'inside' })
                        .jpeg({ quality: 80 })
                        .toBuffer()
                }
            } else {
                try {
                    thumbnailBuffer = await sharp(fileBuffer)
                        .resize(size.width, size.height, {
                            fit: 'inside',
                            withoutEnlargement: true
                        })
                        .jpeg({ quality: 80 })
                        .toBuffer()
                } catch (error) {
                    console.error(`Failed to create thumbnail for ${originalFilename} (${size.name}):`, error)

                    // If partial download failed and it's a large file, try full download as fallback
                    if (isLargeFile) {
                        console.log(`Retrying thumbnail generation with full file for ${originalFilename} (${size.name})`)
                        try {
                            const fullGetCommand = new GetObjectCommand({
                                Bucket: process.env.S3_BUCKET_NAME!,
                                Key: key
                            })
                            const { Body: FullBody } = await s3Client.send(fullGetCommand)
                            if (FullBody) {
                                const fullFileBuffer = await streamToBuffer(FullBody as Readable)
                                thumbnailBuffer = await sharp(fullFileBuffer)
                                    .resize(size.width, size.height, {
                                        fit: 'inside',
                                        withoutEnlargement: true
                                    })
                                    .jpeg({ quality: 80 })
                                    .toBuffer()
                            } else {
                                thumbnailBuffer = await createPlaceholderThumbnail(originalFilename)
                                thumbnailBuffer = await sharp(thumbnailBuffer)
                                    .resize(size.width, size.height, { fit: 'inside' })
                                    .jpeg({ quality: 80 })
                                    .toBuffer()
                            }
                        } catch (fallbackError) {
                            console.error(`Fallback thumbnail generation also failed for ${originalFilename} (${size.name}):`, fallbackError)
                            thumbnailBuffer = await createPlaceholderThumbnail(originalFilename)
                            thumbnailBuffer = await sharp(thumbnailBuffer)
                                .resize(size.width, size.height, { fit: 'inside' })
                                .jpeg({ quality: 80 })
                                .toBuffer()
                        }
                    } else {
                        thumbnailBuffer = await createPlaceholderThumbnail(originalFilename)
                        thumbnailBuffer = await sharp(thumbnailBuffer)
                            .resize(size.width, size.height, { fit: 'inside' })
                            .jpeg({ quality: 80 })
                            .toBuffer()
                    }
                }
            }

            // Upload thumbnail to B2
            const uploadCommand = new PutObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME!,
                Key: thumbnailFilename,
                Body: thumbnailBuffer,
                ContentType: 'image/jpeg',
                Metadata: {
                    originalKey: key,
                    size: size.name,
                    thumbnailCreatedAt: new Date().toISOString()
                }
            })

            await s3Client.send(uploadCommand)
            uploadedThumbnails.push(thumbnailFilename)
        }

        res.json({
            message: 'Thumbnails generated successfully',
            thumbnails: uploadedThumbnails
        })

    } catch (error) {
        console.error('Thumbnail generation error:', error)
        res.status(500).json({ error: 'Failed to generate thumbnail' })
    }
}