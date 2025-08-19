"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react"
import { PhotoActions } from "./photo-actions"

interface Photo {
  id: string
  filename: string
  thumbnailUrl: string
  originalUrl: string
  createdAt: string
}

interface PhotoLightboxProps {
  photo: Photo
  photos: Photo[]
  onClose: () => void
  onNext: () => void
  onPrevious: () => void
  onDownload: () => void
}

export function PhotoLightbox({ photo, photos, onClose, onNext, onPrevious, onDownload }: PhotoLightboxProps) {
  const [imageStates, setImageStates] = useState({
    thumbnail: photo.thumbnailUrl,
    medium: null as string | null,
    highRes: null as string | null,
    currentSrc: photo.thumbnailUrl,
    isLoading: true
  })
  const currentIndex = photos.findIndex((p) => p.id === photo.id)
  const isFirst = currentIndex === 0
  const isLast = currentIndex === photos.length - 1

  useEffect(() => {
    // Reset and load new photo with progressive enhancement
    setImageStates({
      thumbnail: photo.thumbnailUrl,
      medium: null,
      highRes: null,
      currentSrc: photo.thumbnailUrl,
      isLoading: true
    })

    // Progressive loading: thumbnail -> medium -> high-res
    const loadProgressive = async () => {
      try {
        // Try to load medium quality first (faster)
        const mediumUrl = photo.originalUrl.replace('/original/', '/medium/') || photo.originalUrl
        const mediumImg = document.createElement('img')
        
        mediumImg.onload = () => {
          setImageStates(prev => ({
            ...prev,
            medium: mediumUrl,
            currentSrc: mediumUrl,
            isLoading: false
          }))
          
          // Then load high-res in background
          const highResImg = document.createElement('img')
          highResImg.onload = () => {
            setImageStates(prev => ({
              ...prev,
              highRes: photo.originalUrl,
              currentSrc: photo.originalUrl
            }))
          }
          highResImg.onerror = () => {
            // If high-res fails, stick with medium
            console.warn('High-res image failed to load:', photo.originalUrl)
          }
          highResImg.src = photo.originalUrl
        }
        
        mediumImg.onerror = () => {
          // If medium fails, load original directly
          const originalImg = document.createElement('img')
          originalImg.onload = () => {
            setImageStates(prev => ({
              ...prev,
              currentSrc: photo.originalUrl,
              isLoading: false
            }))
          }
          originalImg.onerror = () => {
            // Last resort: keep thumbnail
            setImageStates(prev => ({ ...prev, isLoading: false }))
          }
          originalImg.src = photo.originalUrl
        }
        
        mediumImg.src = mediumUrl
      } catch (error) {
        console.error('Error loading image:', error)
        setImageStates(prev => ({ ...prev, isLoading: false }))
      }
    }

    loadProgressive()

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose()
          break
        case "ArrowLeft":
          if (!isFirst) onPrevious()
          break
        case "ArrowRight":
          if (!isLast) onNext()
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
          photoId={photo.id} 
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
        className="absolute top-4 right-16 text-white hover:bg-white hover:bg-opacity-20 z-10"
        onClick={onDownload}
        aria-label="Download photo"
      >
        <Download className="h-6 w-6" />
      </Button>

      {/* Photo Counter */}
      <div className="absolute top-4 left-4 text-white text-sm z-10">
        {currentIndex + 1} of {photos.length}
      </div>

      {/* Main Image */}
      <div className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src={imageStates.currentSrc || "/placeholder.svg"}
            alt={photo.filename}
            width={1200}
            height={800}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
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