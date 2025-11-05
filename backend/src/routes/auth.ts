import { Router } from 'express'
import { register, login, clientLogin, getClientProfile } from '../controllers/authController'
import { authenticateToken, requireRole } from '../middleware/auth'
import { auditMiddleware } from '../middleware/auditMiddleware'
import { userLoginLimiter, userRegistrationLimiter } from '../middleware/rateLimiter'

const router = Router()

// Apply rate limiting to prevent brute-force attacks
router.post('/register', userRegistrationLimiter, auditMiddleware('USER_REGISTER', 'user'), register)
router.post('/login', userLoginLimiter, auditMiddleware('USER_LOGIN', 'user'), login)
router.post('/client-login', userLoginLimiter, auditMiddleware('CLIENT_LOGIN', 'user'), clientLogin)
router.get('/client-profile', authenticateToken, requireRole('CLIENT'), getClientProfile)

export default router