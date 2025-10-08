/**
 * Selection Analytics Routes
 * 
 * This module defines the REST API routes for photo selection analytics.
 * It provides endpoints for gallery, folder, and photographer analytics
 * with proper authentication and authorization middleware.
 * 
 * Routes:
 * - GET /api/analytics/gallery/:galleryId/selections - Gallery selection summary
 * - GET /api/analytics/folder/:folderId/selections - Folder selection counts  
 * - GET /api/analytics/photographer/selections - Photographer analytics dashboard
 * - GET /api/analytics/system/statistics - System selection statistics (admin only)
 * - POST /api/analytics/system/recalculate - Recalculate selection counts (admin only)
 * - POST /api/analytics/system/cleanup - Cleanup orphaned selections (admin only)
 * 
 * Requirements Coverage:
 * - 3.1: Photographer access to selection statistics
 * - 4.1: Filtering and analysis capabilities  
 * - 4.2: Proper authentication and authorization
 */

import { Router } from 'express'
import {
  getGallerySelections,
  getFolderSelections,
  getPhotographerSelections,
  getSelectionStatistics,
  recalculateSelectionCounts,
  cleanupOrphanedSelections
} from '../controllers/selectionAnalyticsController'
import { authenticateToken, requireRole, requireAnyRole } from '../middleware/auth'
import { auditMiddleware } from '../middleware/auditMiddleware'

const router = Router()

// Gallery selection analytics - accessible by clients, photographers, and admins
router.get(
  '/gallery/:galleryId/selections',
  authenticateToken,
  getGallerySelections
)

// Folder selection analytics - accessible by clients, photographers, and admins
router.get(
  '/folder/:folderId/selections',
  authenticateToken,
  getFolderSelections
)

// Photographer analytics dashboard - photographers and admins only
router.get(
  '/photographer/selections',
  authenticateToken,
  requireAnyRole(['PHOTOGRAPHER', 'ADMIN']),
  getPhotographerSelections
)

// System statistics - admin only
router.get(
  '/system/statistics',
  authenticateToken,
  requireRole('ADMIN'),
  auditMiddleware('VIEW_SYSTEM_STATISTICS', 'system'),
  getSelectionStatistics
)

// Recalculate selection counts - admin only
router.post(
  '/system/recalculate',
  authenticateToken,
  requireRole('ADMIN'),
  auditMiddleware('RECALCULATE_SELECTION_COUNTS', 'system'),
  recalculateSelectionCounts
)

// Cleanup orphaned selections - admin only
router.post(
  '/system/cleanup',
  authenticateToken,
  requireRole('ADMIN'),
  auditMiddleware('CLEANUP_ORPHANED_SELECTIONS', 'system'),
  cleanupOrphanedSelections
)

export default router