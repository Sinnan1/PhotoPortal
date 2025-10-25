import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
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

// Limit Sharp concurrency to avoid CPU contention on small VPS instances
sharp.concurrency(Math.min(3, Math.max(1, os.cpus().length)))

// RAW file extensions that Sharp can handle
export const SHARP_SUPPORTED_RAW = ['.dng', '.tiff', '.tif']

// Function to check if file is a RAW format
export const isRawFile = (filename: string): boolean => {
	const ext = path.extname(filename).toLowerCase()
	const rawExtensions = [
		'.cr2', '.cr3', '.crw', '.nef', '.nrw', '.arw', '.srf', '.sr2',
		'.dng', '.orf', '.rw2', '.pef', '.raf', '.3fr', '.fff', '.dcr',
		'.kdc', '.mdc', '.mos', '.mrw', '.x3f', '.tiff', '.tif'
	]
	return rawExtensions.includes(ext)
}

// Enhanced upload function with RAW file support
export const uploadToS3 = async (
	file: Buffer,
	originalFilename: string,
	galleryId: string
): Promise<{ originalUrl: string; thumbnailUrl: string; fileSize: number }> => {
	try {
		const rawExtension = path.extname(originalFilename)
		const fileExtension = rawExtension.toLowerCase()
		const baseName = path.basename(originalFilename, rawExtension)
		const uniqueId = uuidv4()
		const filename = `${galleryId}/${uniqueId}_${baseName}${fileExtension}`
		const thumbnailFilename = `${galleryId}/thumbnails/${uniqueId}_${baseName}_thumb.jpg`

		let thumbnailBuffer: Buffer

		// Handle thumbnail creation based on file type
		if (isRawFile(originalFilename)) {
			if (SHARP_SUPPORTED_RAW.includes(fileExtension)) {
				// Sharp can handle DNG, TIFF directly
				try {
					thumbnailBuffer = await sharp(file)
						.resize(400, 400, {
							fit: 'inside',
							withoutEnlargement: true
						})
						.jpeg({ quality: 80 })
						.toBuffer()
				} catch (sharpError) {
					console.warn(`Sharp failed for ${originalFilename}, creating placeholder:`, sharpError)
					thumbnailBuffer = await createPlaceholderThumbnail(originalFilename)
				}
			} else {
				// For other RAW files, create a placeholder thumbnail
				console.log(`Creating placeholder thumbnail for RAW file: ${originalFilename}`)
				thumbnailBuffer = await createPlaceholderThumbnail(originalFilename)
			}
		} else {
			// Regular image files
			try {
				thumbnailBuffer = await sharp(file)
					.resize(400, 400, {
						fit: 'inside',
						withoutEnlargement: true
					})
					.jpeg({ quality: 80 })
					.toBuffer()
			} catch (error) {
				console.error(`Failed to create thumbnail for ${originalFilename}:`, error)
				thumbnailBuffer = await createPlaceholderThumbnail(originalFilename)
			}
		}

		// Upload original file with appropriate content type
		const contentType = getContentType(fileExtension)
		const originalUploadCommand = new PutObjectCommand({
			Bucket: process.env.S3_BUCKET_NAME!,
			Key: filename,
			Body: file,
			ContentType: contentType,
			Metadata: {
				originalName: originalFilename,
				uploadedAt: new Date().toISOString(),
				fileType: isRawFile(originalFilename) ? 'raw' : 'image',
				fileSize: file.length.toString()
			}
		})

		await s3Client.send(originalUploadCommand)

		// Upload thumbnail
		const thumbnailUploadCommand = new PutObjectCommand({
			Bucket: process.env.S3_BUCKET_NAME!,
			Key: thumbnailFilename,
			Body: thumbnailBuffer,
			ContentType: 'image/jpeg',
			Metadata: {
				type: 'thumbnail',
				originalFile: filename,
				uploadedAt: new Date().toISOString()
			}
		})

		await s3Client.send(thumbnailUploadCommand)

		// Generate URLs
		const bucketName = process.env.S3_BUCKET_NAME!
		const endpoint = `https://s3.${process.env.AWS_REGION || 'us-east-005'}.backblazeb2.com`
		const originalUrl = `${endpoint}/${bucketName}/${filename}`
		const thumbnailUrl = `${endpoint}/${bucketName}/${thumbnailFilename}`

		return {
			originalUrl,
			thumbnailUrl,
			fileSize: file.length
		}
	} catch (error) {
		console.error('S3 upload error:', {
			message: (error as Error)?.message,
			filename: originalFilename,
			fileSize: file.length
		})
		throw new Error(`Failed to upload ${originalFilename} to storage`)
	}
}

// Create placeholder thumbnail for unsupported RAW files
export async function createPlaceholderThumbnail(filename: string): Promise<Buffer> {
	const extension = path.extname(filename).toUpperCase().replace('.', '')
	
	// Create a simple SVG placeholder
	const svgContent = `
		<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
			<rect width="400" height="400" fill="#f3f4f6"/>
			<rect x="50" y="50" width="300" height="300" fill="#e5e7eb" stroke="#d1d5db" stroke-width="2"/>
			<text x="200" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">
				${extension} FILE
			</text>
			<text x="200" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af">
				${path.basename(filename)}
			</text>
			<circle cx="130" cy="120" r="20" fill="#d1d5db"/>
			<polygon points="100,140 160,140 130,110" fill="#d1d5db"/>
		</svg>
	`
	
	// Convert SVG to JPEG using Sharp
	return await sharp(Buffer.from(svgContent))
		.jpeg({ quality: 80 })
		.toBuffer()
}

// Get appropriate content type for different file extensions
export function getContentType(extension: string): string {
	const contentTypes: { [key: string]: string } = {
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.png': 'image/png',
		'.webp': 'image/webp',
		'.tiff': 'image/tiff',
		'.tif': 'image/tiff',
		'.dng': 'image/x-adobe-dng',
		'.cr2': 'image/x-canon-cr2',
		'.cr3': 'image/x-canon-cr3',
		'.nef': 'image/x-nikon-nef',
		'.arw': 'image/x-sony-arw',
		'.orf': 'image/x-olympus-orf',
		'.rw2': 'image/x-panasonic-rw2',
		'.pef': 'image/x-pentax-pef',
		'.raf': 'image/x-fuji-raf'
	}
	
	return contentTypes[extension.toLowerCase()] || 'application/octet-stream'
}

// Enhanced delete function with better error handling
export const deleteFromS3 = async (filename: string): Promise<void> => {
	try {
		const deleteCommand = new DeleteObjectCommand({
			Bucket: process.env.S3_BUCKET_NAME!,
			Key: filename
		})

		await s3Client.send(deleteCommand)
		console.log(`Successfully deleted: ${filename}`)
	} catch (error) {
		console.error('S3 delete error:', {
			message: (error as Error)?.message,
			filename,
			code: (error as any)?.$metadata?.httpStatusCode
		})
		
		// Don't throw error if file doesn't exist (404)
		if ((error as any)?.$metadata?.httpStatusCode !== 404) {
			throw new Error(`Failed to delete ${filename} from storage`)
		}
	}
}

// Batch delete function for better performance
export const batchDeleteFromS3 = async (filenames: string[]): Promise<void> => {
	const deletePromises = filenames.map(filename => 
		deleteFromS3(filename).catch(error => {
			console.warn(`Failed to delete ${filename}:`, error.message)
			return null // Don't fail the entire batch for one file
		})
	)
	
	await Promise.all(deletePromises)
}

// Function to retrieve objects from S3
export const getObjectFromS3 = async (key: string, bucketName?: string): Promise<Buffer> => {
	try {
		const targetBucket = bucketName || process.env.S3_BUCKET_NAME!
		
		console.log(`🔍 Attempting to retrieve from bucket: ${targetBucket}, key: ${key}`)
		
		const command = new GetObjectCommand({
			Bucket: targetBucket,
			Key: key
		})
		
		const response = await s3Client.send(command)
		const buffer = await streamToBuffer(response.Body)
		return buffer
	} catch (error) {
		console.error('S3 get object error:', {
			message: (error as Error)?.message,
			bucket: bucketName || process.env.S3_BUCKET_NAME,
			key
		})
		throw new Error(`Failed to retrieve object ${key} from storage`)
	}
}

// Function to get S3 object as stream for direct piping (much faster!)
export const getObjectStreamFromS3 = async (key: string, bucketName?: string): Promise<{ stream: any, contentLength: number }> => {
	try {
		const targetBucket = bucketName || process.env.S3_BUCKET_NAME!
		
		console.log(`🚀 Setting up stream from bucket: ${targetBucket}, key: ${key}`)
		
		const command = new GetObjectCommand({
			Bucket: targetBucket,
			Key: key
		})
		
		const response = await s3Client.send(command)
		const contentLength = response.ContentLength || 0
		
		console.log(`⚡ Stream ready, content length: ${contentLength} bytes`)
		
		return {
			stream: response.Body,
			contentLength
		}
	} catch (error) {
		console.error('S3 stream error:', {
			message: (error as Error)?.message,
			bucket: bucketName || process.env.S3_BUCKET_NAME,
			key
		})
		throw new Error(`Failed to stream object ${key} from storage`)
	}
}

// Helper function to convert stream to buffer
async function streamToBuffer(stream: any): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: any[] = []
		stream.on('data', (chunk: any) => chunks.push(chunk))
		stream.on('error', reject)
		stream.on('end', () => resolve(Buffer.concat(chunks)))
	})
}

// Function to generate different thumbnail sizes
export const generateMultipleThumbnails = async (
	file: Buffer,
	originalFilename: string,
	galleryId: string
): Promise<{ [size: string]: string }> => {
	const thumbnailSizes = {
		small: { width: 400, height: 400 },    // Grid view - crisp thumbnails
		medium: { width: 1200, height: 1200 }, // Lightbox - high quality viewing  
		large: { width: 2000, height: 2000 }   // Detailed evaluation before full download
	}
	
	const results: { [size: string]: string } = {}
	const uniqueId = uuidv4()
	const baseName = path.basename(originalFilename, path.extname(originalFilename))
	
	for (const [sizeName, dimensions] of Object.entries(thumbnailSizes)) {
		try {
			let thumbnailBuffer: Buffer
			
			if (isRawFile(originalFilename) && !SHARP_SUPPORTED_RAW.includes(path.extname(originalFilename).toLowerCase())) {
				// Use placeholder for unsupported RAW files
				thumbnailBuffer = await createPlaceholderThumbnail(originalFilename)
				if (sizeName !== 'medium') {
					// Resize placeholder to match requested size
					thumbnailBuffer = await sharp(thumbnailBuffer)
						.resize(dimensions.width, dimensions.height, { fit: 'inside' })
						.jpeg({ quality: 80 })
						.toBuffer()
				}
			} else {
				// Process with Sharp
				thumbnailBuffer = await sharp(file)
					.resize(dimensions.width, dimensions.height, {
						fit: 'inside',
						withoutEnlargement: true
					})
					.jpeg({ quality: 80 })
					.toBuffer()
			}
			
			const thumbnailFilename = `${galleryId}/thumbnails/${uniqueId}_${baseName}_${sizeName}.jpg`
			
			const uploadCommand = new PutObjectCommand({
				Bucket: process.env.S3_BUCKET_NAME!,
				Key: thumbnailFilename,
				Body: thumbnailBuffer,
				ContentType: 'image/jpeg',
				Metadata: {
					type: 'thumbnail',
					size: sizeName,
					originalFile: originalFilename,
					uploadedAt: new Date().toISOString()
				}
			})
			
			await s3Client.send(uploadCommand)
			
			const bucketName = process.env.S3_BUCKET_NAME!
			const endpoint = `https://s3.${process.env.AWS_REGION || 'us-east-005'}.backblazeb2.com`
			results[sizeName] = `${endpoint}/${bucketName}/${thumbnailFilename}`
			
		} catch (error) {
			console.error(`Failed to generate ${sizeName} thumbnail:`, error)
			// Continue with other sizes even if one fails
		}
	}
	
	return results
}