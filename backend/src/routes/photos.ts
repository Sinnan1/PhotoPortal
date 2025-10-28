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
	getPosts,
	downloadLikedPhotos,
	downloadFavoritedPhotos,
	downloadAllPhotos,
	downloadFolderPhotos,
	getDownloadProgress,
	getDirectPhotoDownloadUrl,
	getDirectMultiplePhotoDownloadUrls,
	getDirectFilteredPhotoDownloadUrls
} from '../controllers/photoController'
import { authenticateToken, requireRole, requireAnyRole, requireAdminOrOwner } from '../middleware/auth'
import { auditMiddleware } from '../middleware/auditMiddleware'

const router = Router()

// Protected routes (photographers and admin)
router.post(
	'/upload/:folderId',
	authenticateToken,
	requireAnyRole(['PHOTOGRAPHER', 'ADMIN']),
	auditMiddleware('UPLOAD_PHOTOS', 'photo', {
		extractTargetId: (req) => req.params.folderId
	}),
	uploadMiddleware,
	uploadPhotos
)
router.delete('/:id', authenticateToken, requireAdminOrOwner, auditMiddleware('DELETE_PHOTO', 'photo', {
	extractTargetId: (req) => req.params.id
}), deletePhoto)

// Bulk operations - Admin can delete any photos
router.post('/bulk-delete', authenticateToken, requireAdminOrOwner, auditMiddleware('BULK_DELETE_PHOTOS', 'photo'), bulkDeletePhotos)

// Like/Favorite routes
router.post('/:id/like', authenticateToken, likePhoto)
router.delete('/:id/like', authenticateToken, unlikePhoto)
router.post('/:id/favorite', authenticateToken, favoritePhoto)
router.delete('/:id/favorite', authenticateToken, unfavoritePhoto)

// Post routes (photographer and admin)
router.post('/:id/post', authenticateToken, requireAnyRole(['PHOTOGRAPHER', 'ADMIN']), auditMiddleware('POST_PHOTO', 'photo', {
	extractTargetId: (req) => req.params.id
}), postPhoto)
router.delete('/:id/post', authenticateToken, requireAnyRole(['PHOTOGRAPHER', 'ADMIN']), auditMiddleware('UNPOST_PHOTO', 'photo', {
	extractTargetId: (req) => req.params.id
}), unpostPhoto)

// Status and lists
router.get('/:id/status', authenticateToken, getPhotoStatus)
router.get('/liked', authenticateToken, getLikedPhotos)
router.get('/favorited', authenticateToken, getFavoritedPhotos)
router.get('/posts', authenticateToken, requireAnyRole(['PHOTOGRAPHER', 'ADMIN']), getPosts)

// Public routes (for clients)
router.get('/gallery/:galleryId', getPhotos)
router.get('/:id/download', downloadPhoto)
router.post('/:id/download', downloadPhoto) // Support POST for secure credential passing

// Filtered download routes
router.get('/gallery/:galleryId/download/liked', authenticateToken, downloadLikedPhotos)
router.get('/gallery/:galleryId/download/favorited', authenticateToken, downloadFavoritedPhotos)
router.get('/gallery/:galleryId/download/all', authenticateToken, downloadAllPhotos)
router.get('/gallery/:galleryId/download/folder/:folderId', authenticateToken, downloadFolderPhotos)

// Download progress tracking
router.get('/download/:downloadId/progress', authenticateToken, getDownloadProgress)

// ============================================================================
// DIRECT B2 DOWNLOAD ROUTES (New - Bandwidth Optimized)
// ============================================================================
// These routes generate pre-signed B2 URLs for direct downloads
// Saves massive VPS bandwidth (100GB per download → 0GB)

// Get direct download URL for single photo
router.get('/:id/direct-download-url', authenticateToken, getDirectPhotoDownloadUrl)

// Get direct download URLs for multiple photos (batch)
router.post('/direct-download-urls', authenticateToken, getDirectMultiplePhotoDownloadUrls)

// Get direct download URLs for filtered photos (liked/favorited)
router.get('/gallery/:galleryId/direct-download-urls', authenticateToken, getDirectFilteredPhotoDownloadUrls)

export default router