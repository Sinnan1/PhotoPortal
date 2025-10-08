/**
 * Selection Analytics Controller
 * 
 * This controller provides API endpoints for photo selection analytics.
 * It exposes the SelectionAnalyticsService functionality through REST endpoints
 * with proper authentication, authorization, and error handling.
 * 
 * Endpoints:
 * - GET /api/analytics/gallery/:galleryId/selections - Gallery selection summary
 * - GET /api/analytics/folder/:folderId/selections - Folder selection counts
 * - GET /api/analytics/photographer/selections - Photographer analytics dashboard
 * 
 * Requirements Coverage:
 * - 3.1: Photographer access to selection statistics
 * - 4.1: Filtering and analysis capabilities
 * - 4.2: Proper authentication and authorization
 */

import { Request, Response } from 'express'
import { SelectionAnalyticsService, AnalyticsFilters } from '../services/selectionAnalyticsService'

interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
  }
}

/**
 * Get selection summary for a gallery
 * Requirements: 3.1, 4.1
 */
export const getGallerySelections = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { galleryId } = req.params
    const userId = req.user!.id

    if (!galleryId) {
      res.status(400).json({
        success: false,
        error: 'Gallery ID is required'
      })
      return
    }

    const summary = await SelectionAnalyticsService.getGallerySelectionSummary(galleryId, userId)

    res.json({
      success: true,
      data: summary
    })

  } catch (error) {
    console.error('Get gallery selections error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Gallery not found'
        })
        return
      }
      
      if (error.message.includes('Access denied')) {
        res.status(403).json({
          success: false,
          error: 'Access denied to gallery'
        })
        return
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get gallery selections'
    })
  }
}

/**
 * Get selection counts for a specific folder
 * Requirements: 3.1, 4.1
 */
export const getFolderSelections = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { folderId } = req.params
    const userId = req.user!.id

    if (!folderId) {
      res.status(400).json({
        success: false,
        error: 'Folder ID is required'
      })
      return
    }

    const counts = await SelectionAnalyticsService.getFolderSelectionCounts(folderId, userId)

    res.json({
      success: true,
      data: counts
    })

  } catch (error) {
    console.error('Get folder selections error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Folder not found'
        })
        return
      }
      
      if (error.message.includes('Access denied')) {
        res.status(403).json({
          success: false,
          error: 'Access denied to gallery'
        })
        return
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get folder selections'
    })
  }
}

/**
 * Get comprehensive analytics for a photographer
 * Requirements: 3.1, 4.1, 4.2
 */
export const getPhotographerSelections = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const userRole = req.user!.role

    // Only photographers and admins can access photographer analytics
    if (userRole !== 'PHOTOGRAPHER' && userRole !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Access denied - photographer or admin role required'
      })
      return
    }

    // Parse query parameters for filtering
    const filters: AnalyticsFilters = {}

    if (req.query.dateFrom) {
      const dateFrom = new Date(req.query.dateFrom as string)
      if (!isNaN(dateFrom.getTime())) {
        filters.dateFrom = dateFrom
      }
    }

    if (req.query.dateTo) {
      const dateTo = new Date(req.query.dateTo as string)
      if (!isNaN(dateTo.getTime())) {
        filters.dateTo = dateTo
      }
    }

    if (req.query.clientName && typeof req.query.clientName === 'string') {
      filters.clientName = req.query.clientName.trim()
    }

    if (req.query.galleryId && typeof req.query.galleryId === 'string') {
      filters.galleryId = req.query.galleryId.trim()
    }

    if (req.query.hasSelections !== undefined) {
      if (req.query.hasSelections === 'true') {
        filters.hasSelections = true
      } else if (req.query.hasSelections === 'false') {
        filters.hasSelections = false
      }
    }

    // For admin users, allow querying other photographers
    let photographerId = userId
    if (userRole === 'ADMIN' && req.query.photographerId && typeof req.query.photographerId === 'string') {
      photographerId = req.query.photographerId
    }

    const analytics = await SelectionAnalyticsService.getPhotographerAnalytics(photographerId, filters)

    res.json({
      success: true,
      data: analytics,
      filters: filters // Return applied filters for client reference
    })

  } catch (error) {
    console.error('Get photographer selections error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Photographer not found'
        })
        return
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get photographer analytics'
    })
  }
}

/**
 * Get selection statistics for system monitoring
 * Admin only endpoint for system health monitoring
 */
export const getSelectionStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user!.role

    // Only admins can access system statistics
    if (userRole !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Access denied - admin role required'
      })
      return
    }

    const statistics = await SelectionAnalyticsService.getSelectionStatistics()

    res.json({
      success: true,
      data: statistics
    })

  } catch (error) {
    console.error('Get selection statistics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get selection statistics'
    })
  }
}

/**
 * Trigger recalculation of selection counts
 * Admin only endpoint for data consistency maintenance
 */
export const recalculateSelectionCounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user!.role

    // Only admins can trigger recalculation
    if (userRole !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Access denied - admin role required'
      })
      return
    }

    const { galleryId } = req.body

    await SelectionAnalyticsService.recalculateSelectionCounts(galleryId)

    res.json({
      success: true,
      message: galleryId 
        ? `Selection counts recalculated for gallery ${galleryId}`
        : 'Selection counts recalculated for all galleries'
    })

  } catch (error) {
    console.error('Recalculate selection counts error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate selection counts'
    })
  }
}

/**
 * Clean up orphaned selection data
 * Admin only endpoint for data maintenance
 */
export const cleanupOrphanedSelections = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user!.role

    // Only admins can trigger cleanup
    if (userRole !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Access denied - admin role required'
      })
      return
    }

    await SelectionAnalyticsService.cleanupOrphanedSelections()

    res.json({
      success: true,
      message: 'Orphaned selection data cleaned up successfully'
    })

  } catch (error) {
    console.error('Cleanup orphaned selections error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup orphaned selections'
    })
  }
}