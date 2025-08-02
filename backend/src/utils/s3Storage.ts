// Changed: Import AWS SDK v3 instead of Backblaze B2
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'

// Changed: Initialize S3 client instead of B2 client
// Uses environment variables for AWS credentials and region
const s3Client = new S3Client({
	region: 'us-east-005',
	endpoint: 'https://s3.us-east-005.backblazeb2.com',
	forcePathStyle: true, // REQUIRED for B2
	credentials: {
	  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
	  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
	}
  })
  

// Removed: No need for authorization with S3 (handled automatically by SDK)

export const uploadToS3 = async (
	file: Buffer,
	originalFilename: string,
	galleryId: string
  ): Promise<{ originalUrl: string; thumbnailUrl: string; fileSize: number }> => {
	try {
	  const fileExtension = originalFilename.split('.').pop()?.toLowerCase()
	  const uniqueId = uuidv4()
	  const filename = `${galleryId}/${uniqueId}.${fileExtension}`
	  const thumbnailFilename = `${galleryId}/thumbnails/${uniqueId}_thumb.jpg`
  
	  // Create thumbnail (max 400px width, maintain aspect ratio)
	  const thumbnailBuffer = await sharp(file)
		.resize(400, 400, {
		  fit: 'inside',
		  withoutEnlargement: true
		})
		.jpeg({ quality: 80 })
		.toBuffer()
  
	  // Upload original image
	  const originalUploadCommand = new PutObjectCommand({
		Bucket: process.env.S3_BUCKET_NAME!,
		Key: filename,
		Body: file,
		ContentType: `image/${fileExtension}`,
		Metadata: {
		  originalName: originalFilename,
		  uploadedAt: new Date().toISOString()
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
  
	  // FIXED: Use Backblaze B2 URL format instead of AWS S3 format
	  const bucketName = process.env.S3_BUCKET_NAME!
	  
	  // Backblaze B2 URL format: https://s3.us-east-005.backblazeb2.com/bucket-name/key
	  const originalUrl = `https://s3.us-east-005.backblazeb2.com/${bucketName}/${filename}`
	  const thumbnailUrl = `https://s3.us-east-005.backblazeb2.com/${bucketName}/${thumbnailFilename}`
  
	  return {
		originalUrl,
		thumbnailUrl,
		fileSize: file.length
	  }
	} catch (error) {
	  console.error('B2 upload error:', {
		message: (error as Error)?.message,
		stack: (error as Error)?.stack,
		code: (error as any)?.$metadata,
		name: (error as any)?.name
	  })
	  throw new Error('Failed to upload file to storage')
	}
  }

export const deleteFromS3 = async (filename: string): Promise<void> => {
	try {
		// Removed: No authorization needed for S3

		// Changed: Use S3 DeleteObjectCommand instead of B2's delete process
		// No need to list files first - S3 can delete directly by key
		const deleteCommand = new DeleteObjectCommand({
			Bucket: process.env.S3_BUCKET_NAME!,
			Key: filename
		})

		await s3Client.send(deleteCommand)
	} catch (error) {
		// Changed: Updated error message to reflect S3
		console.error('S3 delete error:', error)
		throw new Error('Failed to delete file from storage')
	}
}