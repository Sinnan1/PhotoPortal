import { Router } from 'express'
import {
	uploadMiddleware,
	uploadPhotos,
	getPhotos,
	deletePhoto,
	downloadPhoto,
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

// Like/Favorite routes (authenticated users)
router.post('/:photoId/like', authenticateToken, likePhoto)
router.delete('/:photoId/like', authenticateToken, unlikePhoto)
router.post('/:photoId/favorite', authenticateToken, favoritePhoto)
router.delete('/:photoId/favorite', authenticateToken, unfavoritePhoto)
router.get('/:photoId/status', authenticateToken, getPhotoStatus)
router.get('/liked', authenticateToken, getLikedPhotos)
router.get('/favorited', authenticateToken, getFavoritedPhotos)

// Public routes (for clients)
router.get('/gallery/:galleryId', getPhotos)
router.get('/:id/download', downloadPhoto)

export default router