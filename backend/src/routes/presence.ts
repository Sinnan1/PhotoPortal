import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { updatePresence, clearPresence } from '../controllers/presenceController'

const router = Router()

/**
 * @route POST /api/presence/heartbeat
 * @desc Update user presence (with rate limiting)
 * @access Authenticated users
 */
router.post('/heartbeat', authenticateToken, updatePresence)

/**
 * @route DELETE /api/presence
 * @desc Clear user presence (on logout/leave)
 * @access Authenticated users
 */
router.delete('/', authenticateToken, clearPresence)

export default router
