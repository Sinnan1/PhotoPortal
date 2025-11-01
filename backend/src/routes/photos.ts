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
	createDownloadTicket,
	downloadWithTicket,
	exportLikedPhotosToExcel,
	exportFavoritedPhotosToExcel
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

// Excel export routes
router.get('/gallery/:galleryId/export/liked', authenticateToken, exportLikedPhotosToExcel)
router.get('/gallery/:galleryId/export/favorited', authenticateToken, exportFavoritedPhotosToExcel)

// Download progress tracking
router.get('/download/:downloadId/progress', authenticateToken, getDownloadProgress)

// Download ticket creation
router.post('/download-ticket', authenticateToken, createDownloadTicket);

// Ticket-based download
router.get('/download-zip', downloadWithTicket);

export default router