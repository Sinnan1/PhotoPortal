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
import { Upload, Save, ArrowLeft, Images, Settings, Loader2, Folder } from "lucide-react"
import Link from "next/link"
import { FolderTree } from "@/components/folder-tree"
import { FileList } from "@/components/file-list"
import { uploadManager } from "@/lib/upload-manager"
import { UploadProgressPanel } from "@/components/ui/upload-progress-panel"
import { Checkbox } from "@/components/ui/checkbox"

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

  // Folder management state
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [compressBeforeUpload, setCompressBeforeUpload] = useState(false)

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
      } catch { }
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
            } catch { }
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



  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.isArray(files) ? files : Array.from(files)
    if (fileArray.length === 0) return

    // Check if a folder is selected
    if (!selectedFolderId) {
      showToast("Please select a folder first", "error")
      return
    }

    try {
      // Use the new upload manager for background uploads
      await uploadManager.createBatch(
        galleryId,
        selectedFolderId,
        fileArray,
        compressBeforeUpload
      )

      showToast(`Started uploading ${fileArray.length} ${fileArray.length === 1 ? 'photo' : 'photos'}`, 'success')
      
      // Refresh folder after a short delay to show new photos
      setTimeout(() => {
        if (selectedFolderId) {
          handleFolderSelect(selectedFolderId)
        }
      }, 2000)
    } catch (error) {
      showToast("Failed to start upload", "error")
    }
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
                  <CardContent className="space-y-4">
                    {/* Compression Option */}
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <Checkbox
                        id="compress"
                        checked={compressBeforeUpload}
                        onCheckedChange={(checked) => setCompressBeforeUpload(checked as boolean)}
                      />
                      <label
                        htmlFor="compress"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Compress photos before upload (faster upload, 90% quality)
                      </label>
                    </div>

                    {/* Upload Drop Zone */}
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
                      <p className="text-xs text-gray-400 mt-2">Uploads continue in background - you can navigate away</p>
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
                    <FileList
                      folder={selectedFolder}
                      onPhotoDelete={handleDeletePhoto}
                      onFolderSelect={handleFolderSelect}
                      onFolderRename={handleRenameFolder}
                      onFolderDelete={handleDeleteFolder}
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

      {/* Upload Progress Panel - Persists across navigation */}
      <UploadProgressPanel />
    </div>
  )
}