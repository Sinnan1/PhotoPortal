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
	postPhoto,
	unpostPhoto,
	getPhotoStatus,
	getLikedPhotos,
	getFavoritedPhotos,
	getPosts
} from '../controllers/photoController'
import { authenticateToken, requireRole } from '../middleware/auth'

const router = Router()

// Protected routes (photographers only)
router.post(
	'/upload/:folderId',
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

// Post routes (photographer only)
router.post('/:id/post', authenticateToken, requireRole('PHOTOGRAPHER'), postPhoto)
router.delete('/:id/post', authenticateToken, requireRole('PHOTOGRAPHER'), unpostPhoto)

// Status and lists
router.get('/:id/status', authenticateToken, getPhotoStatus)
router.get('/liked', authenticateToken, getLikedPhotos)
router.get('/favorited', authenticateToken, getFavoritedPhotos)
router.get('/posts', authenticateToken, requireRole('PHOTOGRAPHER'), getPosts)

// Public routes (for clients)
router.get('/gallery/:galleryId', getPhotos)
router.get('/:id/download', downloadPhoto)

export default router