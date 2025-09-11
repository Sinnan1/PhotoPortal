"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Trash2, Save, ArrowLeft, Images, Settings, Loader2, X, Folder, FolderOpen } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { FolderTree } from "@/components/folder-tree"
import { FolderGrid } from "@/components/folder-grid"
import { PhotoLightbox } from "@/components/photo-lightbox"

interface Photo {
  id: string
  filename: string
  thumbnailUrl: string
  originalUrl: string
  createdAt: string
  likedBy: { userId: string }[]
  favoritedBy: { userId: string }[]
  postBy: { userId: string }[]
}

interface Folder {
  id: string
  name: string
  children: Folder[]
  photos: Photo[]
  coverPhoto?: Photo
  _count: {
    photos: number
    children: number
  }
}

interface Gallery {
  id: string
  title: string
  description: string
  password: string | null
  expiresAt: string | null
  downloadLimit: number | null
  downloadCount: number
  folders: Folder[]
}

export default function ManageGalleryPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const galleryId = params.id as string
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [uploadStatus, setUploadStatus] = useState<{ [key: string]: 'queued' | 'uploading' | 'processing' | 'success' | 'failed' }>({})
  const [uploadAttempts, setUploadAttempts] = useState<{ [key: string]: number }>({})
  const [activeUploads, setActiveUploads] = useState<{ [key: string]: XMLHttpRequest }>({})

  // Folder management state
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    password: "",
    expiresAt: "",
    downloadLimit: "",
  })

  useEffect(() => {
    if (user?.role === "PHOTOGRAPHER") {
      fetchGallery()
    }
  }, [user, galleryId])

  // Enable folder selection on the hidden input when present
  useEffect(() => {
    const input = fileInputRef.current
    if (input) {
      try {
        input.setAttribute('webkitdirectory', '')
        input.setAttribute('directory', '')
      } catch {}
    }
  }, [])

  const fetchGallery = async () => {
    try {
      const response = await api.getGallery(galleryId)
      const galleryData = response.data
      setGallery(galleryData)
      setFormData({
        title: galleryData.title,
        description: galleryData.description || "",
        password: galleryData.password || "",
        expiresAt: galleryData.expiresAt ? new Date(galleryData.expiresAt).toISOString().slice(0, 16) : "",
        downloadLimit: galleryData.downloadLimit?.toString() || "",
      })

      // Set default folder (first folder or create one)
      if (galleryData.folders && galleryData.folders.length > 0) {
        const defaultFolder = galleryData.folders[0]
        setSelectedFolderId(defaultFolder.id)
        setSelectedFolder(defaultFolder)
      }
    } catch (error) {
      showToast("Failed to load gallery", "error")
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const updateData = {
        title: formData.title,
        description: formData.description || undefined,
        password: formData.password || undefined,
        expiresAt: formData.expiresAt || undefined,
        downloadLimit: formData.downloadLimit ? Number.parseInt(formData.downloadLimit) : undefined,
      }

      await api.updateGallery(galleryId, updateData)
      showToast("Gallery settings updated successfully", "success")
      fetchGallery()
    } catch (error) {
      showToast("Failed to update gallery settings", "error")
    } finally {
      setSaving(false)
    }
  }

  // Extract files from DataTransfer (supports dropped folders)
  const getFilesFromDataTransfer = async (dt: DataTransfer): Promise<File[]> => {
    const items = Array.from(dt.items || []) as any[]
    const out: File[] = []

    const traverse = async (entry: any, prefix = ""): Promise<void> => {
      if (!entry) return
      if (entry.isFile) {
        await new Promise<void>((resolve) => {
          entry.file((file: File) => {
            try {
              Object.defineProperty(file, 'webkitRelativePath', { value: prefix + file.name })
            } catch {}
            out.push(file)
            resolve()
          })
        })
      } else if (entry.isDirectory) {
        const reader = entry.createReader()
        const readAll = async (): Promise<any[]> => {
          const result: any[] = []
          while (true) {
            const batch: any[] = await new Promise((resolve) => reader.readEntries(resolve))
            if (!batch || batch.length === 0) break
            result.push(...batch)
          }
          return result
        }
        const entries = await readAll()
        await Promise.all(entries.map((e) => traverse(e, prefix + entry.name + "/")))
      }
    }

    await Promise.all(items.map((it) => {
      const entry = it && typeof it.webkitGetAsEntry === 'function' ? it.webkitGetAsEntry() : null
      return entry ? traverse(entry) : Promise.resolve()
    }))

    // Fallback if items API is unavailable
    if (out.length === 0 && dt.files) {
      return Array.from(dt.files)
    }
    return out
  }

  const uploadWithConcurrency = async (files: File[], concurrency = 5) => {
    let index = 0
    let successCount = 0
    let failureCount = 0

    const worker = async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const current = index++
        if (current >= files.length) break
        const ok = await uploadSingleFileWithProgress(files[current])
        if (ok) successCount++
        else failureCount++
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, files.length) }, worker)
    await Promise.all(workers)
    return { successCount, failureCount }
  }

  const cancelUpload = () => {
    // Abort all active uploads
    Object.values(activeUploads).forEach(xhr => {
      xhr.abort()
    })
    
    // Reset upload state
    setActiveUploads({})
    setUploading(false)
    setUploadProgress({})
    setUploadStatus({})
    setUploadAttempts({})
    
    showToast("Upload canceled", "info")
  }

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.isArray(files) ? files : Array.from(files)
    if (fileArray.length === 0) return

    // Check if a folder is selected
    if (!selectedFolderId) {
      showToast("Please select a folder first", "error")
      return
    }

    setUploading(true)

    // Initialize progress, status and attempts
    const initProgress: { [key: string]: number } = {}
    const initStatus: { [key: string]: 'queued' } = {} as any
    const initAttempts: { [key: string]: number } = {}
    fileArray.forEach((file) => {
      initProgress[file.name] = 0
      initStatus[file.name] = 'queued'
      initAttempts[file.name] = 0
    })
    setUploadProgress((prev) => ({ ...initProgress, ...prev }))
    setUploadStatus((prev) => ({ ...prev, ...initStatus }))
    setUploadAttempts((prev) => ({ ...prev, ...initAttempts }))

    try {
      // Limited parallel uploads for better throughput without overwhelming the server
      const { successCount, failureCount } = await uploadWithConcurrency(fileArray, 5)

      if (successCount > 0) {
        showToast(`Successfully uploaded ${successCount} ${successCount === 1 ? 'photo' : 'photos'}`, 'success')
        // Refresh the selected folder to show new photos
        if (selectedFolderId) {
          handleFolderSelect(selectedFolderId)
        }
      }
      if (failureCount > 0) {
        showToast(`${failureCount} ${failureCount === 1 ? 'upload' : 'uploads'} failed`, 'error')
      }
    } catch (error) {
      // Handle upload cancellation or other errors
      if (error instanceof Error && error.name === 'AbortError') {
        showToast("Upload canceled", "info")
      }
    } finally {
      setUploading(false)
      setActiveUploads({})
    }
  }

  const uploadSingleFileWithProgress = (file: File): Promise<boolean> => {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    const token = typeof document !== 'undefined'
      ? document.cookie.split('; ').find((row) => row.startsWith('auth-token='))?.split('=')[1]
      : undefined

    const attemptUpload = (attempt: number): Promise<boolean> => {
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()
        formData.append('photos', file)

        // Track this upload request
        setActiveUploads(prev => ({ ...prev, [file.name]: xhr }))

        setUploadStatus((prev) => ({ ...prev, [file.name]: 'uploading' }))
        setUploadAttempts((prev) => ({ ...prev, [file.name]: attempt }))

        xhr.upload.onprogress = (e: ProgressEvent<EventTarget>) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100)
            setUploadProgress((prev) => ({ ...prev, [file.name]: percent }))
            if (percent === 100) {
              // Body sent; server may still be processing
              setUploadStatus((prev) => ({ ...prev, [file.name]: 'processing' }))
            }
          }
        }

        xhr.onabort = () => {
          setUploadStatus((prev) => ({ ...prev, [file.name]: 'failed' }))
          setActiveUploads(prev => {
            const newUploads = { ...prev }
            delete newUploads[file.name]
            return newUploads
          })
          resolve(false)
        }

        xhr.onreadystatechange = () => {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            // Remove from active uploads
            setActiveUploads(prev => {
              const newUploads = { ...prev }
              delete newUploads[file.name]
              return newUploads
            })

            const status = xhr.status
            if (status >= 200 && status < 300) {
              setUploadStatus((prev) => ({ ...prev, [file.name]: 'success' }))
              setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }))
              resolve(true)
              return
            }

            // Do not retry on client errors like 400/413; allow retry for 429
            if (status >= 400 && status < 500 && status !== 429) {
              setUploadStatus((prev) => ({ ...prev, [file.name]: 'failed' }))
              resolve(false)
              return
            }

            // Retry with exponential backoff up to 3 attempts
            if (attempt < 3) {
              const delay = 500 * Math.pow(2, attempt - 1)
              setTimeout(() => {
                resolve(attemptUpload(attempt + 1))
              }, delay)
            } else {
              setUploadStatus((prev) => ({ ...prev, [file.name]: 'failed' }))
              resolve(false)
            }
          }
        }

        xhr.open('POST', `${BASE_URL}/photos/upload/${selectedFolderId}`)
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.send(formData)
      })
    }

    return attemptUpload(1)
  }

  // Folder management functions
  const handleFolderSelect = async (folderId: string) => {
    try {
      const response = await api.getFolder(folderId)
      setSelectedFolderId(folderId)
      setSelectedFolder(response.data)
    } catch (error) {
      showToast("Failed to load folder", "error")
    }
  }

  const handleCreateFolder = async (parentId?: string) => {
    const folderName = prompt("Enter folder name:", "New Folder")
    if (!folderName || !folderName.trim()) return

    try {
      await api.createFolder(galleryId, {
        name: folderName.trim(),
        parentId: parentId || undefined
      })
      showToast("Folder created successfully", "success")
      fetchGallery() // Refresh to get updated folder structure
    } catch (error) {
      showToast("Failed to create folder", "error")
    }
  }

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      await api.updateFolder(folderId, { name: newName })
      showToast("Folder renamed successfully", "success")
      fetchGallery()

      // Update selected folder if it's the one being renamed
      if (selectedFolderId === folderId) {
        setSelectedFolder(prev => prev ? { ...prev, name: newName } : null)
      }
    } catch (error) {
      showToast("Failed to rename folder", "error")
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await api.deleteFolder(folderId)
      showToast("Folder deleted successfully", "success")
      fetchGallery()

      // Reset selection if deleted folder was selected
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null)
        setSelectedFolder(null)
      }
    } catch (error) {
      showToast("Failed to delete folder", "error")
    }
  }

  const handlePhotoStatusChange = (photoId: string, status: { liked?: boolean; favorited?: boolean }) => {
    if (!selectedFolder) return

    setSelectedFolder(prev => {
      if (!prev) return prev
      const updatedPhotos = prev.photos.map((p) => {
        if (p.id !== photoId) return p
        const currentLiked = (p.likedBy ?? []).some((l) => l.userId === user?.id)
        const currentFav = (p.favoritedBy ?? []).some((f) => f.userId === user?.id)
        return {
          ...p,
          likedBy:
            status.liked === undefined
              ? p.likedBy
              : status.liked
              ? [ ...(p.likedBy ?? []), { userId: user!.id } ]
              : (p.likedBy ?? []).filter((l) => l.userId !== user?.id),
          favoritedBy:
            status.favorited === undefined
              ? p.favoritedBy
              : status.favorited
              ? [ ...(p.favoritedBy ?? []), { userId: user!.id } ]
              : (p.favoritedBy ?? []).filter((f) => f.userId !== user?.id),
        } as Photo
      })

      return {
        ...prev,
        photos: updatedPhotos
      }
    })
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return

    try {
      await api.deletePhoto(photoId)
      showToast("Photo deleted successfully", "success")

      // Update local state
      if (selectedFolder) {
        setSelectedFolder(prev => prev ? {
          ...prev,
          photos: prev.photos.filter(p => p.id !== photoId),
          _count: {
            ...prev._count,
            photos: (prev._count?.photos ?? 0) - 1
          }
        } : null)
      }
    } catch (error) {
      showToast("Failed to delete photo", "error")
    }
  }

  const handleSetCoverPhoto = async (folderId: string, photoId: string) => {
    try {
      // If photoId is empty, remove the cover photo
      if (photoId === '') {
        await api.setFolderCover(folderId, undefined)
        showToast("Cover photo removed successfully", "success")
      } else {
        await api.setFolderCover(folderId, photoId)
        showToast("Cover photo updated successfully", "success")
      }

      // Refresh the folder to show the new cover photo
      if (selectedFolderId === folderId) {
        handleFolderSelect(folderId)
      }
    } catch (error) {
      showToast("Failed to update cover photo", "error")
    }
  }

  if (user?.role !== "PHOTOGRAPHER") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mt-2">This page is only available to photographers.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!gallery) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Gallery Not Found</h1>
          <p className="text-gray-600 mt-2">The gallery you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Gallery</h1>
            <p className="text-gray-600">{gallery?.title || 'Loading...'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">{gallery?.folders?.reduce((sum, folder) => sum + (folder?._count?.photos ?? 0), 0) ?? 0} photos</Badge>
          {gallery?.id && (
            <Link href={`/gallery/${gallery.id}?refresh=${Date.now()}`}>
            <Button variant="outline">View Gallery</Button>
          </Link>
          )}
        </div>
      </div>

      <Tabs defaultValue="photos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="photos" className="flex items-center space-x-2">
            <Images className="h-4 w-4" />
            <span>Photos</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Folder Tree Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Folders</CardTitle>
                  <CardDescription>Organize your photos</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {gallery && (
                    <FolderTree
                      galleryId={galleryId}
                      onFolderSelect={handleFolderSelect}
                      selectedFolderId={selectedFolderId || undefined}
                      onFolderCreate={handleCreateFolder}
                      onFolderRename={handleRenameFolder}
                      onFolderDelete={handleDeleteFolder}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-6">
          {/* Upload Section */}
              {selectedFolder && (
          <Card>
            <CardHeader>
                    <CardTitle>Upload to "{selectedFolder.name}"</CardTitle>
                    <CardDescription>Add new photos to this folder. Supported formats: JPG, PNG, WEBP</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#425146] transition-colors cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label="Upload photos by clicking or dragging files here"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault()
                  const dt = e.dataTransfer
                  let files: File[] = []
                  try {
                    files = await getFilesFromDataTransfer(dt)
                  } catch {
                    files = Array.from(dt.files || [])
                  }
                  if (files.length > 0) {
                    await handleFileUpload(files)
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">Drop photos here or click to browse</p>
                <p className="text-sm text-gray-500">You can upload multiple photos at once</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFileUpload(e.target.files)
                    }
                  }}
                />
              </div>

              {uploading && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Uploading photos...</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelUpload}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      aria-label="Cancel all photo uploads"
                    >
                      <X className="mr-1 h-4 w-4" />
                      Cancel Upload
                    </Button>
                  </div>
                  {Object.entries(uploadProgress).map(([filename, progress]) => {
                    const status = uploadStatus[filename]
                    const attempts = uploadAttempts[filename] || 0
                    return (
                      <div key={filename} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 truncate flex-1 pr-2">{filename}</span>
                          <span className="text-xs text-gray-500">
                            {status === 'uploading' && `${progress}%`}
                            {status === 'processing' && 'Processing...'}
                            {status === 'success' && 'Done'}
                            {status === 'failed' && 'Failed'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                                  className={`${status === 'failed' ? 'bg-red-500' : 'bg-[#425146]'} h-2 rounded-full transition-all`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        {attempts > 1 && status !== 'success' && (
                          <div className="text-xs text-gray-500">Attempt {attempts} of 3</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
              )}

              {/* Folder Content */}
              {selectedFolder ? (
          <Card>
            <CardHeader>
                    <CardTitle>{selectedFolder?.name || 'Loading...'}</CardTitle>
                    <CardDescription>
                      {selectedFolder?._count?.photos ?? 0} photos • {selectedFolder?._count?.children ?? 0} subfolders
                    </CardDescription>
            </CardHeader>
            <CardContent>
                    <FolderGrid
                      folder={selectedFolder}
                      isPhotographer={user?.role === "PHOTOGRAPHER"}
                      onPhotoView={(photo) => setSelectedPhoto(photo)}
                      onPhotoDelete={handleDeletePhoto}
                      onFolderSelect={handleFolderSelect}
                      onFolderRename={handleRenameFolder}
                      onFolderDelete={handleDeleteFolder}
                      onPhotoStatusChange={handlePhotoStatusChange}
                      onSetCoverPhoto={handleSetCoverPhoto}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Folder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Folder</h3>
                    <p className="text-gray-500">Choose a folder from the sidebar to view and manage its contents.</p>
                  </CardContent>
                </Card>
              )}
                      </div>
                    </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Gallery Settings</CardTitle>
              <CardDescription>Update gallery information and access settings</CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveSettings}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Gallery Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter gallery title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter gallery description"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Set a password for this gallery (optional)"
                  />
                  <p className="text-sm text-gray-500">Leave empty to make gallery publicly accessible</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expiry Date</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                  <p className="text-sm text-gray-500">Leave empty for no expiry date</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="downloadLimit">Download Limit</Label>
                  <Input
                    id="downloadLimit"
                    type="number"
                    value={formData.downloadLimit}
                    onChange={(e) => setFormData({ ...formData, downloadLimit: e.target.value })}
                    placeholder="Maximum number of downloads (optional)"
                    min="1"
                  />
                  <p className="text-sm text-gray-500">Current downloads: {gallery?.downloadCount ?? 0}</p>
                </div>
              </CardContent>

              <div className="px-6 pb-6">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Photo Lightbox */}
      {selectedPhoto && selectedFolder && (
        <PhotoLightbox
          photo={selectedPhoto}
          photos={selectedFolder.photos || []}
          onClose={() => setSelectedPhoto(null)}
          onNext={() => {
            const photos = selectedFolder.photos || []
            const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id)
            const nextIndex = (currentIndex + 1) % photos.length
            setSelectedPhoto(photos[nextIndex])
          }}
          onPrevious={() => {
            const photos = selectedFolder.photos || []
            const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id)
            const prevIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1
            setSelectedPhoto(photos[prevIndex])
          }}
          onDownload={() => {
            if (selectedPhoto) {
              api.downloadPhotoData(selectedPhoto.id, selectedPhoto.filename).catch(() => {
                showToast("Download failed", "error")
              })
            }
          }}
          onPhotoStatusChange={handlePhotoStatusChange}
          dataSaverMode={false}
        />
      )}
    </div>
  )
}