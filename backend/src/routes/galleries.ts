import { Router } from 'express'
import {
	createGallery,
	getGalleries,
	getGallery,
	verifyGalleryPassword,
	updateGallery,
	deleteGallery
} from '../controllers/galleryController'
import { authenticateToken, requireRole } from '../middleware/auth'

const router = Router()

// Protected routes (require authentication)
router.post('/', authenticateToken, requireRole('PHOTOGRAPHER'), createGallery)
router.get('/', authenticateToken, requireRole('PHOTOGRAPHER'), getGalleries)
router.put('/:id', authenticateToken, requireRole('PHOTOGRAPHER'), updateGallery)
router.delete('/:id', authenticateToken, requireRole('PHOTOGRAPHER'), deleteGallery)

// Public routes (for clients to access galleries)
router.get('/:id', getGallery)
router.post('/:id/verify-password', verifyGalleryPassword)

export default router