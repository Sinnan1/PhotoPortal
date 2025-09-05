"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Download, Eye, Trash2, Heart, Star, Folder, ImageIcon, MoreHorizontal, Edit } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Photo {
  id: string
  filename: string
  thumbnailUrl: string
  originalUrl: string
  createdAt: string
  likedBy: { userId: string }[]
  favoritedBy: { userId: string }[]
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

interface FolderGridProps {
  folder: Folder
  isPhotographer: boolean
  onPhotoView: (photo: Photo) => void
  onPhotoDelete?: (photoId: string) => void
  onFolderSelect: (folderId: string) => void
  onFolderRename?: (folderId: string, newName: string) => void
  onFolderDelete?: (folderId: string) => void
  onPhotoStatusChange?: (photoId: string, status: { liked?: boolean; favorited?: boolean }) => void
  onSetCoverPhoto?: (folderId: string, photoId: string) => void
  viewMode?: "grid" | "tile"
}

export function FolderGrid({
  folder,
  isPhotographer,
  onPhotoView,
  onPhotoDelete,
  onFolderSelect,
  onFolderRename,
  onFolderDelete,
  onPhotoStatusChange,
  onSetCoverPhoto,
  viewMode = "grid",
}: FolderGridProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [renderKey, setRenderKey] = useState(0)

  // Force re-render when viewMode changes
  useEffect(() => {
    setRenderKey(prev => prev + 1)
  }, [viewMode])

  const handleDownload = async (photoId: string) => {
    try {
      const photo = (folder.photos || []).find(p => p.id === photoId)
      if (!photo) {
        throw new Error("Photo not found")
      }

      await api.downloadPhotoData(photoId, photo.filename)
    } catch (error) {
      console.error("Download failed", error)
      showToast("Download failed", "error")
    }
  }

  const handleDelete = (photoId: string) => {
    if (onPhotoDelete && confirm("Are you sure you want to delete this photo?")) {
      onPhotoDelete(photoId)
    }
  }

  const handleLikePhoto = async (photoId: string) => {
    try {
      const photo = (folder.photos || []).find((p) => p.id === photoId)
      if (!photo) return

      const isLiked = (photo.likedBy ?? []).some((like) => like.userId === user?.id)

      if (isLiked) {
        await api.unlikePhoto(photoId)
      } else {
        await api.likePhoto(photoId)
      }

      // Notify parent so it can update its source list for filtering
      onPhotoStatusChange?.(photoId, { liked: !isLiked })

    } catch (error) {
      showToast("Failed to update like status", "error")
    }
  }

  const handleFavoritePhoto = async (photoId: string) => {
    try {
      const photo = (folder.photos || []).find((p) => p.id === photoId)
      if (!photo) return

      const isFavorited = (photo.favoritedBy ?? []).some((favorite) => favorite.userId === user?.id)

      if (isFavorited) {
        await api.unfavoritePhoto(photoId)
      } else {
        await api.favoritePhoto(photoId)
      }

      // Notify parent so it can update its source list for filtering
      onPhotoStatusChange?.(photoId, { favorited: !isFavorited })

    } catch (error) {
      showToast("Failed to update favorite status", "error")
    }
  }

  const handleFolderClick = (folderId: string) => {
    onFolderSelect(folderId)
  }

  const handleFolderRename = (folderId: string, currentName: string) => {
    const newName = prompt("Enter new folder name:", currentName)
    if (newName && newName.trim() && newName !== currentName) {
      onFolderRename?.(folderId, newName.trim())
    }
  }

  const handleFolderDelete = (folderId: string, folderName: string) => {
    if (confirm(`Are you sure you want to delete "${folderName}" and all its contents?`)) {
      onFolderDelete?.(folderId)
    }
  }

  const getGridClasses = (itemCount: number) => {
    const baseClasses = "grid gap-3"

    if (itemCount <= 8) {
      return `${baseClasses} grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`
    } else if (itemCount <= 16) {
      return `${baseClasses} grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`
    } else {
      return `${baseClasses} grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7`
    }
  }

  const totalItems = (folder.children || []).length + (folder.photos || []).length

  return (
    <div className={getGridClasses(totalItems)}>
      {/* Render Subfolders First */}
      {(folder.children || []).map((subfolder) => (
        <div
          key={`folder-${subfolder?.id || 'unknown'}`}
          className={`group relative ${
            viewMode === "tile"
              ? "aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-md hover:shadow-[#425146]/10 transition-all duration-200 cursor-pointer hover:scale-[1.01]"
              : "aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-md hover:shadow-[#425146]/10 transition-all duration-200 cursor-pointer hover:scale-[1.01]"
          }`}
          onClick={() => handleFolderClick(subfolder?.id)}
        >
          {/* Folder Icon Overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <Folder className="w-16 h-16 text-[#425146] mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate px-4">
                {subfolder?.name || 'Unnamed Folder'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {subfolder?._count?.photos ?? 0} photos
              </p>
            </div>
          </div>

          {/* Cover Photo Background (if available) */}
          {subfolder?.coverPhoto && (
            <div className="absolute inset-0 opacity-20">
              <Image
                src={subfolder.coverPhoto.thumbnailUrl}
                alt={subfolder.coverPhoto.filename}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Actions Menu for Photographers */}
          {isPhotographer && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/50 hover:bg-black/70 text-white h-8 w-8 p-0 z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleFolderRename(subfolder?.id, subfolder?.name || 'Unnamed Folder')}>
                  <Edit className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                {subfolder?.coverPhoto && onSetCoverPhoto && (
                  <DropdownMenuItem onClick={() => onSetCoverPhoto(subfolder.id, '')}>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Remove Cover Photo
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => handleFolderDelete(subfolder?.id, subfolder?.name || 'Unnamed Folder')}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ))}

      {/* Render Photos */}
      {(folder.photos || []).map((photo) => (
        <div
          key={`photo-${photo.id}`}
          className={`group relative ${
            viewMode === "tile"
              ? "aspect-[16/9] bg-card rounded-lg overflow-hidden border border-border shadow-sm hover:shadow-lg hover:shadow-[#425146]/10 transition-all duration-200 hover:scale-[1.01]"
              : "aspect-square bg-card rounded-lg overflow-hidden border border-border shadow-sm hover:shadow-lg hover:shadow-[#425146]/10 transition-all duration-200 hover:scale-[1.01]"
          }`}
        >
          <Image
            src={photo.thumbnailUrl || "/placeholder.svg"}
            alt={photo.filename}
            fill
            className={`object-cover cursor-pointer transition-all duration-500 ease-out ${
              loadedImages.has(photo.id)
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-105'
            } group-hover:scale-105`}
            onClick={() => onPhotoView(photo)}
            onLoad={() => {
              setLoadedImages(prev => new Set([...prev, photo.id]))
            }}
            onError={() => {
              setLoadedImages(prev => new Set([...prev, photo.id]))
            }}
          />

          {/* Action overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all flex items-end justify-center pb-2">
            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="secondary"
                className="backdrop-blur-sm bg-white/80 hover:bg-white h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onPhotoView(photo)
                }}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>

              <Button
                size="sm"
                className="backdrop-blur-sm h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(photo.id)
                }}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>

              {isPhotographer && onSetCoverPhoto && (
                <Button
                  size="sm"
                  variant="outline"
                  className="backdrop-blur-sm bg-white/80 hover:bg-white h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSetCoverPhoto(folder.id, photo.id)
                  }}
                  title="Set as cover photo"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </Button>
              )}

              {isPhotographer && onPhotoDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="backdrop-blur-sm h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(photo.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Like/Favorite buttons */}
          <div className="absolute top-1.5 left-1.5 flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="text-white backdrop-blur-sm bg-black/20 hover:bg-black/30 h-6 w-6 p-0 transition-all duration-200"
              onClick={(e) => {
                e.stopPropagation()
                handleLikePhoto(photo.id)
              }}
            >
              <Heart
                className={`h-3 w-3 ${(photo.likedBy ?? []).some((like) => like.userId === user?.id) ? "text-red-500 fill-current" : ""}`}
              />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white backdrop-blur-sm bg-black/20 hover:bg-black/30 h-6 w-6 p-0 transition-all duration-200"
              onClick={(e) => {
                e.stopPropagation()
                handleFavoritePhoto(photo.id)
              }}
            >
              <Star
                className={`h-3 w-3 ${(photo.favoritedBy ?? []).some((fav) => fav.userId === user?.id) ? "text-yellow-500 fill-current" : ""}`}
              />
            </Button>
          </div>
        </div>
      ))}

      {/* Empty State */}
      {totalItems === 0 && (
        <div className="col-span-full text-center py-12">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium">
            This folder is empty
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPhotographer ? "Upload photos or create subfolders to get started." : "No photos available in this folder."}
          </p>
        </div>
      )}
    </div>
  )
}
