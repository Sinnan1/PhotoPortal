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
import { Upload, Trash2, Save, ArrowLeft, Images, Settings, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface Photo {
  id: string
  filename: string
  thumbnailUrl: string
  originalUrl: string
  createdAt: string
}

interface Gallery {
  id: string
  title: string
  description: string
  password: string | null
  expiresAt: string | null
  downloadLimit: number | null
  downloadCount: number
  photos: Photo[]
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

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return

    setUploading(true)
    const formData = new FormData()

    Array.from(files).forEach((file) => {
      formData.append("photos", file)
      setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }))
    })

    try {
      await api.uploadPhotos(galleryId, formData)
      showToast(`Successfully uploaded ${files.length} photos`, "success")
      fetchGallery()
      setUploadProgress({})
    } catch (error) {
      showToast("Failed to upload photos", "error")
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return

    try {
      await api.deletePhoto(photoId)
      showToast("Photo deleted successfully", "success")
      fetchGallery()
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
            <p className="text-gray-600">{gallery.title}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">{gallery.photos.length} photos</Badge>
          <Link href={`/gallery/${gallery.id}`}>
            <Button variant="outline">View Gallery</Button>
          </Link>
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
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Photos</CardTitle>
              <CardDescription>Add new photos to this gallery. Supported formats: JPG, PNG, WEBP</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault()
                  const files = e.dataTransfer.files
                  if (files.length > 0) {
                    handleFileUpload(files)
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
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Uploading photos...</p>
                  {Object.entries(uploadProgress).map(([filename, progress]) => (
                    <div key={filename} className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 flex-1 truncate">{filename}</span>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photos Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Gallery Photos ({gallery.photos.length})</CardTitle>
              <CardDescription>Manage the photos in this gallery</CardDescription>
            </CardHeader>
            <CardContent>
              {gallery.photos.length === 0 ? (
                <div className="text-center py-12">
                  <Images className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No photos yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Upload some photos to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {gallery.photos.map((photo) => (
                    <div key={photo.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={photo.thumbnailUrl || "/placeholder.svg"}
                        alt={photo.filename}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="truncate">{photo.filename}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
                  <p className="text-sm text-gray-500">Current downloads: {gallery.downloadCount}</p>
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
    </div>
  )
}
