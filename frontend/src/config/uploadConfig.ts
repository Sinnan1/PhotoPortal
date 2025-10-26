/**
 * Upload Configuration - Frontend Mirror
 * 
 * This mirrors the backend configuration for client-side validation.
 * Keep in sync with backend/src/config/uploadConfig.ts
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
    MAX_CONCURRENT_UPLOADS: 20,              // Concurrent uploads in browser

    // TIMEOUTS
    UPLOAD_TIMEOUT: 30 * 60 * 1000,          // 30 minutes per file
    SESSION_TIMEOUT: 4 * 60 * 60 * 1000,     // 4 hours total session
    CHUNK_UPLOAD_TIMEOUT: 5 * 60 * 1000,     // 5 minutes per chunk

    // RETRY SETTINGS
    MAX_RETRY_ATTEMPTS: 5,                   // Retry failed uploads up to 5 times
    RETRY_DELAY_BASE: 1000,                  // Base delay for exponential backoff

    // UI SETTINGS
    ENABLE_BACKGROUND_UPLOAD: true,          // Allow navigation during upload
    ENABLE_PAUSE_RESUME: true,               // Allow pausing uploads
    SHOW_DETAILED_PROGRESS: true,            // Show per-file progress

    // SUPPORTED FILE TYPES (for validation)
    SUPPORTED_EXTENSIONS: [
        // Standard formats
        '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif',
        // RAW formats
        '.cr2', '.cr3', '.crw', '.nef', '.nrw', '.arw', '.srf', '.sr2',
        '.dng', '.orf', '.rw2', '.pef', '.raf', '.3fr', '.fff', '.dcr',
        '.kdc', '.mdc', '.mos', '.mrw', '.x3f'
    ]
} as const

// Helper functions
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
}

export const calculateETA = (uploadedBytes: number, totalBytes: number, startTime: number): string => {
    if (uploadedBytes === 0) return 'Calculating...'
    if (uploadedBytes >= totalBytes) return 'Done'

    const elapsedTime = Date.now() - startTime
    const uploadSpeed = uploadedBytes / (elapsedTime / 1000) // bytes per second
    const remainingBytes = totalBytes - uploadedBytes
    const remainingSeconds = remainingBytes / uploadSpeed

    return formatDuration(remainingSeconds * 1000)
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

export const isFileTypeSupported = (filename: string): boolean => {
    const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0]
    return ext ? (UPLOAD_CONFIG.SUPPORTED_EXTENSIONS as readonly string[]).includes(ext) : false
}

export const validateFiles = (files: File[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Check file count
    if (!isFileCountValid(files.length)) {
        errors.push(`Maximum ${UPLOAD_CONFIG.MAX_FILES_PER_SESSION} files allowed. You selected ${files.length}.`)
    }

    // Check individual file sizes
    const oversizedFiles = files.filter(f => !isFileSizeValid(f.size))
    if (oversizedFiles.length > 0) {
        errors.push(
            `${oversizedFiles.length} file(s) exceed ${formatFileSize(UPLOAD_CONFIG.MAX_FILE_SIZE)} limit: ` +
            oversizedFiles.slice(0, 3).map(f => f.name).join(', ') +
            (oversizedFiles.length > 3 ? ` and ${oversizedFiles.length - 3} more` : '')
        )
    }

    // Check total batch size
    const totalSize = files.reduce((sum, f) => sum + f.size, 0)
    if (!isBatchSizeValid(totalSize)) {
        errors.push(
            `Total upload size (${formatFileSize(totalSize)}) exceeds ` +
            `${formatFileSize(UPLOAD_CONFIG.MAX_TOTAL_BATCH_SIZE)} limit.`
        )
    }

    // Check file types
    const unsupportedFiles = files.filter(f => !isFileTypeSupported(f.name))
    if (unsupportedFiles.length > 0) {
        errors.push(
            `${unsupportedFiles.length} file(s) have unsupported format: ` +
            unsupportedFiles.slice(0, 3).map(f => f.name).join(', ') +
            (unsupportedFiles.length > 3 ? ` and ${unsupportedFiles.length - 3} more` : '')
        )
    }

    return {
        valid: errors.length === 0,
        errors
    }
}
