import { Router } from 'express'
import {
	createGallery,
	getGalleries,
	getGallery,
	verifyGalleryPassword,
	updateGallery,
	deleteGallery,
	likeGallery,
	unlikeGallery,
	favoriteGallery,
	unfavoriteGallery,
	getClientGalleries
} from '../controllers/galleryController'
import { authenticateToken, requireRole, requireAnyRole, requireAdminOrOwner } from '../middleware/auth'
import { updateGalleryAccess, getAllowedClients } from '../controllers/galleryController'
import { auditMiddleware } from '../middleware/auditMiddleware'

const router = Router()

// Protected routes (require authentication) - Admin can access all
router.post('/', authenticateToken, requireAnyRole(['PHOTOGRAPHER', 'ADMIN']), auditMiddleware('CREATE_GALLERY', 'gallery'), createGallery)
router.get('/', authenticateToken, requireAnyRole(['PHOTOGRAPHER', 'ADMIN']), getGalleries)
router.put('/:id', authenticateToken, requireAdminOrOwner, auditMiddleware('UPDATE_GALLERY', 'gallery', {
	extractTargetId: (req) => req.params.id
}), updateGallery)
router.delete('/:id', authenticateToken, requireAdminOrOwner, auditMiddleware('DELETE_GALLERY', 'gallery', {
	extractTargetId: (req) => req.params.id
}), deleteGallery)

// Client routes
router.get('/client/accessible', authenticateToken, requireRole('CLIENT'), getClientGalleries)

// Public routes (for clients to access galleries)
router.get('/:id', getGallery)
router.post('/:id/verify-password', verifyGalleryPassword)

// Routes for liking and favoriting galleries
router.post('/:id/like', authenticateToken, likeGallery)
router.delete('/:id/like', authenticateToken, unlikeGallery)
router.post('/:id/favorite', authenticateToken, favoriteGallery)
router.delete('/:id/favorite', authenticateToken, unfavoriteGallery)

// Routes for managing client access to galleries - Admin can manage any gallery
router.put('/:id/access', authenticateToken, requireAdminOrOwner, auditMiddleware('UPDATE_GALLERY_ACCESS', 'gallery', {
	extractTargetId: (req) => req.params.id
}), updateGalleryAccess)
router.get('/:id/allowed-clients', authenticateToken, requireAdminOrOwner, getAllowedClients)

export default router