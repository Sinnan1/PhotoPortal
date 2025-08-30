"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react"
import { PhotoActions } from "./photo-actions"
import { useAuth } from "@/lib/auth-context"

interface Photo {
  id: string
  filename: string
  thumbnailUrl: string
  mediumUrl?: string
  largeUrl?: string
  originalUrl: string
  createdAt: string
  likedBy: { userId: string }[]
  favoritedBy: { userId: string }[]
}

interface PhotoLightboxProps {
  photo: Photo
  photos: Photo[]
  onClose: () => void
  onNext: () => void
  onPrevious: () => void
  onDownload: () => void
  onPhotoStatusChange?: (photoId: string, status: { liked?: boolean; favorited?: boolean }) => void
  dataSaverMode?: boolean
}

export function PhotoLightbox({ photo, photos, onClose, onNext, onPrevious, onDownload, onPhotoStatusChange, dataSaverMode = false }: PhotoLightboxProps) {
  const { user } = useAuth()
  const [imageStates, setImageStates] = useState({
    thumbnail: photo.thumbnailUrl,
    highQuality: null as string | null,
    fullRes: null as string | null,
    currentSrc: photo.thumbnailUrl,
    isLoading: false,
    viewMode: 'high' as 'high' | 'full'
  })
  const currentIndex = photos.findIndex((p) => p.id === photo.id)
  const isFirst = currentIndex === 0
  const isLast = currentIndex === photos.length - 1

  // Calculate initial like/favorite status - recalculate when photo changes
  const initialLiked = user ? (photo.likedBy ?? []).some(like => like.userId === user.id) : false
  const initialFavorited = user ? (photo.favoritedBy ?? []).some(fav => fav.userId === user.id) : false

  // Handler for status changes
  const handleStatusChange = (liked: boolean, favorited: boolean) => {
    onPhotoStatusChange?.(photo.id, { liked, favorited })
  }

  // Function to load high quality (2000x2000) - the default for evaluation
  const loadHighQuality = async () => {
    if (imageStates.highQuality || imageStates.isLoading) return
    
    setImageStates(prev => ({ ...prev, isLoading: true }))
    
    const highQualityImg = document.createElement('img')
    highQualityImg.onload = () => {
      setImageStates(prev => ({
        ...prev,
        highQuality: photo.largeUrl!,
        currentSrc: photo.largeUrl!,
        isLoading: false,
        viewMode: 'high'
      }))
    }
    highQualityImg.onerror = () => {
      setImageStates(prev => ({ ...prev, isLoading: false }))
      console.error('Failed to load high quality image:', photo.largeUrl)
    }
    highQualityImg.src = photo.largeUrl!
  }

  // Function to toggle full size original (keyboard shortcut: F)
  const toggleFullSize = async () => {
    if (imageStates.viewMode === 'full') {
      // Switch back to high quality
      const highQualitySrc = imageStates.highQuality || photo.largeUrl || photo.mediumUrl || photo.thumbnailUrl
      setImageStates(prev => ({
        ...prev,
        currentSrc: highQualitySrc,
        viewMode: 'high'
      }))
    } else {
      // Load full size
      if (imageStates.fullRes) {
        setImageStates(prev => ({
          ...prev,
          currentSrc: imageStates.fullRes!,
          viewMode: 'full'
        }))
      } else {
        setImageStates(prev => ({ ...prev, isLoading: true }))
        
        const originalImg = document.createElement('img')
        originalImg.onload = () => {
          setImageStates(prev => ({
            ...prev,
            fullRes: photo.originalUrl,
            currentSrc: photo.originalUrl,
            isLoading: false,
            viewMode: 'full'
          }))
        }
        originalImg.onerror = () => {
          setImageStates(prev => ({ ...prev, isLoading: false }))
          console.error('Failed to load full size image:', photo.originalUrl)
        }
        originalImg.src = photo.originalUrl
      }
    }
  }

  useEffect(() => {
    // Determine initial quality based on data saver mode
    const initialSrc = dataSaverMode 
      ? (photo.mediumUrl || photo.thumbnailUrl)  // Data saver: start with medium
      : (photo.largeUrl || photo.mediumUrl || photo.thumbnailUrl)  // Normal: start with high quality
    
    // Reset image states when photo changes
    setImageStates({
      thumbnail: photo.thumbnailUrl,
      highQuality: dataSaverMode ? null : (photo.largeUrl || null),
      fullRes: null,
      currentSrc: initialSrc,
      isLoading: false,
      viewMode: 'high'
    })

    // Auto-load high quality if not in data saver mode
    if (!dataSaverMode && photo.largeUrl && !imageStates.highQuality) {
      loadHighQuality()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case "escape":
          onClose()
          break
        case "arrowleft":
          if (!isFirst) onPrevious()
          break
        case "arrowright":
          if (!isLast) onNext()
          break
        case "f":
          toggleFullSize()
          break
        case "q":
        case "Q":
          // Trigger like action
          document.querySelector('[data-action="like"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          break
        case "w":
        case "W":
          // Trigger favorite action
          document.querySelector('[data-action="favorite"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [isFirst, isLast, onClose, onNext, onPrevious, photo.originalUrl])

  // Preload adjacent photos for instant navigation
  useEffect(() => {
    const preloadAdjacent = () => {
      [-1, 1].forEach(offset => {
        const adjacentIndex = currentIndex + offset
        if (adjacentIndex >= 0 && adjacentIndex < photos.length) {
          const adjacentPhoto = photos[adjacentIndex]
          // Preload both medium and original quality
          const mediumUrl = adjacentPhoto.originalUrl.replace('/original/', '/medium/') || adjacentPhoto.originalUrl
          
          // Preload medium quality
          const mediumImg = document.createElement('img')
          mediumImg.src = mediumUrl
          
          // Preload original quality (lower priority)
          setTimeout(() => {
            const originalImg = document.createElement('img')
            originalImg.src = adjacentPhoto.originalUrl
          }, 500)
        }
      })
    }
    
    // Only preload if we're not loading the current image
    if (!imageStates.isLoading) {
      preloadAdjacent()
    }
  }, [currentIndex, photos, imageStates.isLoading])

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 z-10"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Like/Favorite Buttons - positioned on right with proper spacing */}
      <div className="absolute top-16 right-4 z-10">
        <PhotoActions 
          key={photo.id}
          photoId={photo.id}
          initialLiked={initialLiked}
          initialFavorited={initialFavorited}
          onStatusChange={handleStatusChange}
          className="flex-col [&>button]:text-white [&>button]:backdrop-blur-sm [&>button]:bg-black/30 [&>button]:hover:bg-black/50 [&>button]:border-white/20"
        />
      </div>

      {/* Navigation Buttons */}
      {!isFirst && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white hover:bg-opacity-20 z-10"
          onClick={onPrevious}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {!isLast && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white hover:bg-opacity-20 z-10"
          onClick={onNext}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {/* Download Button - moved to give more space */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-24 text-white hover:bg-white hover:bg-opacity-20 z-10"
        onClick={onDownload}
        aria-label="Download photo"
      >
        <Download className="h-6 w-6" />
      </Button>

      {/* Quality Control Buttons - Simplified for Wedding Photography */}
      <div className="absolute top-4 right-36 flex gap-2 z-10">
        {/* High Quality Button - only show in data saver mode */}
        {dataSaverMode && imageStates.viewMode === 'high' && !imageStates.highQuality && photo.largeUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white hover:bg-opacity-20"
            onClick={loadHighQuality}
            disabled={imageStates.isLoading}
            aria-label="Load high quality (2000x2000)"
          >
            {imageStates.isLoading ? "Loading..." : "High Quality"}
          </Button>
        )}

        {/* Full Size Toggle Button (Keyboard: F) */}
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white hover:bg-opacity-20"
          onClick={toggleFullSize}
          disabled={imageStates.isLoading}
          aria-label={imageStates.viewMode === 'full' ? "Back to high quality (F)" : "View full size (F)"}
        >
          {imageStates.isLoading ? "Loading..." : 
           imageStates.viewMode === 'full' ? "High Quality" : "Full Size (F)"}
        </Button>
      </div>

      {/* Photo Counter and Quality Indicator */}
      <div className="absolute top-4 left-4 text-white text-sm z-10">
        <div>{currentIndex + 1} of {photos.length}</div>
        <div className="text-xs text-gray-300 mt-1">
          {imageStates.viewMode === 'high' && 
            (dataSaverMode && !imageStates.highQuality 
              ? 'Medium Quality (1200px)' 
              : 'High Quality (2000px)')}
          {imageStates.viewMode === 'full' && 'Full Size Original'}
          {dataSaverMode && (
            <div className="text-xs text-blue-300">Data Saver Mode</div>
          )}
        </div>
      </div>

      {/* Main Image */}
      <div className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src={imageStates.currentSrc || "/placeholder.svg"}
            alt={photo.filename}
            width={2000}
            height={2000}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
            className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
              imageStates.isLoading ? 'opacity-50' : 'opacity-100'
            }`}
            priority
            unoptimized
            onLoad={() => {
              setImageStates(prev => ({ ...prev, isLoading: false }))
            }}
            onError={() => {
              console.error('Lightbox image failed to load:', imageStates.currentSrc)
              setImageStates(prev => ({
                ...prev,
                currentSrc: '/placeholder.svg',
                isLoading: false
              }))
            }}
          />
          
          {/* Loading indicator */}
          {imageStates.isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/50 rounded-lg p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            </div>
          )}
          
          {/* Quality indicator */}
          {imageStates.currentSrc === imageStates.thumbnail && !imageStates.isLoading && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              Preview Quality
            </div>
          )}
        </div>
      </div>

      {/* Photo Info */}
      <div className="absolute bottom-4 left-4 text-white text-sm z-10">
        <p className="font-medium">{photo.filename}</p>
        <p className="text-gray-300">{new Date(photo.createdAt).toLocaleDateString()}</p>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="absolute bottom-4 right-4 text-white text-xs z-10 opacity-60">
        <p>Q: Like • W: Favorite • ←→: Navigate • ESC: Close</p>
      </div>

      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  )
}