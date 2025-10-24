import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Import routes
import authRoutes from './routes/auth'
import adminAuthRoutes from './routes/adminAuth'
import adminUsersRoutes from './routes/adminUsers'
import adminGalleriesRoutes from './routes/adminGalleries'
import adminAnalyticsRoutes from './routes/adminAnalytics'
import adminSystemConfigRoutes from './routes/adminSystemConfig'
import adminInvitationsRoutes from './routes/adminInvitations'
import auditRoutes from './routes/audit'
import galleryRoutes from './routes/galleries'
import photoRoutes from './routes/photos'
import photographersRoutes from './routes/photographers'
import uploadsRoutes from './routes/uploads'
import folderRoutes from './routes/folders'
import selectionAnalyticsRoutes from './routes/selectionAnalytics'

// Import admin session manager
import { adminSessionManager } from './utils/adminSessionManager'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const prisma = new PrismaClient()

// Enhanced middleware for photo uploads
app.use(helmet())
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}))
app.use(morgan('combined'))

// Increased limits for batch photo uploads
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))
// Raw body limit for proxy uploads
app.use(express.raw({ type: '*/*', limit: '1gb' }))

// Enhanced timeout middleware for upload and download operations
app.use((req, res, next) => {
  // Set longer timeouts for upload routes
  if (req.path.includes('/upload') || req.method === 'POST' && req.path.includes('/photos')) {
    req.setTimeout(60 * 60 * 1000) // 60 minutes for large batch uploads
    res.setTimeout(60 * 60 * 1000)
    console.log(`Extended timeout set for upload request: ${req.path}`)
  } 
  // Set longer timeouts for download routes
  else if (req.path.includes('/download') || req.path.includes('/photos/gallery/')) {
    req.setTimeout(30 * 60 * 1000) // 30 minutes for downloads
    res.setTimeout(30 * 60 * 1000)
    console.log(`Extended timeout set for download request: ${req.path}`)
  } 
  else {
    req.setTimeout(30 * 1000) // 30 seconds for other requests
    res.setTimeout(30 * 1000)
  }
  next()
})

// Request logging middleware for monitoring uploads
app.use((req, res, next) => {
  // Log upload requests with more detail
  if (req.path.includes('/upload')) {
    console.log(`📤 Upload request started: ${req.method} ${req.path}`)
    console.log(`📊 Content-Length: ${req.headers['content-length'] || 'unknown'}`)
    
    // Track request completion
    const startTime = Date.now()
    const originalSend = res.send
    
    res.send = function(data) {
      const duration = Date.now() - startTime
      console.log(`✅ Upload request completed in ${duration}ms`)
      return originalSend.call(this, data)
    }
  }
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/admin/auth', adminAuthRoutes)
app.use('/api/admin/users', adminUsersRoutes)
app.use('/api/admin/galleries', adminGalleriesRoutes)
app.use('/api/admin/analytics', adminAnalyticsRoutes)
app.use('/api/admin/system-config', adminSystemConfigRoutes)
app.use('/api/admin/invitations', adminInvitationsRoutes)
app.use('/api/admin/audit', auditRoutes)
app.use('/api/galleries', galleryRoutes)
app.use('/api/photos', photoRoutes)
app.use('/api/photographers', photographersRoutes)
app.use('/api/uploads', uploadsRoutes)
app.use('/api/folders', folderRoutes)
app.use('/api/analytics', selectionAnalyticsRoutes)

// Upload configuration endpoint for frontend
app.get('/api/upload-config', (req, res) => {
  res.json({
    success: true,
    data: {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 50,
      supportedTypes: [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff',
        'image/x-canon-cr2', 'image/x-nikon-nef', 'image/x-sony-arw', 'image/x-adobe-dng'
      ],
      supportedExtensions: [
        '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif',
        '.cr2', '.cr3', '.nef', '.arw', '.dng', '.orf'
      ],
      recommendedBatchSize: 20, // Recommend smaller batches for better UX
      timeoutMinutes: 10
    }
  })
})

// System health endpoint with more detailed info
app.get('/api/system-status', (req, res) => {
  const memoryUsage = process.memoryUsage()
  const uptime = process.uptime()
  
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        unit: 'MB'
      },
      environment: process.env.NODE_ENV || 'development'
    }
  })
})

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Photo Gallery API is running!',
    version: '1.0.0',
    features: ['batch upload', 'raw file support', 'gallery management'],
    endpoints: {
      upload: '/api/photos/upload/:galleryId',
      config: '/api/upload-config',
      health: '/api/system-status'
    }
  })
})

// Legacy health check (keep for compatibility)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Enhanced database test with more info
app.get('/test-db', async (req, res) => {
  try {
    const startTime = Date.now()
    const [userCount, galleryCount, photoCount] = await Promise.all([
      prisma.user.count(),
      prisma.gallery.count(),
      prisma.photo.count()
    ])
    const queryTime = Date.now() - startTime
    
    res.json({
      success: true,
      message: 'Database connected successfully!',
      data: {
        users: userCount,
        galleries: galleryCount,
        photos: photoCount,
        queryTime: `${queryTime}ms`
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

// Global error handler for upload errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Global error handler:', err)
  
  // Handle specific upload errors
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request too large. Please reduce file sizes or batch size.',
      maxSize: '100MB'
    })
  }
  
  if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
    return res.status(408).json({
      success: false,
      error: 'Upload timeout. Please try with fewer files or check your connection.'
    })
  }
  
  // Generic error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('🔄 Received SIGINT, shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

// Export app for testing
export default app

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`� Env ironment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`� Feataures: Batch uploads, RAW support, Extended timeouts, Admin system`)
  console.log(`⏰ Upload timeout: 10 minutes`)
  console.log(`💾 Max file size: 50MB, Max batch: 50 files`)
  console.log(`🔗 Upload config: http://localhost:${PORT}/api/upload-config`)
  console.log(`🔐 Admin auth: http://localhost:${PORT}/api/admin/auth`)
  
  // Start admin session cleanup
  adminSessionManager.startAutomaticCleanup()
  console.log(`🧹 Admin session cleanup started`)
})