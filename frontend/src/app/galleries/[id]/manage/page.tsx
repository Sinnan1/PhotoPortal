"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Save, ArrowLeft, Images, Settings, Loader2, Folder, FileSpreadsheet, Heart, Star, Eye, FolderPlus, Search, Calendar, Lock, Download as DownloadIcon } from "lucide-react"
import Link from "next/link"
import { FolderTree } from "@/components/folder-tree"
import { FileList } from "@/components/file-list"
import { uploadManager } from "@/lib/upload-manager"
import { UploadProgressPanel } from "@/components/ui/upload-progress-panel"
import { Checkbox } from "@/components/ui/checkbox"
import { uploadFileToB2 } from '@/lib/uploadUtils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

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

  // Search state
  const [searchQuery, setSearchQuery] = useState("")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    password: "",
    expiresAt: "",
    downloadLimit: "",
  })

  // Excel export state
  const [photoStats, setPhotoStats] = useState<{ likedCount: number; favoritedCount: number } | null>(null)
  const [isExportingLiked, setIsExportingLiked] = useState(false)
  const [isExportingFavorited, setIsExportingFavorited] = useState(false)

  // CSV export state
  const [isExportingLikedCSV, setIsExportingLikedCSV] = useState(false)
  const [isExportingFavoritedCSV, setIsExportingFavoritedCSV] = useState(false)



  useEffect(() => {
    if (user?.role === "PHOTOGRAPHER") {
      fetchGallery()
      fetchPhotoStats()
    }
  }, [user, galleryId])

  const fetchPhotoStats = async () => {
    try {
      const response = await api.getGalleryPhotoStats(galleryId)
      setPhotoStats({
        likedCount: response.data.likedCount,
        favoritedCount: response.data.favoritedCount
      })
    } catch (error) {
      console.error("Failed to load photo stats:", error)
    }
  }

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

      // Set up polling to refresh folder when uploads complete
      const checkInterval = setInterval(async () => {
        const batches = uploadManager.getAllBatches()
        const hasActiveUploads = batches.some(b =>
          b.files.some(f => f.status === 'queued' || f.status === 'uploading')
        )

        if (!hasActiveUploads && selectedFolderId) {
          clearInterval(checkInterval)
          // Refresh folder to show new photos
          const response = await api.getFolder(selectedFolderId)
          setSelectedFolder(response.data)
        }
      }, 2000)

      // Clear interval after 5 minutes to prevent memory leaks
      setTimeout(() => clearInterval(checkInterval), 300000)
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

  const handleExportToExcel = async (filterType: 'liked' | 'favorited') => {
    const setExporting = filterType === 'liked' ? setIsExportingLiked : setIsExportingFavorited

    setExporting(true)
    try {
      const exportFunc = filterType === 'liked'
        ? api.exportLikedPhotosToExcel
        : api.exportFavoritedPhotosToExcel

      const { blob, filename } = await exportFunc(galleryId)

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      showToast(`Excel file downloaded: ${filename}`, "success")
    } catch (error) {
      console.error("Failed to export to Excel:", error)
      showToast("Failed to export to Excel", "error")
    } finally {
      setExporting(false)
    }
  }

  const handleExportToCSV = async (filterType: 'liked' | 'favorited') => {
    const setExporting = filterType === 'liked' ? setIsExportingLikedCSV : setIsExportingFavoritedCSV

    setExporting(true)
    try {
      const exportFunc = filterType === 'liked'
        ? api.exportLikedPhotosToCSV
        : api.exportFavoritedPhotosToCSV

      const { blob, filename } = await exportFunc(galleryId)

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      showToast(`CSV file downloaded: ${filename}`, "success")
    } catch (error) {
      console.error("Failed to export to CSV:", error)
      showToast("Failed to export to CSV", "error")
    } finally {
      setExporting(false)
    }
  }



  if (user?.role !== "PHOTOGRAPHER") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground mt-2">This page is only available to photographers.</p>
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
          <h1 className="text-2xl font-bold">Gallery Not Found</h1>
          <p className="text-muted-foreground mt-2">The gallery you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Modern Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-1">Manage Gallery</h1>
            <p className="text-muted-foreground text-lg">{gallery?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm px-4 py-2">
            <Images className="h-4 w-4 mr-2" />
            {gallery?.folders?.reduce((sum, folder) => sum + (folder?._count?.photos ?? 0), 0) ?? 0} photos
          </Badge>
          <Link href={`/gallery/${gallery.id}?refresh=${Date.now()}`}>
            <Button variant="outline" size="lg">
              <Eye className="h-4 w-4 mr-2" />
              View Gallery
            </Button>
          </Link>
        </div>
      </div>

      {/* Modern Tabs */}
      <Tabs defaultValue="photos" className="space-y-8">
        <TabsList className="bg-card border p-1">
          <TabsTrigger value="photos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2.5">
            <Images className="h-4 w-4 mr-2" />
            Photos
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2.5">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Modern Sidebar - Folders */}
            <Card className="lg:col-span-1 h-fit">
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

            {/* Main Content - Upload & Photos */}
            <div className="lg:col-span-3 space-y-6">
              {/* Modern Upload Area */}
              {selectedFolder && (
                <Card>
                  <CardContent className="p-8">
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold mb-1">Upload to "{selectedFolder.name}"</h3>
                      <p className="text-sm text-muted-foreground">Add new photos to this folder. Supported formats: JPG, PNG, WEBP</p>
                    </div>

                    <label
                      className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-xl p-12 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-all group"
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
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                        <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-lg font-medium mb-2">Drop photos here or click to browse</p>
                      <p className="text-sm text-muted-foreground mb-1">You can upload multiple photos at once</p>
                      <p className="text-xs text-muted-foreground">Uploads continue in background - you can navigate away</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleFileUpload(e.target.files)
                          }
                        }}
                      />
                    </label>

                    <div className="mt-4 flex items-center gap-2 text-sm">
                      <Checkbox
                        id="compress"
                        checked={compressBeforeUpload}
                        onCheckedChange={(checked) => setCompressBeforeUpload(checked as boolean)}
                      />
                      <label htmlFor="compress" className="text-muted-foreground cursor-pointer">
                        Compress photos before upload (faster upload, 90% quality)
                      </label>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Modern Photos List */}
              {selectedFolder ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">Photos</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedFolder?._count?.photos ?? 0} photos • {selectedFolder?._count?.children ?? 0} subfolders
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {photoStats && photoStats.likedCount > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isExportingLiked || isExportingLikedCSV}
                              >
                                {isExportingLiked || isExportingLikedCSV ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Heart className="h-4 w-4 mr-2 text-red-500" />
                                )}
                                Export Liked ({photoStats.likedCount})
                                <ChevronDown className="h-4 w-4 ml-2" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleExportToExcel('liked')}>
                                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                                as Excel
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExportToCSV('liked')}>
                                <FileSpreadsheet className="h-4 w-4 mr-2 text-blue-600" />
                                as CSV
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {photoStats && photoStats.favoritedCount > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isExportingFavorited || isExportingFavoritedCSV}
                              >
                                {isExportingFavorited || isExportingFavoritedCSV ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Star className="h-4 w-4 mr-2 text-yellow-500" />
                                )}
                                Export Starred ({photoStats.favoritedCount})
                                <ChevronDown className="h-4 w-4 ml-2" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleExportToExcel('favorited')}>
                                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                                as Excel
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExportToCSV('favorited')}>
                                <FileSpreadsheet className="h-4 w-4 mr-2 text-blue-600" />
                                as CSV
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {/* Search */}
                    <div className="relative mb-6">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search photos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11"
                      />
                    </div>

                    {/* File List */}
                    <FileList
                      folder={{
                        ...selectedFolder,
                        photos: searchQuery
                          ? selectedFolder.photos.filter(photo =>
                            photo.filename.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          : selectedFolder.photos
                      }}
                      onPhotoDelete={handleDeletePhoto}
                      onFolderSelect={handleFolderSelect}
                      onFolderRename={handleRenameFolder}
                      onFolderDelete={handleDeleteFolder}
                    />
                    {searchQuery && selectedFolder.photos.filter(photo =>
                      photo.filename.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No photos found matching "{searchQuery}"
                        </div>
                      )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6">
                      <Folder className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Select a Folder</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      Choose a folder from the sidebar to view and manage its contents.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Modern Settings Tab */}
        <TabsContent value="settings">
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-2">Gallery Settings</h2>
                  <p className="text-muted-foreground">Update gallery information and access settings</p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {/* Gallery Title */}
                  <div>
                    <Label htmlFor="title" className="block text-sm font-medium mb-2">Gallery Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="h-11"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description" className="block text-sm font-medium mb-2">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter gallery description"
                      className="min-h-[120px] resize-none"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <Label htmlFor="password" className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Password Protection
                    </Label>
                    <PasswordInput
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Set a password for this gallery (optional)"
                      className="h-11"
                    />
                    <p className="text-sm text-muted-foreground mt-2">Leave empty to make gallery publicly accessible</p>
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <Label htmlFor="expiresAt" className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Expiry Date
                    </Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      className="h-11"
                    />
                    <p className="text-sm text-muted-foreground mt-2">Leave empty for no expiry date</p>
                  </div>

                  {/* Download Limit */}
                  <div>
                    <Label htmlFor="downloadLimit" className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <DownloadIcon className="h-4 w-4" />
                      Download Limit
                    </Label>
                    <Input
                      id="downloadLimit"
                      type="number"
                      value={formData.downloadLimit}
                      onChange={(e) => setFormData({ ...formData, downloadLimit: e.target.value })}
                      className="h-11"
                      min="0"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-muted-foreground">Set maximum number of downloads (0 = unlimited)</p>
                      <p className="text-sm text-muted-foreground">Current: <span className="font-medium">{gallery?.downloadCount ?? 0}</span></p>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4">
                    <Button type="submit" size="lg" disabled={saving} className="w-full sm:w-auto">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Progress Panel - Persists across navigation */}
      <UploadProgressPanel />
    </div>
  )
}