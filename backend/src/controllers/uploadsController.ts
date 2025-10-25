import { Request, Response } from 'express'
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PrismaClient } from '@prisma/client'
import path from 'path'

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

export const createMultipartUpload = async (req: Request, res: Response) => {
	try {
		const { filename, contentType } = req.body

		const command = new CreateMultipartUploadCommand({
			Bucket: process.env.S3_BUCKET_NAME!,
			Key: filename,
			ContentType: contentType
		})

		const result = await s3Client.send(command)

		res.json({
			uploadId: result.UploadId,
			key: result.Key
		})
	} catch (error) {
		console.error('Create multipart upload error:', error)
		res.status(500).json({ error: 'Failed to create multipart upload' })
	}
}

export const signMultipartPart = async (req: Request, res: Response) => {
	try {
		const { key, uploadId, partNumber } = req.query

		const command = new UploadPartCommand({
			Bucket: process.env.S3_BUCKET_NAME!,
			Key: key as string,
			UploadId: uploadId as string,
			PartNumber: parseInt(partNumber as string)
		})

		const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

		res.json({ signedUrl })
	} catch (error) {
		console.error('Sign multipart part error:', error)
		res.status(500).json({ error: 'Failed to sign multipart part' })
	}
}

export const completeMultipartUpload = async (req: Request, res: Response) => {
	try {
		const { key, uploadId, parts } = req.body

		const command = new CompleteMultipartUploadCommand({
			Bucket: process.env.S3_BUCKET_NAME!,
			Key: key,
			UploadId: uploadId,
			MultipartUpload: {
				Parts: parts
			}
		})

		const result = await s3Client.send(command)

		res.json({
			location: result.Location,
			bucket: result.Bucket,
			key: result.Key,
			etag: result.ETag
		})
	} catch (error) {
		console.error('Complete multipart upload error:', error)
		res.status(500).json({ error: 'Failed to complete multipart upload' })
	}
}

export const uploadPartProxy = async (req: Request, res: Response) => {
	try {
		const { url } = req.query

		if (!url || typeof url !== 'string') {
			return res.status(400).json({ error: 'URL parameter is required' })
		}

		console.log('Proxying upload to:', url)
		console.log('Body size:', req.body?.length || 0, 'bytes')

		const response = await fetch(url, {
			method: 'PUT',
			body: req.body,
			headers: {
				'Content-Type': req.headers['content-type'] || 'application/octet-stream'
			}
		})

		console.log('B2 response status:', response.status, response.statusText)

		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Unknown error')
			console.error('B2 upload failed:', errorText)
			throw new Error(`Upload failed with status: ${response.status} - ${errorText}`)
		}

		const etag = response.headers.get('etag') || response.headers.get('ETag')
		console.log('B2 response ETag:', etag)

		if (!etag) {
			throw new Error('Missing ETag from B2 response')
		}

		res.json({ etag })
	} catch (error) {
		console.error('Upload part proxy error:', error)
		res.status(500).json({ error: 'Failed to upload part' })
	}
}

export const registerPhoto = async (req: Request, res: Response) => {
	try {
		const { key, filename, folderId, fileSize } = req.body
		const photographerId = (req as any).user?.id

		if (!key || !filename || !folderId || !photographerId) {
			return res.status(400).json({ error: 'Missing required fields' })
		}

		// Verify folder exists and belongs to photographer
		const folder = await prisma.folder.findFirst({
			where: { id: folderId },
			include: { gallery: true }
		})

		if (!folder) {
			return res.status(404).json({ error: 'Folder not found' })
		}

		if (folder.gallery.photographerId !== photographerId) {
			return res.status(403).json({ error: 'Access denied' })
		}

		// Generate URLs
		const bucketName = process.env.S3_BUCKET_NAME!
		const endpoint = `https://s3.${process.env.AWS_REGION || 'us-east-005'}.backblazeb2.com`
		const originalUrl = `${endpoint}/${bucketName}/${key}`

		// Extract thumbnail key from the S3 key (not the original filename)
		// The key format is: galleryId/uuid_originalFilename.ext
		// The thumbnail formats are:
		// - small (400x400): galleryId/thumbnails/uuid_originalFilename_small.jpg
		// - medium (1200x1200): galleryId/thumbnails/uuid_originalFilename_medium.jpg
		// - large (2000x2000): galleryId/thumbnails/uuid_originalFilename_large.jpg
		const keyBaseName = path.basename(key, path.extname(key))
		const thumbnailKey = `${folder.galleryId}/thumbnails/${keyBaseName}_small.jpg`
		const mediumKey = `${folder.galleryId}/thumbnails/${keyBaseName}_medium.jpg`
		const largeKey = `${folder.galleryId}/thumbnails/${keyBaseName}_large.jpg`
		
		const thumbnailUrl = `${endpoint}/${bucketName}/${thumbnailKey}`
		const mediumUrl = `${endpoint}/${bucketName}/${mediumKey}`
		const largeUrl = `${endpoint}/${bucketName}/${largeKey}`

		// Create photo record in database
		const photo = await prisma.photo.create({
			data: {
				filename,
				originalUrl,
				thumbnailUrl,
				mediumUrl,
				largeUrl,
				fileSize: fileSize || 0,
				folderId
			}
		})

		res.json({
			success: true,
			photo
		})
	} catch (error) {
		console.error('Register photo error:', error)
		res.status(500).json({ error: 'Failed to register photo' })
	}
}
