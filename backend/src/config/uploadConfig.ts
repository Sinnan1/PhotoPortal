/**
 * Upload Configuration - Single Source of Truth
 * 
 * All upload limits are defined here and used consistently across:
 * - Backend controllers
 * - Routes
 * - Middleware
 * - Frontend (mirrored)
 * - Nginx (manually synced)
 */

export const UPLOAD_CONFIG = {
  // FILE LIMITS
  MAX_FILE_SIZE: 200 * 1024 * 1024,        // 200MB per file
  CHUNK_SIZE: 10 * 1024 * 1024,            // 10MB chunks for multipart upload
  
  // BATCH LIMITS
  MAX_FILES_PER_SESSION: 2000,             // Total files user can upload in one session
  MAX_FILES_PER_BATCH: 50,                 // Process 50 files at a time
  MAX_TOTAL_BATCH_SIZE: 10 * 1024 * 1024 * 1024, // 10GB per batch
  
  // CONCURRENT UPLOAD LIMITS
  MAX_CONCURRENT_UPLOADS_PER_USER: 25,     // Per user concurrent uploads
  MAX_GLOBAL_CONCURRENT_UPLOADS: 100,      // Total concurrent uploads (all users)
  
  // RATE LIMITING
  UPLOAD_RATE_LIMIT: 50,                   // Requests per second
  UPLOAD_RATE_BURST: 100,                  // Burst size
  UPLOAD_RATE_WINDOW: 1000,                // Window in ms
  
  // TIMEOUTS
  UPLOAD_TIMEOUT: 30 * 60 * 1000,          // 30 minutes per file
  SESSION_TIMEOUT: 4 * 60 * 60 * 1000,     // 4 hours total session
  CHUNK_UPLOAD_TIMEOUT: 5 * 60 * 1000,     // 5 minutes per chunk
  
  // THUMBNAIL SETTINGS
  THUMBNAIL_QUEUE_CONCURRENCY: 5,          // Process 5 thumbnails at once
  THUMBNAIL_SIZES: {
    small: { width: 400, height: 400 },    // Grid view
    medium: { width: 1200, height: 1200 }, // Lightbox
    large: { width: 2000, height: 2000 }   // High quality preview
  },
  
  // SUPPORTED FILE TYPES
  SUPPORTED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/tiff',
    'image/x-canon-cr2',
    'image/x-canon-crw',
    'image/x-nikon-nef',
    'image/x-sony-arw',
    'image/x-adobe-dng',
    'image/x-panasonic-raw',
    'application/octet-stream' // Fallback for RAW files
  ],
  
  SUPPORTED_EXTENSIONS: [
    // Standard formats
    '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif',
    // RAW formats
    '.cr2', '.cr3', '.crw', '.nef', '.nrw', '.arw', '.srf', '.sr2',
    '.dng', '.orf', '.rw2', '.pef', '.raf', '.3fr', '.fff', '.dcr',
    '.kdc', '.mdc', '.mos', '.mrw', '.x3f'
  ],
  
  // STORAGE QUOTAS
  DEFAULT_USER_QUOTA: 50 * 1024 * 1024 * 1024, // 50GB per user
  
  // CLEANUP SETTINGS
  CLEANUP_ORPHANED_FILES_INTERVAL: 24 * 60 * 60 * 1000, // Daily
  CLEANUP_OLD_SESSIONS_INTERVAL: 7 * 24 * 60 * 60 * 1000, // Weekly
  SESSION_RETENTION_DAYS: 7,                   // Keep sessions for 7 days
} as const

// Helper functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export const isFileSizeValid = (size: number): boolean => {
  return size > 0 && size <= UPLOAD_CONFIG.MAX_FILE_SIZE
}

export const isBatchSizeValid = (totalSize: number): boolean => {
  return totalSize > 0 && totalSize <= UPLOAD_CONFIG.MAX_TOTAL_BATCH_SIZE
}

export const isFileCountValid = (count: number): boolean => {
  return count > 0 && count <= UPLOAD_CONFIG.MAX_FILES_PER_SESSION
}

// Export for frontend
export const getUploadConfigForClient = () => ({
  maxFileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
  maxFilesPerSession: UPLOAD_CONFIG.MAX_FILES_PER_SESSION,
  maxFilesPerBatch: UPLOAD_CONFIG.MAX_FILES_PER_BATCH,
  maxTotalBatchSize: UPLOAD_CONFIG.MAX_TOTAL_BATCH_SIZE,
  chunkSize: UPLOAD_CONFIG.CHUNK_SIZE,
  supportedTypes: UPLOAD_CONFIG.SUPPORTED_IMAGE_TYPES,
  supportedExtensions: UPLOAD_CONFIG.SUPPORTED_EXTENSIONS,
  uploadTimeout: UPLOAD_CONFIG.UPLOAD_TIMEOUT,
  sessionTimeout: UPLOAD_CONFIG.SESSION_TIMEOUT
})
