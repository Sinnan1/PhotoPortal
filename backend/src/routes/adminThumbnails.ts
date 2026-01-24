/**
 * Admin Thumbnail Routes
 */

import express from 'express'
import { authenticateAdmin } from '../middleware/adminAuth'
import { getThumbnailStatus, regeneratePendingThumbnails } from '../controllers/adminThumbnailController'

const router = express.Router()

// Protect all routes with admin auth
router.use(authenticateAdmin)

// GET /api/admin/thumbnails/status
router.get('/status', getThumbnailStatus)

// POST /api/admin/thumbnails/regenerate
router.post('/regenerate', regeneratePendingThumbnails)

export default router
