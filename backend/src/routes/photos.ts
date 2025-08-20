import { Router } from 'express'
import {
	uploadMiddleware,
	uploadPhotos,
	getPhotos,
	deletePhoto,
	getCompressedPhoto,
	downloadPhoto,
	bulkDeletePhotos,
	likePhoto,
	unlikePhoto,
	favoritePhoto,
	unfavoritePhoto,
	getPhotoStatus,
	getLikedPhotos,
	getFavoritedPhotos
} from '../controllers/photoController'
import { authenticateToken, requireRole } from '../middleware/auth'

const router = Router()

// Protected routes (photographers only)
router.post(
	'/upload/:galleryId',
	authenticateToken,
	requireRole('PHOTOGRAPHER'),
	uploadMiddleware,
	uploadPhotos
)
router.delete('/:id', authenticateToken, requireRole('PHOTOGRAPHER'), deletePhoto)

// Bulk operations
router.post('/bulk-delete', authenticateToken, requireRole('PHOTOGRAPHER'), bulkDeletePhotos)

// Like/Favorite routes
router.post('/:id/like', authenticateToken, likePhoto)
router.delete('/:id/like', authenticateToken, unlikePhoto)
router.post('/:id/favorite', authenticateToken, favoritePhoto)
router.delete('/:id/favorite', authenticateToken, unfavoritePhoto)

// Status and lists
router.get('/:id/status', authenticateToken, getPhotoStatus)
router.get('/liked', authenticateToken, getLikedPhotos)
router.get('/favorited', authenticateToken, getFavoritedPhotos)

// Public routes (for clients)
router.get('/gallery/:galleryId', getPhotos)
router.get('/:id/download', downloadPhoto)
router.get('/:id/compressed', getCompressedPhoto)

export default router