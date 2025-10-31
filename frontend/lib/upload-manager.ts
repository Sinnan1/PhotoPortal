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
}

type UploadListener = (batches: UploadBatch[]) => void

class UploadManager {
  private batches: Map<string, UploadBatch> = new Map()
  private listeners: Set<UploadListener> = new Set()
  private activeUploads: Map<string, XMLHttpRequest> = new Map()
  private maxConcurrent = 3  // Reduced from 10 to 3 for better reliability
  private maxRetries = 3

  constructor() {
    // Load persisted batches from localStorage
    if (typeof window !== 'undefined') {
      this.loadFromStorage()
    }
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
    compress: boolean = false
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
      compress
    }

    this.batches.set(batchId, batch)
    this.notify()

    // Start processing
    this.processBatch(batchId)

    return batchId
  }

  private async processBatch(batchId: string) {
    const batch = this.batches.get(batchId)
    if (!batch) return

    const queuedFiles = batch.files.filter(f => f.status === 'queued')

    // Process files with concurrency limit
    const workers = Array.from({ length: Math.min(this.maxConcurrent, queuedFiles.length) },
      () => this.processNextFile(batchId)
    )

    await Promise.all(workers)
  }

  private async processNextFile(batchId: string): Promise<void> {
    while (true) {
      const batch = this.batches.get(batchId)
      if (!batch) return

      const nextFile = batch.files.find(f => f.status === 'queued')
      if (!nextFile) return

      await this.uploadFile(batchId, nextFile.id)
    }
  }

  private async uploadFile(batchId: string, fileId: string) {
    const batch = this.batches.get(batchId)
    if (!batch) return

    const uploadFile = batch.files.find(f => f.id === fileId)
    if (!uploadFile || !uploadFile.file) return

    const attemptUpload = async (attempt: number): Promise<boolean> => {
      try {
        uploadFile.status = 'uploading'
        uploadFile.attempts = attempt
        this.notify()

        let fileToUpload = uploadFile.file

        // Compress if requested
        if (batch.compress && attempt === 1) {
          fileToUpload = await this.compressImage(uploadFile.file)
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

        if (attempt < this.maxRetries) {
          // Exponential backoff with jitter
          const delay = 1000 * Math.pow(2, attempt - 1) + Math.random() * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
          return attemptUpload(attempt + 1)
        } else {
          uploadFile.status = 'failed'
          uploadFile.error = error instanceof Error ? error.message : 'Upload failed'
          batch.failedFiles++
          this.notify()
          return false
        }
      }
    }

    await attemptUpload(1)
  }

  private async compressImage(file: File): Promise<File> {
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

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Compression failed'))
            }
          },
          'image/jpeg',
          0.9
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

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100
          onProgress(percent)
        }
      })

      xhr.addEventListener('load', () => {
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
        reject(new Error('Network error during upload'))
      })

      xhr.addEventListener('abort', () => {
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
