import { Router } from 'express'
import { register, login, clientLogin, getClientProfile } from '../controllers/authController'
import { authenticateToken, requireRole } from '../middleware/auth'
import { auditMiddleware } from '../middleware/auditMiddleware'

const router = Router()

router.post('/register', auditMiddleware('USER_REGISTER', 'user'), register)
router.post('/login', auditMiddleware('USER_LOGIN', 'user'), login)
router.post('/client-login', auditMiddleware('CLIENT_LOGIN', 'user'), clientLogin)
router.get('/client-profile', authenticateToken, requireRole('CLIENT'), getClientProfile)

export default router