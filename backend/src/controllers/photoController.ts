import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { uploadToS3, deleteFromS3 } from '../utils/s3Storage'

const prisma = new PrismaClient()

interface AuthRequest extends Request {
	user?: {
		id: string
		email: string
		role: string
	}
}

// Balanced configuration - disk storage for reliability, reasonable limits for testing
const upload = multer({
	// Use disk storage to prevent memory issues with large batches
	storage: multer.diskStorage({
		destination: async (req, file, cb) => {
			const uploadDir = path.join(process.cwd(), 'temp-uploads')
			try {
				await fs.mkdir(uploadDir, { recursive: true })
				cb(null, uploadDir)
			} catch (error) {
				const err = error instanceof Error ? error : new Error(String(error))
				cb(err, uploadDir)
			}
		},
		filename: (req, file, cb) => {
			// Generate unique filename to avoid conflicts
			const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`
			cb(null, uniqueName)
		}
	}),
	limits: {
		fileSize: 50 * 1024 * 1024, // 50MB limit - good for large JPGs and some RAW files
		files: 50 // Allow up to 50 files per batch
	},
	fileFilter: (req, file, cb) => {
		// Support both regular images and RAW formats for future-proofing
		const allowedTypes = [
			// Standard image formats
			'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff',
			// RAW formats (browsers may not set correct MIME types)
			'image/x-canon-cr2', 'image/x-canon-crw', 'image/x-nikon-nef',
			'image/x-sony-arw', 'image/x-adobe-dng', 'image/x-panasonic-raw',
			// Fallback for unrecognized files
			'application/octet-stream'
		]
		
		// Check file extensions for RAW files (more reliable than MIME types)
		const allowedExtensions = [
			// Standard formats
			'.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif',
			// RAW formats
			'.cr2', '.cr3', '.crw', '.nef', '.nrw', '.arw', '.srf', '.sr2',
			'.dng', '.orf', '.rw2', '.pef', '.raf', '.3fr', '.fff', '.dcr',
			'.kdc', '.mdc', '.mos', '.mrw', '.x3f'
		]
		
		const fileExt = path.extname(file.originalname).toLowerCase()
		
		if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
			// Additional validation: warn about very large files
			if (file.size && file.size > 30 * 1024 * 1024) { // > 30MB
				console.log(`Large file detected: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
			}
			cb(null, true)
		} else {
			cb(new Error(`Invalid file type: ${file.originalname}. Supported formats: JPG, PNG, WebP, TIFF, and RAW files (CR2, NEF, ARW, etc.).`))
		}
	}
})

export const uploadMiddleware = upload.array('photos', 50) // Allow up to 50 photos per batch

// Helper function to clean up temp files after upload
export const cleanupTempFiles = async (filePaths: string[]) => {
	const cleanupPromises = filePaths.map(async (filePath) => {
		try {
			await fs.unlink(filePath)
			console.log(`Cleaned up temp file: ${filePath}`)
		} catch (error) {
			console.warn(`Failed to cleanup temp file ${filePath}:`, error)
		}
	})
	
	await Promise.allSettled(cleanupPromises)
}

// Middleware to handle multer errors gracefully
export const handleUploadErrors = (error: any, req: any, res: any, next: any) => {
	if (error instanceof multer.MulterError) {
		if (error.code === 'LIMIT_FILE_SIZE') {
			return res.status(400).json({
				success: false,
				error: 'File too large. Maximum size is 50MB per file.'
			})
		}
		if (error.code === 'LIMIT_FILE_COUNT') {
			return res.status(400).json({
				success: false,
				error: 'Too many files. Maximum is 50 files per batch.'
			})
		}
		if (error.code === 'LIMIT_UNEXPECTED_FILE') {
			return res.status(400).json({
				success: false,
				error: 'Unexpected file field. Use "photos" field name.'
			})
		}
	}
	
	if (error.message.includes('Invalid file type')) {
		return res.status(400).json({
			success: false,
			error: error.message
		})
	}
	
	// Generic upload error
	return res.status(500).json({
		success: false,
		error: 'Upload failed. Please try again.'
	})
}
// Enhanced upload function with better error handling and cleanup
export const uploadPhotos = async (req: AuthRequest, res: Response) => {
	try {
		const { galleryId } = req.params
		const photographerId = req.user!.id
		const files = req.files as Express.Multer.File[]

		console.log(`Upload started: ${files?.length || 0} files for gallery ${galleryId}`)

		if (!files || files.length === 0) {
			return res.status(400).json({
				success: false,
				error: 'No files uploaded'
			})
		}

		// Log file sizes for monitoring
		const totalSize = files.reduce((sum, file) => sum + file.size, 0)
		console.log(`Total upload size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`)

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

		// Process in smaller batches to manage memory
		const batchSize = 5
		const allResults = []
		
		for (let i = 0; i < files.length; i += batchSize) {
			const batch = files.slice(i, i + batchSize)
			console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(files.length/batchSize)}`)
			
			const batchPromises = batch.map(async (file) => {
				try {
					// Read file from disk since we're using diskStorage
					const filePath = (file as any).path as string
					const fileBuffer = await fs.readFile(filePath)
					const { originalUrl, thumbnailUrl, fileSize } = await uploadToS3(
						fileBuffer,
						file.originalname,
						galleryId
					)
					
					// Generate multiple thumbnail sizes
					const { generateMultipleThumbnails } = await import('../utils/s3Storage')
					const thumbnailSizes = await generateMultipleThumbnails(
						fileBuffer,
						file.originalname,
						galleryId
					)

					const photo = await prisma.photo.create({
						data: {
							filename: file.originalname,
							originalUrl,
							thumbnailUrl, // Keep the original 400x400 thumbnail
							mediumUrl: thumbnailSizes.medium || null, // 800x800 for lightbox
							largeUrl: thumbnailSizes.large || null,   // 1200x1200 for high quality
							fileSize,
							galleryId
						}
					})

					return {
						success: true,
						photo,
						filename: file.originalname
					}
				} catch (error) {
					console.error(`Upload failed for ${file.originalname}:`, error)
					return {
						success: false,
						filename: file.originalname,
						error: error instanceof Error ? error.message : 'Upload failed'
					}
				} finally {
					// Cleanup temp file regardless of success/failure
					const filePath = (file as any).path as string
					if (filePath) {
						cleanupTempFiles([filePath]).catch(() => {})
					}
				}
			})

			const batchResults = await Promise.all(batchPromises)
			allResults.push(...batchResults)
			
			// Small delay between batches to prevent overwhelming the system
			if (i + batchSize < files.length) {
				await new Promise(resolve => setTimeout(resolve, 100))
			}
		}

		const successful = allResults.filter(r => r.success)
		const failed = allResults.filter(r => !r.success)

		console.log(`Upload completed: ${successful.length} successful, ${failed.length} failed`)

		res.status(201).json({
			success: true,
			data: {
				uploaded: successful.length,
				failed: failed.length,
				total: files.length,
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

// Add batch upload endpoint for better performance
export const batchUploadPhotos = async (req: AuthRequest, res: Response) => {
	try {
		const { galleryId } = req.params
		const photographerId = req.user!.id
		
		// Verify gallery
		const gallery = await prisma.gallery.findFirst({
			where: { id: galleryId, photographerId }
		})

		if (!gallery) {
			return res.status(404).json({
				success: false,
				error: 'Gallery not found or access denied'
			})
		}

		// Return upload configuration for client
		res.json({
			success: true,
			data: {
				uploadUrl: `/api/photos/upload/${galleryId}`,
				maxFileSize: 200 * 1024 * 1024, // 200MB
				maxFiles: 50,
				supportedFormats: [
					'JPEG', 'PNG', 'WebP', 'TIFF',
					'CR2', 'CR3', 'NEF', 'ARW', 'DNG', 'ORF', 'RW2'
				]
			}
		})
	} catch (error) {
		console.error('Batch upload config error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

// Keep existing functions but add better error handling
export const getPhotos = async (req: Request, res: Response) => {
	try {
		const { galleryId } = req.params
		const page = parseInt(req.query.page as string) || 1
		const limit = parseInt(req.query.limit as string) || 24 // Good for grid display
		
		const skip = (page - 1) * limit

		const [photos, total] = await Promise.all([
			prisma.photo.findMany({
				where: { galleryId },
				orderBy: { createdAt: 'desc' },
				skip,
				take: limit
			}),
			prisma.photo.count({ where: { galleryId } })
		])

		res.json({
			success: true,
			data: {
				photos,
				pagination: {
					page,
					limit,
					total,
					pages: Math.ceil(total / limit),
					hasNext: page * limit < total,
					hasPrev: page > 1
				}
			}
		})
	} catch (error) {
		console.error('Get photos error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}
// Add photo compression endpoint for web viewing
export const getCompressedPhoto = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const { quality = '80', width, height } = req.query

		const photo = await prisma.photo.findUnique({
			where: { id }
		})

		if (!photo) {
			return res.status(404).json({
				success: false,
				error: 'Photo not found'
			})
		}

		// Return compressed version URL or generate on-demand
		// This could be enhanced to generate different sizes
		res.json({
			success: true,
			data: {
				compressedUrl: photo.thumbnailUrl, // For now, return thumbnail
				originalUrl: photo.originalUrl
			}
		})
	} catch (error) {
		console.error('Get compressed photo error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

// Download photo endpoint - returns the actual image data for download
export const downloadPhoto = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const { galleryId } = req.query

		console.log(`📥 Download request for photo ID: ${id}`)

		const photo = await prisma.photo.findUnique({
			where: { id }
		})

		if (!photo) {
			console.log(`❌ Photo not found: ${id}`)
			return res.status(404).json({
				success: false,
				error: 'Photo not found'
			})
		}

		console.log(`📸 Photo found: ${photo.filename}`)
		console.log(`🔗 Original URL: ${photo.originalUrl}`)

		// Extract the S3 bucket and key from the original URL
		const originalUrl = new URL(photo.originalUrl)
		console.log(`🔗 Parsed URL pathname: ${originalUrl.pathname}`)
		
		const pathParts = originalUrl.pathname.split('/').filter(part => part.length > 0)
		console.log(`📂 Path parts: ${JSON.stringify(pathParts)}`)
		
		const bucketName = pathParts[0] // First part is bucket name
		const originalKey = decodeURIComponent(pathParts.slice(1).join('/')) // Rest is the key, decoded

		console.log(`🪣 Extracted bucket: "${bucketName}"`)
		console.log(`🔑 Extracted S3 key: "${originalKey}"`)

		// Stream the image directly from S3 to client (much faster!)
		const { getObjectStreamFromS3 } = await import('../utils/s3Storage')
		const { stream, contentLength } = await getObjectStreamFromS3(originalKey, bucketName)

		console.log(`🚀 Streaming from S3, size: ${contentLength} bytes`)

		// Set appropriate headers for download
		res.setHeader('Content-Type', 'application/octet-stream')
		res.setHeader('Content-Disposition', `attachment; filename="${photo.filename}"`)
		res.setHeader('Content-Length', contentLength.toString())

		// Stream the image data directly from S3 to client (no server buffering!)
		stream.pipe(res)
		
		// Handle stream errors
		stream.on('error', (error: any) => {
			console.error('❌ Stream error:', error)
			if (!res.headersSent) {
				res.status(500).json({ success: false, error: 'Download failed' })
			}
		})
		
		stream.on('end', () => {
			console.log('✅ Stream completed successfully')
		})
	} catch (error) {
		console.error('❌ Download photo error for ID:', req.params.id)
		console.error('Error details:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

// Enhanced delete with better cleanup
export const deletePhoto = async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params
		const photographerId = req.user!.id

		// Find photo and verify ownership
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

		// Delete from S3 storage with better error handling
		try {
			const originalKey = new URL(photo.originalUrl).pathname.split('/').slice(2).join('/')
			const thumbnailKey = new URL(photo.thumbnailUrl).pathname.split('/').slice(2).join('/')
			
			await Promise.all([
				deleteFromS3(originalKey).catch(err => console.warn('Failed to delete original:', err)),
				deleteFromS3(thumbnailKey).catch(err => console.warn('Failed to delete thumbnail:', err))
			])
		} catch (storageError) {
			console.error('Storage deletion error:', storageError)
			// Continue with database deletion
		}

		// Delete from database
		await prisma.photo.delete({ where: { id } })

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

// Add bulk operations for managing large numbers of photos
export const bulkDeletePhotos = async (req: AuthRequest, res: Response) => {
	try {
		const { photoIds } = req.body
		const photographerId = req.user!.id

		if (!Array.isArray(photoIds) || photoIds.length === 0) {
			return res.status(400).json({
				success: false,
				error: 'Photo IDs array is required'
			})
		}

		// Verify all photos belong to the photographer
		const photos = await prisma.photo.findMany({
			where: {
				id: { in: photoIds },
				gallery: { photographerId }
			}
		})

		if (photos.length !== photoIds.length) {
			return res.status(403).json({
				success: false,
				error: 'Some photos not found or access denied'
			})
		}

		// Delete from storage
		const deletePromises = photos.map(async (photo) => {
			try {
				const originalKey = new URL(photo.originalUrl).pathname.split('/').slice(2).join('/')
				const thumbnailKey = new URL(photo.thumbnailUrl).pathname.split('/').slice(2).join('/')
				
				await Promise.all([
					deleteFromS3(originalKey),
					deleteFromS3(thumbnailKey)
				])
			} catch (error) {
				console.warn(`Failed to delete storage for photo ${photo.id}:`, error)
			}
		})

		await Promise.all(deletePromises)

		// Delete from database
		const result = await prisma.photo.deleteMany({
			where: { id: { in: photoIds } }
		})

		res.json({
			success: true,
			message: `${result.count} photos deleted successfully`
		})
	} catch (error) {
		console.error('Bulk delete photos error:', error)
		res.status(500).json({
			success: false,
			error: 'Internal server error'
		})
	}
}

// Like a photo
export const likePhoto = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params
        const userId = req.user!.id

        // Ensure photo exists
        const photo = await prisma.photo.findUnique({ where: { id } })
        if (!photo) {
            return res.status(404).json({ success: false, error: 'Photo not found' })
        }

        // Sync likes across photographer and all clients with access to this gallery
        // 1) Find gallery photographer
        const galleryOwner = await prisma.gallery.findUnique({
            where: { id: photo.galleryId },
            select: { photographerId: true }
        })

        // 2) Find all clients who have access to this gallery
        const accessUsers = await prisma.galleryAccess.findMany({
            where: { galleryId: photo.galleryId },
            select: { userId: true }
        })

        // 3) Build the set of users to mirror the like to (owner + all clients with access)
        const userIdsToLike = new Set<string>([
            userId,
            ...(galleryOwner ? [galleryOwner.photographerId] : [])
        ])
        accessUsers.forEach(u => userIdsToLike.add(u.userId))

        // 4) Create likes for all these users, skipping duplicates
        await prisma.likedPhoto.createMany({
            data: Array.from(userIdsToLike).map(uid => ({ userId: uid, photoId: id })),
            skipDuplicates: true
        })

        return res.json({ success: true, message: 'Photo liked (synced)' })
    } catch (error) {
        console.error('Like photo error:', error)
        return res.status(500).json({ success: false, error: 'Internal server error' })
    }
}

// Unlike a photo
export const unlikePhoto = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params
        const userId = req.user!.id

        // Ensure photo exists to derive gallery
        const photo = await prisma.photo.findUnique({ where: { id } })
        if (!photo) {
            return res.status(404).json({ success: false, error: 'Photo not found' })
        }

        // Get gallery owner and all clients with access
        const galleryOwner = await prisma.gallery.findUnique({
            where: { id: photo.galleryId },
            select: { photographerId: true }
        })
        const accessUsers = await prisma.galleryAccess.findMany({
            where: { galleryId: photo.galleryId },
            select: { userId: true }
        })

        const userIdsToUnlike = new Set<string>([
            userId,
            ...(galleryOwner ? [galleryOwner.photographerId] : [])
        ])
        accessUsers.forEach(u => userIdsToUnlike.add(u.userId))

        await prisma.likedPhoto.deleteMany({
            where: { photoId: id, userId: { in: Array.from(userIdsToUnlike) } }
        })

        return res.json({ success: true, message: 'Photo unliked (synced)' })
    } catch (error) {
        console.error('Unlike photo error:', error)
        return res.status(500).json({ success: false, error: 'Internal server error' })
    }
}

// Favorite a photo
export const favoritePhoto = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params
        const userId = req.user!.id

        const photo = await prisma.photo.findUnique({ where: { id } })
        if (!photo) {
            return res.status(404).json({ success: false, error: 'Photo not found' })
        }

        // Sync favorites across photographer and all clients with access
        const galleryOwner = await prisma.gallery.findUnique({
            where: { id: photo.galleryId },
            select: { photographerId: true }
        })
        const accessUsers = await prisma.galleryAccess.findMany({
            where: { galleryId: photo.galleryId },
            select: { userId: true }
        })

        const userIdsToFavorite = new Set<string>([
            userId,
            ...(galleryOwner ? [galleryOwner.photographerId] : [])
        ])
        accessUsers.forEach(u => userIdsToFavorite.add(u.userId))

        await prisma.favoritedPhoto.createMany({
            data: Array.from(userIdsToFavorite).map(uid => ({ userId: uid, photoId: id })),
            skipDuplicates: true
        })

        return res.json({ success: true, message: 'Photo favorited (synced)' })
    } catch (error) {
        console.error('Favorite photo error:', error)
        return res.status(500).json({ success: false, error: 'Internal server error' })
    }
}

// Unfavorite a photo
export const unfavoritePhoto = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params
        const userId = req.user!.id

        // Ensure photo exists to derive gallery
        const photo = await prisma.photo.findUnique({ where: { id } })
        if (!photo) {
            return res.status(404).json({ success: false, error: 'Photo not found' })
        }

        // Get gallery owner and all clients with access
        const galleryOwner = await prisma.gallery.findUnique({
            where: { id: photo.galleryId },
            select: { photographerId: true }
        })
        const accessUsers = await prisma.galleryAccess.findMany({
            where: { galleryId: photo.galleryId },
            select: { userId: true }
        })

        const userIdsToUnfavorite = new Set<string>([
            userId,
            ...(galleryOwner ? [galleryOwner.photographerId] : [])
        ])
        accessUsers.forEach(u => userIdsToUnfavorite.add(u.userId))

        await prisma.favoritedPhoto.deleteMany({
            where: { photoId: id, userId: { in: Array.from(userIdsToUnfavorite) } }
        })

        return res.json({ success: true, message: 'Photo unfavorited (synced)' })
    } catch (error) {
        console.error('Unfavorite photo error:', error)
        return res.status(500).json({ success: false, error: 'Internal server error' })
    }
}

// Get like/favorite status for the current user
export const getPhotoStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params
        const userId = req.user!.id

        const [liked, favorited] = await Promise.all([
            prisma.likedPhoto.findUnique({ where: { userId_photoId: { userId, photoId: id } } }),
            prisma.favoritedPhoto.findUnique({ where: { userId_photoId: { userId, photoId: id } } })
        ])

        return res.json({ success: true, data: { liked: !!liked, favorited: !!favorited } })
    } catch (error) {
        console.error('Get photo status error:', error)
        return res.status(500).json({ success: false, error: 'Internal server error' })
    }
}

// Get all liked photos for the current user
export const getLikedPhotos = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id
        const liked = await prisma.likedPhoto.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                photo: {
                    include: {
                        gallery: {
                            include: { photographer: { select: { name: true } } }
                        }
                    }
                }
            }
        })

        const photos = liked.map((lp) => lp.photo)
        return res.json({ success: true, data: photos })
    } catch (error) {
        console.error('Get liked photos error:', error)
        return res.status(500).json({ success: false, error: 'Internal server error' })
    }
}

// Get all favorited photos for the current user
export const getFavoritedPhotos = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id
        const favorites = await prisma.favoritedPhoto.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                photo: {
                    include: {
                        gallery: {
                            include: { photographer: { select: { name: true } } }
                        }
                    }
                }
            }
        })

        const photos = favorites.map((fp) => fp.photo)
        return res.json({ success: true, data: photos })
    } catch (error) {
        console.error('Get favorited photos error:', error)
        return res.status(500).json({ success: false, error: 'Internal server error' })
    }
}