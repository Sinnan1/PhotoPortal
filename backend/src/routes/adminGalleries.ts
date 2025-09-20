import { Router } from 'express'
import {
  getAllGalleries,
  getGalleryDetails,
  updateGallerySettings,
  getGalleryAnalytics,
  manageGalleryAccess,
  deleteGallery,
  bulkGalleryOperations
} from '../controllers/adminGalleryController'
import { authenticateAdmin } from '../middleware/adminAuth'
import { auditGalleryAction, auditSystemAction } from '../middleware/auditMiddleware'

const router = Router()

// Apply admin authentication to all routes
router.use(authenticateAdmin)

/**
 * Gallery oversight and management routes
 */

// Get all galleries with search and filtering
router.get(
  '/',
  auditSystemAction('ADMIN_GALLERY_LIST_ACCESS'),
  getAllGalleries
)

// Get gallery analytics and statistics
router.get(
  '/analytics',
  auditSystemAction('ADMIN_GALLERY_ANALYTICS_ACCESS'),
  getGalleryAnalytics
)

// Get detailed gallery information
router.get(
  '/:id',
  auditGalleryAction('ADMIN_GALLERY_DETAIL_ACCESS'),
  getGalleryDetails
)

// Update gallery settings
router.put(
  '/:id',
  auditGalleryAction('ADMIN_GALLERY_UPDATE'),
  updateGallerySettings
)

// Delete gallery (with comprehensive cleanup)
router.delete(
  '/:id',
  auditGalleryAction('ADMIN_GALLERY_DELETE'),
  deleteGallery
)

// Manage gallery access for clients
router.put(
  '/:id/access',
  auditGalleryAction('ADMIN_GALLERY_ACCESS_MANAGEMENT'),
  manageGalleryAccess
)

// Bulk operations on galleries
router.post(
  '/bulk',
  auditSystemAction('ADMIN_GALLERY_BULK_OPERATION'),
  bulkGalleryOperations
)

export default router