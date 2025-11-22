
import { Router } from 'express'
import {
	createClient,
	getClients,
	toggleClientDownload,
	// updateClientAccess,
	removeClient
} from '../controllers/photographerController'
import { authenticateToken, requireRole } from '../middleware/auth'
import { getTotals, getMostLikedPhotos, getMostFavoritedPhotos, getMostViewedGalleries } from '../controllers/photographerController'

const router = Router()

// Middleware to ensure the user is a photographer
router.use(authenticateToken, requireRole('PHOTOGRAPHER'))

// Routes for managing clients
router.post('/clients', createClient)
router.get('/clients', getClients)
router.patch('/clients/:id/download', toggleClientDownload)
router.delete('/clients/:id', removeClient)

// Dashboard stats
router.get('/stats/totals', getTotals)
router.get('/stats/most-liked-photos', getMostLikedPhotos)
router.get('/stats/most-favorited-photos', getMostFavoritedPhotos)
router.get('/stats/most-viewed-galleries', getMostViewedGalleries)

export default router
