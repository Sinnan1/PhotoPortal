import { Router } from 'express'
import { register, login, clientLogin, getClientProfile } from '../controllers/authController'
import { authenticateToken, requireRole } from '../middleware/auth'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/client-login', clientLogin)
router.get('/client-profile', authenticateToken, requireRole('CLIENT'), getClientProfile)

export default router