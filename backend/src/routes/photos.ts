import { Router } from 'express'
import {
	uploadMiddleware,
	uploadPhotos,
	getPhotos,
	deletePhoto,
	downloadPhoto
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

// Public routes (for clients)
router.get('/gallery/:galleryId', getPhotos)
router.get('/:id/download', downloadPhoto)

export default router