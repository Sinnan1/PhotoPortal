import { Router } from 'express'
import {
	adminLogin,
	adminLogout,
	getAdminProfile,
	validateAdminSession,
	extendAdminSession,
	getAdminSessions,
	revokeAdminSession,
	setupFirstAdmin,
	inviteAdmin,
	verifyAdminInvitation,
	activateAdminAccount,
	updateAdminProfile,
	changeAdminPassword
} from '../controllers/adminAuthController'
import { authenticateAdmin, requireAdmin } from '../middleware/adminAuth'
import { getAdminSetupStatus } from '../utils/createFirstAdmin'
import {
	generateCSRFToken,
	validateCSRFToken,
	revokeCSRFToken,
	addCSRFTokenToResponse,
	getCSRFTokenStatus
} from '../middleware/csrf'
import {
	adminLoginLimiter,
	adminGeneralLimiter,
	passwordChangeLimiter,
	getRateLimitStatus
} from '../middleware/rateLimiter'

const router = Router()

// Test route to verify admin auth routing is working
router.get('/', (req, res) => {
	res.json({
		success: true,
		message: 'Admin authentication routes are working',
		availableEndpoints: [
			'POST /api/admin/auth/login',
			'GET /api/admin/auth/setup-status',
			'POST /api/admin/auth/setup-first-admin',
			'POST /api/admin/auth/verify-invitation/:token',
			'POST /api/admin/auth/activate-account',
			'POST /api/admin/auth/logout',
			'GET /api/admin/auth/profile',
			'GET /api/admin/auth/validate',
			'POST /api/admin/auth/extend-session',
			'GET /api/admin/auth/sessions',
			'DELETE /api/admin/auth/sessions/:sessionId',
			'POST /api/admin/auth/invite-admin',
			'PUT /api/admin/auth/profile',
			'PUT /api/admin/auth/change-password'
		]
	})
})

// Public admin auth routes with rate limiting
router.post('/login', adminLoginLimiter, adminLogin)
router.get('/setup-status', async (req, res) => {
	try {
		const status = await getAdminSetupStatus()
		res.json({
			success: true,
			data: status
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			error: 'Failed to check admin setup status'
		})
	}
})

// First admin setup (public route when no admin exists)
router.post('/setup-first-admin', setupFirstAdmin)

// Admin invitation system (public routes for verification)
router.get('/verify-invitation/:token', verifyAdminInvitation)
router.post('/activate-account', activateAdminAccount)

// CSRF token management with rate limiting
router.get('/csrf-token', authenticateAdmin, requireAdmin, adminGeneralLimiter, generateCSRFToken)
router.get('/csrf-status', authenticateAdmin, requireAdmin, adminGeneralLimiter, getCSRFTokenStatus)

// Rate limit status endpoint
router.get('/rate-limit-status', authenticateAdmin, requireAdmin, getRateLimitStatus)

// Protected admin routes (require admin authentication + CSRF protection + rate limiting)
router.post('/logout', authenticateAdmin, requireAdmin, adminGeneralLimiter, validateCSRFToken, revokeCSRFToken, adminLogout)
router.get('/profile', authenticateAdmin, requireAdmin, adminGeneralLimiter, addCSRFTokenToResponse, getAdminProfile)
router.get('/validate', authenticateAdmin, requireAdmin, adminGeneralLimiter, addCSRFTokenToResponse, validateAdminSession)
router.post('/extend-session', authenticateAdmin, requireAdmin, adminGeneralLimiter, validateCSRFToken, extendAdminSession)
router.get('/sessions', authenticateAdmin, requireAdmin, adminGeneralLimiter, addCSRFTokenToResponse, getAdminSessions)
router.delete('/sessions/:sessionId', authenticateAdmin, requireAdmin, adminGeneralLimiter, validateCSRFToken, revokeAdminSession)

// Admin account management (protected routes with CSRF protection + rate limiting)
router.post('/invite-admin', authenticateAdmin, requireAdmin, adminGeneralLimiter, validateCSRFToken, inviteAdmin)
router.put('/profile', authenticateAdmin, requireAdmin, adminGeneralLimiter, validateCSRFToken, updateAdminProfile)
router.put('/change-password', authenticateAdmin, requireAdmin, passwordChangeLimiter, validateCSRFToken, changeAdminPassword)

export default router