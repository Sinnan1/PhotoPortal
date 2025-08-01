import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'
// Changed: Import from S3 storage utils instead of B2
import { uploadToS3, deleteFromS3 } from '../utils/s3Storage'

const prisma = new PrismaClient()

interface AuthRequest extends Request {
	user?: {
		id: string
		email: string
		role: string
	}
}

// Configure multer for memory storage
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024 // 10MB limit
	},
	fileFilter: (req, file, cb) => {
		// Check file type
		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
		if (allowedTypes.includes(file.mimetype)) {
			cb(null, true)
		} else {
			cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'))
		}
	}
})

export const uploadMiddleware = upload.array('photos', 20) // Allow up to 20 photos

export const uploadPhotos = async (req: AuthRequest, res: Response) => {
	try {
		const { galleryId } = req.params
		const photographerId = req.user!.id
		const files = req.files as Express.Multer.File[]

		if (!files || files.length === 0) {
			return res.status(400).json({
				success: false,
				error: 'No files uploaded'
			})
		}

		// Verify gallery exists and belongs to photographer
		const gallery = await prisma.gallery.findFirst({
			where: { id: galleryId, photographerId }
		})

		if (!gallery) {
			return res.status(404).json({
				success: false,
				error: 'Gallery not found or access denied'
			})
		}

		const uploadPromises = files.map(async (file) => {
			try {
				// Changed: Upload to S3 instead of B2
				const { originalUrl, thumbnailUrl, fileSize } = await uploadToS3(
					file.buffer,
					file.originalname,
					galleryId
				)

				// Save to database
				const photo = await prisma.photo.create({
					data: {
						filename: file.originalname,
						originalUrl,
						thumbnailUrl,
						fileSize,
						galleryId
					}
				})

				return {
					success: true,
					photo
				}
			} catch (error) {
				console.error(`Upload failed for ${file.originalname}:`, error)
				return {
					success: false,
					filename: file.originalname,
					error: error instanceof Error ? error.message : 'Upload failed'
				}
			}
		})

		const results = await Promise.all(uploadPromises)
		const successful = results.filter(r => r.success)
		const failed = results.filter(r => !r.success)

		res.status(201).json({
			success: true,
			data: {
				uploaded: successful.length,
				failed: failed.length,
				results: successful.map(r => r.photo),
				errors: failed
			}
		})
	} catch (error) {
		console.error('Upload photos error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

export const getPhotos = async (req: Request, res: Response) => {
	try {
		const { galleryId } = req.params

		const photos = await prisma.photo.findMany({
			where: { galleryId },
			orderBy: { createdAt: 'desc' }
		})

		res.json({
			success: true,
			data: photos
		})
	} catch (error) {
		console.error('Get photos error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

export const deletePhoto = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params
		const photographerId = req.user!.id

		// Find photo and verify ownership through gallery
		const photo = await prisma.photo.findUnique({
			where: { id },
			include: {
				gallery: {
					select: { photographerId: true }
				}
			}
		})

		if (!photo || photo.gallery.photographerId !== photographerId) {
			return res.status(404).json({
				success: false,
				error: 'Photo not found or access denied'
			})
		}

		// Changed: Delete from S3 storage instead of B2
		try {
			// Changed: Extract S3 object keys from URLs differently
			// S3 URLs: https://bucket-name.s3.region.amazonaws.com/key
			const originalKey = photo.originalUrl.split('.amazonaws.com/')[1]
			const thumbnailKey = photo.thumbnailUrl.split('.amazonaws.com/')[1]
			
			await Promise.all([
				deleteFromS3(originalKey),
				deleteFromS3(thumbnailKey)
			])
		} catch (storageError) {
			console.error('Storage deletion error:', storageError)
			// Continue with database deletion even if storage fails
		}

		// Delete from database
		await prisma.photo.delete({
			where: { id }
		})

		res.json({
			success: true,
			message: 'Photo deleted successfully'
		})
	} catch (error) {
		console.error('Delete photo error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

export const downloadPhoto = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const { galleryId } = req.query

		// Verify gallery access if provided
		if (galleryId) {
			const gallery = await prisma.gallery.findUnique({
				where: { id: galleryId as string }
			})

			if (!gallery) {
				return res.status(404).json({
					success: false,
					error: 'Gallery not found'
				})
			}

			// Check expiry
			if (gallery.expiresAt && gallery.expiresAt < new Date()) {
				return res.status(410).json({
					success: false,
					error: 'Gallery has expired'
				})
			}

			// Check download limit
			if (gallery.downloadLimit && gallery.downloadCount >= gallery.downloadLimit) {
				return res.status(429).json({
					success: false,
					error: 'Download limit exceeded'
				})
			}

			// Increment download count
			await prisma.gallery.update({
				where: { id: galleryId as string },
				data: { downloadCount: { increment: 1 } }
			})
		}

		const photo = await prisma.photo.findUnique({
			where: { id }
		})

		if (!photo) {
			return res.status(404).json({
				success: false,
				error: 'Photo not found'
			})
		}

		// Increment photo download count
		await prisma.photo.update({
			where: { id },
			data: { downloadCount: { increment: 1 } }
		})

		// Return download URL (client will handle the actual download)
		res.json({
			success: true,
			data: {
				downloadUrl: photo.originalUrl,
				filename: photo.filename
			}
		})
	} catch (error) {
		console.error('Download photo error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}