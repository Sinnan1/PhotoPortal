import { Router } from 'express'
import express from 'express'
import { authenticateToken, requireRole } from '../middleware/auth'
// TODO: Implement uploadsController for multipart uploads
// import { createMultipartUpload, signMultipartPart, completeMultipartUpload, uploadPartProxy } from '../controllers/uploadsController'

const router = Router()

// Photographers only: create and complete uploads; clients normally don't upload
// TODO: Uncomment when uploadsController is implemented
// router.post('/multipart/create', authenticateToken, requireRole('PHOTOGRAPHER'), createMultipartUpload)
// router.get('/multipart/sign', authenticateToken, requireRole('PHOTOGRAPHER'), signMultipartPart)
// router.post('/multipart/complete', authenticateToken, requireRole('PHOTOGRAPHER'), completeMultipartUpload)
// Proxy upload to avoid browser CORS issues
// router.put(
//   '/multipart/upload',
//   express.raw({ type: '*/*', limit: '200mb' }),
//   authenticateToken,
//   requireRole('PHOTOGRAPHER'),
//   uploadPartProxy
// )

export default router


