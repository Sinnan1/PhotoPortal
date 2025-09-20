import { Router } from 'express'
import {
	getAdminInvitations,
	getAdminInvitation,
	revokeAdminInvitation,
	resendAdminInvitation,
	deleteAdminInvitation,
	getInvitationStats
} from '../controllers/adminInvitationController'
import { authenticateAdmin, requireAdmin } from '../middleware/adminAuth'

const router = Router()

// All routes require admin authentication
router.use(authenticateAdmin, requireAdmin)

// Test route to verify admin invitation routing is working
router.get('/', (req, res) => {
	res.json({
		success: true,
		message: 'Admin invitation routes are working',
		availableEndpoints: [
			'GET /api/admin/invitations - Get all invitations',
			'GET /api/admin/invitations/stats - Get invitation statistics',
			'GET /api/admin/invitations/:invitationId - Get specific invitation',
			'POST /api/admin/invitations/:invitationId/revoke - Revoke invitation',
			'POST /api/admin/invitations/:invitationId/resend - Resend invitation',
			'DELETE /api/admin/invitations/:invitationId - Delete invitation'
		]
	})
})

// Get all admin invitations with optional filtering
router.get('/list', getAdminInvitations)

// Get invitation statistics
router.get('/stats', getInvitationStats)

// Get specific invitation
router.get('/:invitationId', getAdminInvitation)

// Revoke an invitation
router.post('/:invitationId/revoke', revokeAdminInvitation)

// Resend an invitation (generate new token)
router.post('/:invitationId/resend', resendAdminInvitation)

// Delete an invitation permanently
router.delete('/:invitationId', deleteAdminInvitation)

export default router