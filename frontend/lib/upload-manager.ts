/**
 * Background Upload Manager
 * Handles uploads that persist even when user navigates away
 */

export interface UploadFile {
  file: File
  id: string
  status: 'queued' | 'uploading' | 'processing' | 'success' | 'failed'
  progress: number
  attempts: number
  error?: string
  photoId?: string
}

export interface UploadBatch {
  id: string
  galleryId: string
  folderId: string
  files: UploadFile[]
  startTime: number
  totalBytes: number
  uploadedBytes: number
  completedFiles: number
  failedFiles: number
  averageSpeed: number
  compress: boolean
  compressionQuality: number // 10-100, default 90
}

type UploadListener = (batches: UploadBatch[]) => void

class UploadManager {
  private batches: Map<string, UploadBatch> = new Map()
  private listeners: Set<UploadListener> = new Set()
  private activeUploads: Map<string, XMLHttpRequest> = new Map()
  private maxConcurrent = 3  // Reduced from 10 to 3 for better reliability
  private maxRetries = 3  // For server errors only
  private isOnline = true
  private activeWorkers = new Map<string, number>()  // Track active workers per batch

  constructor() {
    // Load persisted batches from localStorage
    if (typeof window !== 'undefined') {
      this.loadFromStorage()
      this.setupNetworkMonitoring()
    }
  }

  private setupNetworkMonitoring() {
    // Monitor network status
    this.isOnline = navigator.onLine

    window.addEventListener('online', () => {
      console.log('🌐 Network reconnected - resuming uploads')
      this.isOnline = true
      this.resumeAllBatches()
    })

    window.addEventListener('offline', () => {
      console.log('📡 Network disconnected - pausing uploads')
      this.isOnline = false
    })
  }

  private resumeAllBatches() {
    // Resume all batches that have queued files
    this.batches.forEach((batch, batchId) => {
      const hasQueuedFiles = batch.files.some(f => f.status === 'queued')
      const activeWorkerCount = this.activeWorkers.get(batchId) || 0

      if (hasQueuedFiles && activeWorkerCount === 0) {
        console.log(`🔄 Restarting workers for batch ${batchId}`)
        this.processBatch(batchId)
      }
    })
  }

  subscribe(listener: UploadListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    const batches = Array.from(this.batches.values())
    this.listeners.forEach(listener => listener(batches))
    this.saveToStorage()
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return
    try {
      const data = Array.from(this.batches.values()).map(batch => ({
        ...batch,
        files: batch.files.map(f => ({
          ...f,
          file: null // Don't persist File objects
        }))
      }))
      localStorage.setItem('upload-batches', JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save upload state:', e)
    }
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem('upload-batches')
      if (data) {
        const batches = JSON.parse(data) as UploadBatch[]
        // Only load batches that aren't complete
        batches.forEach(batch => {
          const hasIncomplete = batch.files.some(f =>
            f.status === 'queued' || f.status === 'uploading'
          )
          if (hasIncomplete) {
            // Mark all incomplete as failed since we can't resume
            batch.files.forEach(f => {
              if (f.status === 'queued' || f.status === 'uploading') {
                f.status = 'failed'
                f.error = 'Upload interrupted'
              }
            })
            this.batches.set(batch.id, batch)
          }
        })
      }
    } catch (e) {
      console.error('Failed to load upload state:', e)
    }
  }

  async createBatch(
    galleryId: string,
    folderId: string,
    files: File[],
    compress: boolean = false,
    compressionQuality: number = 90
  ): Promise<string> {
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

    const uploadFiles: UploadFile[] = files.map(file => ({
      file,
      id: `${batchId}-${file.name}`,
      status: 'queued' as const,
      progress: 0,
      attempts: 0
    }))

    const totalBytes = files.reduce((sum, f) => sum + f.size, 0)

    const batch: UploadBatch = {
      id: batchId,
      galleryId,
      folderId,
      files: uploadFiles,
      startTime: Date.now(),
      totalBytes,
      uploadedBytes: 0,
      completedFiles: 0,
      failedFiles: 0,
      averageSpeed: 0,
      compress,
      compressionQuality
    }

    this.batches.set(batchId, batch)
    this.notify()

    // Check for duplicates before starting uploads
    await this.checkDuplicatesBeforeUpload(batchId, folderId)

    // Start processing (only non-duplicate files will be uploaded)
    this.processBatch(batchId)

    return batchId
  }

  private async checkDuplicatesBeforeUpload(batchId: string, folderId: string) {
    const batch = this.batches.get(batchId)
    if (!batch) return

    try {
      // Import api dynamically to avoid circular dependencies
      const { api } = await import('./api')

      // Prepare file list for duplicate check - skip files without valid data
      const fileList = batch.files
        .filter(f => f.file?.name && f.file?.size)
        .map(f => ({
          filename: f.file!.name,
          size: f.file!.size
        }))

      if (fileList.length === 0) {
        console.log('⚠️ No valid files to check for duplicates')
        return
      }

      console.log(`🔍 Checking ${fileList.length} files for duplicates...`)

      // Call backend to check for duplicates
      const response = await api.checkDuplicates(folderId, fileList)

      if (response.success && response.results) {
        // Mark duplicate files as failed immediately
        response.results.forEach((result: { filename: string; size: number; isDuplicate: boolean; existingPhoto?: { id: string; uploadedAt: Date } }) => {
          const uploadFile = batch.files.find(f => 
            f.file?.name === result.filename && f.file?.size === result.size
          )
          
          if (uploadFile && result.isDuplicate) {
            uploadFile.status = 'failed'
            uploadFile.error = `File "${result.filename}" already exists in this folder`
            uploadFile.progress = 0
            batch.failedFiles++
            console.log(`⚠️ Skipping duplicate: ${result.filename}`)
          }
        })

        const duplicateCount = response.summary?.duplicates || 0
        if (duplicateCount > 0) {
          console.log(`⏭️ Skipped ${duplicateCount} duplicate file(s) instantly`)
        }

        this.notify()
      }
    } catch (error) {
      console.error('Failed to check for duplicates:', error)
      // If duplicate check fails, continue with uploads anyway
      // This ensures the feature doesn't break existing functionality
    }
  }

  private async processBatch(batchId: string) {
    const batch = this.batches.get(batchId)
    if (!batch) return

    const queuedFiles = batch.files.filter(f => f.status === 'queued')
    if (queuedFiles.length === 0) return

    // Initialize worker count for this batch
    const workerCount = Math.min(this.maxConcurrent, queuedFiles.length)
    this.activeWorkers.set(batchId, workerCount)

    console.log(`🚀 Starting ${workerCount} workers for batch ${batchId}`)

    // Process files with concurrency limit
    const workers = Array.from({ length: workerCount },
      () => this.processNextFile(batchId)
    )

    await Promise.all(workers)

    // All workers finished
    this.activeWorkers.set(batchId, 0)
    console.log(`✅ All workers completed for batch ${batchId}`)
  }

  private async processNextFile(batchId: string): Promise<void> {
    while (true) {
      const batch = this.batches.get(batchId)
      if (!batch) {
        // Decrement worker count before exiting
        const count = this.activeWorkers.get(batchId) || 0
        this.activeWorkers.set(batchId, Math.max(0, count - 1))
        return
      }

      const nextFile = batch.files.find(f => f.status === 'queued')
      if (!nextFile) {
        // Decrement worker count before exiting
        const count = this.activeWorkers.get(batchId) || 0
        this.activeWorkers.set(batchId, Math.max(0, count - 1))
        return
      }

      await this.uploadFile(batchId, nextFile.id)
    }
  }

  private async uploadFile(batchId: string, fileId: string) {
    const batch = this.batches.get(batchId)
    if (!batch) return

    const uploadFile = batch.files.find(f => f.id === fileId)
    if (!uploadFile || !uploadFile.file) return

    const attemptUpload = async (attempt: number, isNetworkRetry: boolean = false): Promise<boolean> => {
      try {
        // Wait if offline
        if (!this.isOnline) {
          console.log(`⏸️ Pausing upload (offline): ${uploadFile.file?.name}`)
          uploadFile.status = 'queued'
          uploadFile.error = 'Waiting for network...'
          this.notify()

          // Wait for network to come back
          await this.waitForOnline()

          console.log(`▶️ Resuming upload (online): ${uploadFile.file?.name}`)
          // Don't count this as a retry attempt
          return attemptUpload(attempt, true)
        }

        uploadFile.status = 'uploading'
        uploadFile.attempts = isNetworkRetry ? attempt : attempt
        uploadFile.error = undefined
        this.notify()

        let fileToUpload = uploadFile.file

        // Compress if requested (only on first attempt)
        if (batch.compress && attempt === 1 && !isNetworkRetry) {
          fileToUpload = await this.compressImage(uploadFile.file, batch.compressionQuality)
        }

        const result = await this.performUpload(
          fileToUpload,
          batch.galleryId,
          batch.folderId,
          (progress) => {
            // Update file progress
            uploadFile.progress = progress

            // Recalculate total uploaded bytes from all files
            batch.uploadedBytes = batch.files.reduce((total, f) => {
              return total + ((f.progress / 100) * (f.file?.size || 0))
            }, 0)

            const elapsedTime = (Date.now() - batch.startTime) / 1000
            batch.averageSpeed = elapsedTime > 0 ? batch.uploadedBytes / elapsedTime : 0

            this.notify()
          }
        )

        uploadFile.status = 'success'
        uploadFile.progress = 100
        uploadFile.photoId = result.photoId
        batch.completedFiles++

        // Recalculate final uploaded bytes
        batch.uploadedBytes = batch.files.reduce((total, f) => {
          return total + ((f.progress / 100) * (f.file?.size || 0))
        }, 0)

        this.notify()

        return true

      } catch (error) {
        console.error(`Upload attempt ${attempt} failed:`, error)

        const errorMessage = error instanceof Error ? error.message : 'Upload failed'

        // Don't retry duplicate errors
        const isDuplicate = errorMessage.includes('already exists')
        if (isDuplicate) {
          uploadFile.status = 'failed'
          uploadFile.error = errorMessage
          batch.failedFiles++
          this.notify()
          return false
        }

        // Check if it's a network error
        const isNetworkError = errorMessage.includes('Network error') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('timeout') ||
          !this.isOnline

        if (isNetworkError) {
          console.log(`🌐 Network error detected for ${uploadFile.file?.name}, will retry when online`)

          // Don't count network errors against retry limit
          // Just wait for network and retry
          uploadFile.status = 'queued'
          uploadFile.error = 'Network error - will retry'
          this.notify()

          // Wait a bit before checking network again
          await new Promise(resolve => setTimeout(resolve, 2000))

          // Retry without incrementing attempt counter for network errors
          return attemptUpload(attempt, true)
        }

        // Server error - use exponential backoff
        if (attempt < this.maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1) + Math.random() * 1000
          console.log(`⏳ Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${this.maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
          return attemptUpload(attempt + 1, false)
        } else {
          uploadFile.status = 'failed'
          uploadFile.error = errorMessage
          batch.failedFiles++
          this.notify()
          return false
        }
      }
    }

    await attemptUpload(1)
  }

  private waitForOnline(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isOnline) {
        resolve()
        return
      }

      const checkOnline = () => {
        if (this.isOnline) {
          window.removeEventListener('online', checkOnline)
          resolve()
        }
      }

      window.addEventListener('online', checkOnline)
    })
  }

  private async compressImage(file: File, quality: number = 90): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        // Calculate new dimensions (max 2000px on longest side)
        let width = img.width
        let height = img.height
        const maxSize = 2000

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize
            width = maxSize
          } else {
            width = (width / height) * maxSize
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)

        // Convert quality from 0-100 to 0-1 scale
        const qualityDecimal = Math.max(0.1, Math.min(1, quality / 100))

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              console.log(`📷 Compressed ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(blob.size / 1024).toFixed(0)}KB (${quality}% quality)`)
              resolve(compressedFile)
            } else {
              reject(new Error('Compression failed'))
            }
          },
          'image/jpeg',
          qualityDecimal
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  private async performUpload(
    file: File,
    galleryId: string,
    folderId: string,
    onProgress: (percent: number) => void
  ): Promise<{ photoId: string }> {
    // Use direct subdomain to bypass Cloudflare 100-second timeout
    const BASE_URL = process.env.NEXT_PUBLIC_DIRECT_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    const token = typeof document !== 'undefined'
      ? document.cookie.split('; ').find((row) => row.startsWith('auth-token='))?.split('=')[1]
      : undefined

    if (!token) {
      throw new Error('No auth token found')
    }

    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folderId', folderId)

      const xhr = new XMLHttpRequest()

      // Set timeout to 60 seconds
      xhr.timeout = 60000

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100
          onProgress(percent)
        }
      })

      xhr.addEventListener('load', () => {
        this.activeUploads.delete(file.name)

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            if (response.success) {
              resolve({ photoId: response.photo.id })
            } else {
              reject(new Error(response.error || 'Upload failed'))
            }
          } catch (error) {
            reject(new Error('Invalid response from server'))
          }
        } else if (xhr.status === 409) {
          // Duplicate file detected
          try {
            const response = JSON.parse(xhr.responseText)
            reject(new Error(response.error || 'Duplicate file'))
          } catch (error) {
            reject(new Error('Duplicate file detected'))
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
        }
      })

      xhr.addEventListener('error', () => {
        this.activeUploads.delete(file.name)
        reject(new Error('Network error during upload'))
      })

      xhr.addEventListener('timeout', () => {
        this.activeUploads.delete(file.name)
        reject(new Error('Network error: Upload timeout'))
      })

      xhr.addEventListener('abort', () => {
        this.activeUploads.delete(file.name)
        reject(new Error('Upload cancelled'))
      })

      xhr.open('POST', `${BASE_URL}/uploads/direct`)
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)

      this.activeUploads.set(file.name, xhr)
    })
  }

  cancelBatch(batchId: string) {
    const batch = this.batches.get(batchId)
    if (!batch) return

    // Cancel active uploads
    batch.files.forEach(file => {
      const xhr = this.activeUploads.get(file.file?.name || '')
      if (xhr) {
        xhr.abort()
        this.activeUploads.delete(file.file?.name || '')
      }
      if (file.status === 'queued' || file.status === 'uploading') {
        file.status = 'failed'
        file.error = 'Cancelled by user'
      }
    })

    this.batches.delete(batchId)
    this.notify()
  }

  retryFailed(batchId: string) {
    const batch = this.batches.get(batchId)
    if (!batch) return

    // Reset failed files
    batch.files.forEach(file => {
      if (file.status === 'failed') {
        file.status = 'queued'
        file.attempts = 0
        file.progress = 0
        file.error = undefined
      }
    })

    // Reset batch counters (but keep uploadedBytes from successful uploads)
    batch.failedFiles = 0

    this.notify()
    this.processBatch(batchId)
  }

  getBatch(batchId: string): UploadBatch | undefined {
    return this.batches.get(batchId)
  }

  getAllBatches(): UploadBatch[] {
    return Array.from(this.batches.values())
  }

  clearCompleted() {
    Array.from(this.batches.entries()).forEach(([id, batch]) => {
      const allComplete = batch.files.every(f =>
        f.status === 'success' || f.status === 'failed'
      )
      if (allComplete) {
        this.batches.delete(id)
      }
    })
    this.notify()
  }
}

// Singleton instance
export const uploadManager = new UploadManager()
