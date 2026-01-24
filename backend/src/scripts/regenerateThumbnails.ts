/**
 * Regenerate Pending Thumbnails Script
 * 
 * Run with: npx ts-node src/scripts/regenerateThumbnails.ts
 * Or after build: node dist/scripts/regenerateThumbnails.js
 */

import { PrismaClient } from '@prisma/client'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { Readable } from 'stream'
import path from 'path'

const prisma = new PrismaClient()

// Will be created dynamically per photo based on URL
function getS3Client(region: string) {
    return new S3Client({
        region: region,
        endpoint: `https://s3.${region}.backblazeb2.com`,
        forcePathStyle: true,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
        }
    })
}

const THUMBNAIL_SIZE = { width: 1200, height: 1200 }
const BATCH_SIZE = 100
const CONCURRENCY = 5

async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
        chunks.push(chunk)
    }
    return Buffer.concat(chunks)
}

async function generateThumbnail(photo: any): Promise<boolean> {
    try {
        // Extract region from URL first
        const regionMatch = photo.originalUrl.match(/s3\.([^.]+)\.backblazeb2\.com/)
        const region = regionMatch ? regionMatch[1] : 'us-west-004'

        // Create S3 client for this region
        const s3Client = getS3Client(region)

        // Extract S3 key from URL - handles any region
        const urlMatch = photo.originalUrl.match(/backblazeb2\.com\/[^\/]+\/(.+)$/)
        const s3Key = urlMatch ? urlMatch[1] : photo.originalUrl.split('/').slice(4).join('/')

        // Extract bucket from URL
        const bucketMatch = photo.originalUrl.match(/backblazeb2\.com\/([^\/]+)\//)
        const bucketName = bucketMatch ? bucketMatch[1] : process.env.S3_BUCKET_NAME!

        console.log(`  📥 Downloading: ${photo.filename} (${region})`)

        // Download from S3
        const getCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: s3Key
        })

        const { Body } = await s3Client.send(getCommand)
        if (!Body) {
            throw new Error('File not found in storage')
        }

        const fileBuffer = await streamToBuffer(Body as Readable)

        console.log(`  ⚙️ Generating thumbnail...`)

        // Generate thumbnail
        const thumbnailBuffer = await sharp(fileBuffer)
            .rotate() // Auto-rotate based on EXIF
            .resize(THUMBNAIL_SIZE.width, THUMBNAIL_SIZE.height, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 85, mozjpeg: true })
            .toBuffer()

        // Upload thumbnail
        const baseName = path.basename(photo.filename, path.extname(photo.filename))
        const thumbnailKey = `${photo.folder.galleryId}/thumbnails/${baseName}_medium.jpg`

        console.log(`  📤 Uploading thumbnail...`)

        const uploadCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: thumbnailKey,
            Body: thumbnailBuffer,
            ContentType: 'image/jpeg'
        })

        await s3Client.send(uploadCommand)

        const thumbnailUrl = `https://s3.${region}.backblazeb2.com/${bucketName}/${thumbnailKey}`

        // Update database
        await prisma.photo.update({
            where: { id: photo.id },
            data: {
                thumbnailUrl,
                mediumUrl: thumbnailUrl,
                largeUrl: thumbnailUrl,
                thumbnailStatus: 'COMPLETED'
            }
        })

        console.log(`  ✅ Done: ${photo.filename}`)
        return true
    } catch (error) {
        console.error(`  ❌ Failed: ${photo.filename}`, error)

        await prisma.photo.update({
            where: { id: photo.id },
            data: { thumbnailStatus: 'FAILED' }
        }).catch(() => { })

        return false
    }
}

async function main() {
    console.log('🚀 Starting thumbnail regeneration...\n')

    let processed = 0
    let succeeded = 0
    let failed = 0

    // Get total count
    const totalPending = await prisma.photo.count({
        where: {
            OR: [
                { thumbnailStatus: 'PENDING' },
                { thumbnailStatus: 'PROCESSING' },
                { thumbnailStatus: 'FAILED' }
            ]
        }
    })

    console.log(`📊 Found ${totalPending} photos needing thumbnails\n`)

    while (true) {
        // Get batch of photos
        const photos = await prisma.photo.findMany({
            where: {
                OR: [
                    { thumbnailStatus: 'PENDING' },
                    { thumbnailStatus: 'PROCESSING' },
                    { thumbnailStatus: 'FAILED' }
                ]
            },
            take: BATCH_SIZE,
            include: {
                folder: {
                    select: { galleryId: true }
                }
            }
        })

        if (photos.length === 0) {
            console.log('\n✅ All photos processed!')
            break
        }

        console.log(`\n📦 Processing batch of ${photos.length} photos (${processed}/${totalPending} done)...\n`)

        // Process in parallel with limited concurrency
        for (let i = 0; i < photos.length; i += CONCURRENCY) {
            const batch = photos.slice(i, i + CONCURRENCY)
            const results = await Promise.all(batch.map(photo => generateThumbnail(photo)))

            for (const result of results) {
                processed++
                if (result) succeeded++
                else failed++
            }
        }

        console.log(`\n📈 Progress: ${processed}/${totalPending} | ✅ ${succeeded} | ❌ ${failed}`)
    }

    console.log('\n' + '='.repeat(50))
    console.log(`🎉 COMPLETE!`)
    console.log(`   Total processed: ${processed}`)
    console.log(`   Succeeded: ${succeeded}`)
    console.log(`   Failed: ${failed}`)
    console.log('='.repeat(50))

    await prisma.$disconnect()
}

main().catch(console.error)
