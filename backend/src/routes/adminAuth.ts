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

// Public admin auth routes
router.post('/login', adminLogin)
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
router.post('/verify-invitation/:token', verifyAdminInvitation)
router.post('/activate-account', activateAdminAccount)

// Protected admin routes (require admin authentication)
router.post('/logout', authenticateAdmin, requireAdmin, adminLogout)
router.get('/profile', authenticateAdmin, requireAdmin, getAdminProfile)
router.get('/validate', authenticateAdmin, requireAdmin, validateAdminSession)
router.post('/extend-session', authenticateAdmin, requireAdmin, extendAdminSession)
router.get('/sessions', authenticateAdmin, requireAdmin, getAdminSessions)
router.delete('/sessions/:sessionId', authenticateAdmin, requireAdmin, revokeAdminSession)

// Admin account management (protected routes)
router.post('/invite-admin', authenticateAdmin, requireAdmin, inviteAdmin)
router.put('/profile', authenticateAdmin, requireAdmin, updateAdminProfile)
router.put('/change-password', authenticateAdmin, requireAdmin, changeAdminPassword)

export default router