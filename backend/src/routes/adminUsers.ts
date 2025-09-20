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

const router = Router()

// Apply admin authentication to all routes
router.use(authenticateAdmin)
router.use(requireAdmin)

// User management routes
router.get('/', getAllUsers)                    // GET /api/admin/users - Get all users with filtering
router.get('/search', searchUsers)              // GET /api/admin/users/search - Search users
router.get('/statistics', getUserStatistics)   // GET /api/admin/users/statistics - Get user statistics
router.get('/pending-approvals', getPendingApprovals) // GET /api/admin/users/pending-approvals - Get pending approvals
router.get('/:userId', getUserDetails)         // GET /api/admin/users/:userId - Get user details
router.post('/', createUser)                   // POST /api/admin/users - Create new user
router.put('/:userId/role', updateUserRole)    // PUT /api/admin/users/:userId/role - Update user role
router.put('/:userId/suspend', suspendUser)    // PUT /api/admin/users/:userId/suspend - Suspend user
router.put('/:userId/activate', activateUser)  // PUT /api/admin/users/:userId/activate - Activate user
router.put('/:userId/approve', approvePendingUser) // PUT /api/admin/users/:userId/approve - Approve pending user
router.delete('/:userId', deleteUser)          // DELETE /api/admin/users/:userId - Delete user

export default router