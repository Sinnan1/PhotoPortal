import { Router } from 'express'
import { getRecentActivity, getActivitySummary, getUserActivity } from '../controllers/activityController'
import { authenticateAdmin, requireAdmin } from '../middleware/adminAuth'
import { adminGeneralLimiter } from '../middleware/rateLimiter'
import { addCSRFTokenToResponse } from '../middleware/csrf'

const router = Router()

// All routes require admin authentication
router.use(authenticateAdmin)
router.use(requireAdmin)

// Get recent activity feed
router.get('/recent', adminGeneralLimiter, addCSRFTokenToResponse, getRecentActivity)

// Get activity summary/statistics
router.get('/summary', adminGeneralLimiter, addCSRFTokenToResponse, getActivitySummary)

// Get user-specific activity
router.get('/user/:userId', adminGeneralLimiter, addCSRFTokenToResponse, getUserActivity)

export default router
