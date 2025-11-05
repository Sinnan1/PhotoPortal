import { Router } from 'express'
import {
  getAllUsers,
  getUserDetails,
  updateUserRole,
  suspendUser,
  activateUser,
  deleteUser,
  getUserStatistics,
  searchUsers,
  createUser,
  approvePendingUser,
  getPendingApprovals
} from '../controllers/adminUserController'
import { authenticateAdmin, requireAdmin } from '../middleware/adminAuth'
import { validateCSRFToken, addCSRFTokenToResponse } from '../middleware/csrf'
import { userManagementLimiter, adminGeneralLimiter } from '../middleware/rateLimiter'

const router = Router()

// Apply admin authentication to all routes
router.use(authenticateAdmin)
router.use(requireAdmin)

// User management routes with CSRF protection and rate limiting for write operations
router.get('/', adminGeneralLimiter, addCSRFTokenToResponse, getAllUsers)                    // GET /api/admin/users - Get all users with filtering
router.get('/search', adminGeneralLimiter, addCSRFTokenToResponse, searchUsers)              // GET /api/admin/users/search - Search users
router.get('/statistics', adminGeneralLimiter, addCSRFTokenToResponse, getUserStatistics)   // GET /api/admin/users/statistics - Get user statistics
router.get('/pending-approvals', adminGeneralLimiter, addCSRFTokenToResponse, getPendingApprovals) // GET /api/admin/users/pending-approvals - Get pending approvals
router.get('/:userId', adminGeneralLimiter, addCSRFTokenToResponse, getUserDetails)         // GET /api/admin/users/:userId - Get user details
router.post('/', userManagementLimiter, validateCSRFToken, createUser)                   // POST /api/admin/users - Create new user
router.put('/:userId/role', userManagementLimiter, validateCSRFToken, updateUserRole)    // PUT /api/admin/users/:userId/role - Update user role
router.put('/:userId/suspend', userManagementLimiter, validateCSRFToken, suspendUser)    // PUT /api/admin/users/:userId/suspend - Suspend user
router.put('/:userId/activate', userManagementLimiter, validateCSRFToken, activateUser)  // PUT /api/admin/users/:userId/activate - Activate user
router.put('/:userId/approve', adminGeneralLimiter, approvePendingUser) // PUT /api/admin/users/:userId/approve - Approve pending user (CSRF temporarily disabled)
router.delete('/:userId', userManagementLimiter, deleteUser)          // DELETE /api/admin/users/:userId - Delete user (CSRF temporarily disabled)

export default router