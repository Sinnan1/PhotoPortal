import { Router } from 'express'
import express from 'express'
import { authenticateToken, requireRole } from '../middleware/auth'
import { createMultipartUpload, signMultipartPart, completeMultipartUpload, uploadPartProxy, registerPhoto } from '../controllers/uploadsController'
import { generateThumbnail } from '../controllers/thumbnailController'

const router = Router()

// Rate limiting for uploads to prevent server overload
let activeUploads = 0
const MAX_CONCURRENT_UPLOADS = 25

const uploadRateLimit = (req: any, res: any, next: any) => {
  if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
    return res.status(429).json({ 
      error: 'Server busy, too many concurrent uploads. Please try again in a moment.',
      retryAfter: 30
    })
  }
  next()
}

// Track active uploads
router.use((req, res, next) => {
  if (req.path.includes('/multipart/') || req.path.includes('/thumbnail/')) {
    activeUploads++
    res.on('finish', () => {
      activeUploads--
    })
    res.on('close', () => {
      activeUploads--
    })
  }
  next()
})

// Photographers only: create and complete uploads; clients normally don't upload
router.post('/multipart/create', uploadRateLimit, authenticateToken, requireRole('PHOTOGRAPHER'), createMultipartUpload)
router.get('/multipart/sign', uploadRateLimit, authenticateToken, requireRole('PHOTOGRAPHER'), signMultipartPart)
router.post('/multipart/complete', uploadRateLimit, authenticateToken, requireRole('PHOTOGRAPHER'), completeMultipartUpload)
// Proxy upload to avoid browser CORS issues
router.put(
  '/multipart/upload',
  express.raw({ type: '*/*', limit: '200mb' }),
  uploadRateLimit,
  authenticateToken,
  requireRole('PHOTOGRAPHER'),
  uploadPartProxy
)

// Thumbnail generation with rate limiting
router.post('/thumbnail/generate', uploadRateLimit, authenticateToken, requireRole('PHOTOGRAPHER'), generateThumbnail)

// Register photo in database after multipart upload
router.post('/register', uploadRateLimit, authenticateToken, requireRole('PHOTOGRAPHER'), registerPhoto)

export default router


