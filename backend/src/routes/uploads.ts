import { Router } from 'express'
import express from 'express'
import { authenticateToken, requireRole } from '../middleware/auth'
import { createMultipartUpload, signMultipartPart, completeMultipartUpload, uploadPartProxy, registerPhoto, uploadDirect, abortMultipartUpload, listUploadedParts } from '../controllers/uploadsController'
import { generateThumbnail } from '../controllers/thumbnailController'
import { UPLOAD_CONFIG } from '../config/uploadConfig'

const router = Router()

// Rate limiting for uploads to prevent server overload - using unified config
let activeUploads = 0
const MAX_CONCURRENT_UPLOADS = UPLOAD_CONFIG.MAX_GLOBAL_CONCURRENT_UPLOADS

// Per-user upload tracking
const userUploads = new Map<string, number>()
const MAX_UPLOADS_PER_USER = UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS_PER_USER

const uploadRateLimit = (req: any, res: any, next: any) => {
  const userId = req.user?.id

  // Check global limit
  if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
    return res.status(429).json({
      error: 'Server busy, too many concurrent uploads. Please try again in a moment.',
      retryAfter: 30,
      activeUploads,
      maxConcurrent: MAX_CONCURRENT_UPLOADS
    })
  }

  // Check per-user limit
  if (userId) {
    const userCount = userUploads.get(userId) || 0
    if (userCount >= MAX_UPLOADS_PER_USER) {
      return res.status(429).json({
        error: 'Too many concurrent uploads. Please wait for some to complete.',
        retryAfter: 10,
        yourActiveUploads: userCount,
        maxPerUser: MAX_UPLOADS_PER_USER
      })
    }
  }

  next()
}

// Track active uploads (global and per-user)
router.use((req, res, next) => {
  if (req.path.includes('/multipart/') || req.path.includes('/thumbnail/')) {
    const userId = (req as any).user?.id

    // Increment counters
    activeUploads++
    if (userId) {
      userUploads.set(userId, (userUploads.get(userId) || 0) + 1)
    }

    // Cleanup function
    const cleanup = () => {
      activeUploads = Math.max(0, activeUploads - 1)
      if (userId) {
        const count = userUploads.get(userId) || 0
        if (count <= 1) {
          userUploads.delete(userId)
        } else {
          userUploads.set(userId, count - 1)
        }
      }
    }

    res.on('finish', cleanup)
    res.on('close', cleanup)
    res.on('error', cleanup)
  }
  next()
})

// Photographers only: create and complete uploads; clients normally don't upload
router.post('/multipart/create', uploadRateLimit, authenticateToken, requireRole('PHOTOGRAPHER'), createMultipartUpload)
router.get('/multipart/sign', uploadRateLimit, authenticateToken, requireRole('PHOTOGRAPHER'), signMultipartPart)
router.post('/multipart/complete', uploadRateLimit, authenticateToken, requireRole('PHOTOGRAPHER'), completeMultipartUpload)
router.post('/multipart/abort', uploadRateLimit, authenticateToken, requireRole('PHOTOGRAPHER'), abortMultipartUpload)
router.get('/multipart/parts', uploadRateLimit, authenticateToken, requireRole('PHOTOGRAPHER'), listUploadedParts)

// Proxy upload to avoid CORS/timeout issues - using unified config
const CHUNK_UPLOAD_LIMIT = `${Math.ceil(UPLOAD_CONFIG.CHUNK_SIZE / (1024 * 1024))}mb`
router.put(
  '/multipart/upload',
  express.raw({ type: '*/*', limit: CHUNK_UPLOAD_LIMIT }),
  uploadRateLimit,
  authenticateToken,
  requireRole('PHOTOGRAPHER'),
  uploadPartProxy
)

// Thumbnail generation with rate limiting
router.post('/thumbnail/generate', uploadRateLimit, authenticateToken, requireRole('PHOTOGRAPHER'), generateThumbnail)

// Register photo in database after multipart upload
router.post('/register', uploadRateLimit, authenticateToken, requireRole('PHOTOGRAPHER'), registerPhoto)

// Direct upload endpoint (simpler, non-multipart)
router.post('/direct', uploadRateLimit, authenticateToken, requireRole('PHOTOGRAPHER'), uploadDirect)

// Get upload status (for monitoring)
router.get('/status', authenticateToken, (req, res) => {
  const userId = (req as any).user?.id
  const userCount = userId ? (userUploads.get(userId) || 0) : 0

  res.json({
    success: true,
    data: {
      globalActiveUploads: activeUploads,
      globalMaxConcurrent: MAX_CONCURRENT_UPLOADS,
      yourActiveUploads: userCount,
      yourMaxConcurrent: MAX_UPLOADS_PER_USER,
      availableSlots: Math.max(0, MAX_UPLOADS_PER_USER - userCount)
    }
  })
})

// Get upload config (compression settings) - public endpoint for authenticated users
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    // Fetch compression settings from system config
    const [compressionEnabledConfig, compressionQualityConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { configKey: 'upload.compressionEnabled' } }),
      prisma.systemConfig.findUnique({ where: { configKey: 'upload.compressionQuality' } })
    ])

    await prisma.$disconnect()

    res.json({
      success: true,
      data: {
        compressionEnabled: compressionEnabledConfig?.configValue ?? true,
        compressionQuality: compressionQualityConfig?.configValue ?? 90
      }
    })
  } catch (error) {
    console.error('Failed to fetch upload config:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upload configuration'
    })
  }
})

export default router
