import { Router } from 'express'
import { authenticateAdmin, requireAdmin } from '../middleware/adminAuth'
import { getActiveUsers, getGalleryPresence, getPresenceStats } from '../controllers/adminPresenceController'

const router = Router()

// Apply admin authentication to all routes
router.use(authenticateAdmin)
router.use(requireAdmin)

/**
 * @route GET /api/admin/presence/active
 * @desc Get all active users
 * @access Admin only
 */
router.get('/active', getActiveUsers)

/**
 * @route GET /api/admin/presence/stats
 * @desc Get presence statistics
 * @access Admin only
 */
router.get('/stats', getPresenceStats)

/**
 * @route GET /api/admin/presence/gallery/:galleryId
 * @desc Get users viewing a specific gallery
 * @access Admin only
 */
router.get('/gallery/:galleryId', getGalleryPresence)

export default router
