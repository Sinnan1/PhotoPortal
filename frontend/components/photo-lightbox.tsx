"use client"

import React, { useEffect, useState } from "react"
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
    fullResPhotoId: null as string | null, // Track which photo the fullRes belongs to
    currentSrc: photo.thumbnailUrl,
    isLoading: false,
    viewMode: 'high' as 'high' | 'full',
    imageLoaded: false,
    photoId: photo.id // Track photo ID to detect actual photo changes
  })

  // Konami Code Easter Egg - REMOVED
  // const [konamiActivated, setKonamiActivated] = useState(false)
  // const [konamiSequence, setKonamiSequence] = useState<string[]>([])
  // const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']

  // useEffect(() => {
  //   const handleKonamiKeyDown = (e: KeyboardEvent) => {
  //     // Don't interfere with F key or other important shortcuts
  //     if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) return
  //     if (['Escape', 'ArrowLeft', 'ArrowRight', 'q', 'w'].includes(e.key)) return

  //     setKonamiSequence(prev => {
  //       const newSequence = [...prev, e.code].slice(-10)
        
  //       // Check if we just completed the Konami code
  //       if (newSequence.length >= 10 && 
  //           newSequence.slice(-10).every((code, index) => code === konamiCode[index])) {
  //         setKonamiActivated(true)
  //         setImageStates(prevState => ({ ...prevState, viewMode: 'full' }))
  //       }
        
  //       return newSequence
  //     })
  //   }

  //   window.addEventListener('keydown', handleKonamiKeyDown)
  //   return () => window.removeEventListener('keydown', handleKonamiKeyDown)
  // }, []) // Empty dependency array - no recreation needed
  
  const currentIndex = photos.findIndex((p) => p.id === photo.id)
  const isFirst = currentIndex === 0
  const isLast = currentIndex === photos.length - 1

  // Calculate initial like/favorite status - memoized to prevent unnecessary re-renders
  const initialLiked = React.useMemo(() =>
    user ? (photo.likedBy ?? []).some(like => like.userId === user.id) : false,
    [photo.likedBy, user?.id]
  )
  const initialFavorited = React.useMemo(() =>
    user ? (photo.favoritedBy ?? []).some(fav => fav.userId === user.id) : false,
    [photo.favoritedBy, user?.id]
  )

  // Handler for status changes
  const handleStatusChange = (liked: boolean, favorited: boolean) => {
    onPhotoStatusChange?.(photo.id, { liked, favorited })
  }

  // Function to load high quality (2000x2000) - the default for evaluation
  const loadHighQuality = async () => {
    // Prevent loading if already loaded, currently loading, or wrong photo
    if (imageStates.highQuality || imageStates.isLoading || imageStates.photoId !== photo.id) return

    setImageStates(prev => ({ ...prev, isLoading: true }))

    try {
      const highQualityImg = document.createElement('img')

      // Create a promise to handle the image loading properly
      await new Promise((resolve, reject) => {
        highQualityImg.onload = () => resolve(true)
        highQualityImg.onerror = () => reject(new Error('Failed to load high quality image'))

        // Set src after attaching handlers
        highQualityImg.src = photo.largeUrl!
      })

      // Only update state if we're still on the same photo
      setImageStates(prev => {
        // Double-check we're still on the same photo to prevent race conditions
        if (prev.photoId !== photo.id) return prev

        return {
          ...prev,
          highQuality: photo.largeUrl!,
          currentSrc: prev.viewMode === 'high' ? photo.largeUrl! : prev.currentSrc,
          isLoading: false,
          viewMode: prev.viewMode === 'full' ? 'full' : 'high' // Don't change viewMode if in full view
        }
      })
    } catch (error) {
      console.error('Failed to load high quality image:', photo.largeUrl, error)
      setImageStates(prev => ({
        ...prev,
        isLoading: false
      }))
    }
  }

  // Function to toggle full size original (keyboard shortcut: F) - COMPLETELY REWRITTEN
  const toggleFullSize = async () => {
    console.log(`🎯 toggleFullSize called for photo: ${photo.id}`)
    
    // Use functional update to get the most current state
    setImageStates(currentState => {
      console.log(`📊 Current state inside setter:`, {
        viewMode: currentState.viewMode,
        currentPhotoId: photo.id,
        statePhotoId: currentState.photoId,
        fullResPhotoId: currentState.fullResPhotoId,
        hasFullRes: !!currentState.fullRes,
        currentSrc: currentState.currentSrc?.substring(0, 50) + '...'
      })

      // Ensure we're working with the correct photo
      if (currentState.photoId !== photo.id) {
        console.log(`❌ State mismatch! Expected ${photo.id}, got ${currentState.photoId}`)
        return currentState // Don't change anything if photo IDs don't match
      }

      if (currentState.viewMode === 'full') {
        // Switch back to high quality
        const highQualitySrc = currentState.highQuality || photo.largeUrl || photo.mediumUrl || photo.thumbnailUrl
        console.log(`⬇️ Switching back to high quality: ${highQualitySrc}`)
        return {
          ...currentState,
          currentSrc: highQualitySrc,
          viewMode: 'high'
        }
      } else {
        // Check for valid cache using current state
        const hasValidCache = (
          currentState.fullRes &&
          currentState.fullResPhotoId === photo.id &&
          currentState.fullRes === photo.originalUrl &&
          currentState.photoId === photo.id
        )

        if (hasValidCache) {
          console.log(`✅ Using cached full resolution for photo ${photo.id}`)
          return {
            ...currentState,
            currentSrc: photo.originalUrl,
            viewMode: 'full'
          }
        } else {
          console.log(`🔄 Need to load fresh full resolution for photo ${photo.id}`)
          
          // Start loading - set loading state immediately
          const loadingState = {
            ...currentState,
            isLoading: true
          }

          // Start the async load
          const originalImg = document.createElement('img')
          originalImg.onload = () => {
            console.log(`🎉 Successfully loaded full resolution for photo ${photo.id}`)
            setImageStates(prevState => {
              // Double-check we're still on the same photo
              if (prevState.photoId !== photo.id) {
                console.log(`🚫 Photo changed during load, discarding result`)
                return { ...prevState, isLoading: false }
              }
              
              return {
                ...prevState,
                fullRes: photo.originalUrl,
                fullResPhotoId: photo.id,
                currentSrc: photo.originalUrl,
                isLoading: false,
                viewMode: 'full'
              }
            })
          }
          
          originalImg.onerror = () => {
            console.error('❌ Failed to load full size image:', photo.originalUrl)
            setImageStates(prevState => ({
              ...prevState,
              isLoading: false
            }))
          }
          
          originalImg.src = photo.originalUrl

          return loadingState
        }
      }
    })
  }

  useEffect(() => {
    console.log(`📸 Photo changed: ${photo.id}, dataSaver: ${dataSaverMode}`)
    // Reset image states when photo ID changes (navigation to new photo)
    setImageStates(prev => {
      // Check if this is actually a different photo
      if (prev.photoId !== photo.id) {
        // Determine initial quality based on data saver mode
        const initialSrc = dataSaverMode
          ? (photo.mediumUrl || photo.thumbnailUrl)  // Data saver: start with medium
          : (photo.largeUrl || photo.mediumUrl || photo.thumbnailUrl)  // Normal: start with high quality

        console.log(`🔄 Resetting image states for photo: ${photo.id} (was: ${prev.photoId})`)
        console.log(`📊 Previous fullRes state: ${prev.fullRes?.substring(0, 50)}..., fullResPhotoId: ${prev.fullResPhotoId}`)

        // FIXED: Always clear fullRes when navigating to prevent cross-photo contamination
        console.log(`🧹 Clearing ALL cached images for fresh photo navigation`)

        // Reset ALL image states when navigating to a new photo
        return {
          thumbnail: photo.thumbnailUrl,
          highQuality: dataSaverMode ? null : (photo.largeUrl || null),
          fullRes: null, // ALWAYS clear
          fullResPhotoId: null, // ALWAYS clear
          currentSrc: initialSrc,
          isLoading: false,
          viewMode: 'high', // ALWAYS reset to high
          imageLoaded: false,
          photoId: photo.id // Update photo ID
        }
      }
      console.log(`✋ No photo change detected: current ${prev.photoId}, new ${photo.id}`)
      return prev // No change needed
    })
  }, [photo.id, photo.thumbnailUrl, photo.largeUrl, photo.mediumUrl, dataSaverMode])

  // Auto-load high quality image when available (separate from photo change logic)
  useEffect(() => {
    if (!dataSaverMode && photo.largeUrl && imageStates.photoId === photo.id && !imageStates.highQuality && !imageStates.isLoading) {
      loadHighQuality()
    }
  }, [photo.largeUrl, dataSaverMode, imageStates.photoId, imageStates.highQuality, imageStates.isLoading])

  useEffect(() => {
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
  }, [isFirst, isLast, onClose, onNext, onPrevious, photo.originalUrl, dataSaverMode])

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
          
          // FIXED: More conservative preloading to prevent interference
          if (imageStates.viewMode !== 'full' && !imageStates.isLoading) {
            setTimeout(() => {
              console.log(`🔄 Preloading original for adjacent photo: ${adjacentPhoto.id}`)
              const originalImg = document.createElement('img')
              originalImg.src = adjacentPhoto.originalUrl
            }, 2000) // Increased delay to prevent race conditions
          } else {
            console.log(`⏸️ Skipping original preload for ${adjacentPhoto.id} (viewMode: ${imageStates.viewMode}, isLoading: ${imageStates.isLoading})`)
          }
        }
      })
    }
    
    // Only preload if we're not loading the current image and not in full-size mode
    if (!imageStates.isLoading && imageStates.viewMode !== 'full') {
      preloadAdjacent()
    }
  }, [currentIndex, photos, imageStates.isLoading, imageStates.viewMode])

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      {/* Close Button - Modern Design */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white backdrop-blur-md bg-white/10 hover:bg-olive-green/30 border border-white/20 rounded-xl z-10 transition-all duration-300 hover:scale-105"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Like/Favorite Buttons - positioned on right with proper spacing */}
      <div className="absolute top-16 right-4 z-10">
        <PhotoActions 
          key={photo.id}
          photoId={photo.id}
          initialLiked={initialLiked}
          initialFavorited={initialFavorited}
          onStatusChange={handleStatusChange}
          className="flex-col [&>button]:text-white [&>button]:backdrop-blur-md [&>button]:bg-white/10 [&>button]:hover:bg-olive-green/30 [&>button]:border [&>button]:border-white/20 [&>button]:rounded-xl [&>button]:transition-all [&>button]:duration-300 [&>button]:hover:scale-105"
        />
      </div>

      {/* Navigation Buttons - Modern Design */}
      {!isFirst && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white backdrop-blur-md bg-white/10 hover:bg-olive-green/30 border border-white/20 rounded-xl z-10 transition-all duration-300 hover:scale-105"
          onClick={onPrevious}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}

      {!isLast && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white backdrop-blur-md bg-white/10 hover:bg-olive-green/30 border border-white/20 rounded-xl z-10 transition-all duration-300 hover:scale-105"
          onClick={onNext}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      )}

      {/* Download Button - Modern Design */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-20 text-white backdrop-blur-md bg-white/10 hover:bg-olive-green/30 border border-white/20 rounded-xl z-10 transition-all duration-300 hover:scale-105"
        onClick={onDownload}
        aria-label="Download photo"
      >
        <Download className="h-5 w-5" />
      </Button>

      {/* Quality Control Buttons - Modern Glassmorphism Design */}
      <div className="absolute top-4 right-36 flex gap-2 z-10">
        {/* High Quality Button - only show in data saver mode */}
        {dataSaverMode && imageStates.viewMode === 'high' && !imageStates.highQuality && photo.largeUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="text-white backdrop-blur-md bg-white/10 hover:bg-olive-green/30 border border-white/20 rounded-xl px-4 py-2 font-medium transition-all duration-300"
            onClick={loadHighQuality}
            disabled={imageStates.isLoading}
            aria-label="Load high quality (2000x2000)"
          >
            {imageStates.isLoading ? "Loading..." : "High Quality"}
          </Button>
        )}

        {/* Full Size Toggle Button (Keyboard: F) - Premium Styling */}
        <Button
          variant="ghost"
          size="sm"
          className="text-white backdrop-blur-md bg-white/10 hover:bg-olive-green/30 border border-white/20 rounded-xl px-4 py-2 font-medium transition-all duration-300 hover:scale-105"
          onClick={toggleFullSize}
          disabled={imageStates.isLoading}
          aria-label={imageStates.viewMode === 'full' ? "Back to high quality (F)" : "View full size (F)"}
        >
          {imageStates.isLoading ? "Loading..." :
           imageStates.viewMode === 'full' ? "High Quality" : "Full Size (F)"}
        </Button>
      </div>

      {/* Photo Counter and Quality Indicator - Modern Design */}
      <div className="absolute top-4 left-4 text-white z-10">
        <div className="backdrop-blur-md bg-black/30 rounded-xl px-4 py-2 border border-white/10">
          <div className="font-medium text-sm">{currentIndex + 1} of {photos.length}</div>
          <div className="text-xs text-gray-200 mt-1">
            {imageStates.viewMode === 'high' &&
              (dataSaverMode && !imageStates.highQuality
                ? 'Medium Quality (1200px)'
                : 'High Quality (2000px)')}
            {imageStates.viewMode === 'full' && 'Full Size Original'}
          </div>
          {dataSaverMode && (
            <div className="text-xs text-blue-300 font-medium mt-1">Data Saver Mode</div>
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
            className={`max-w-full max-h-full object-contain transition-all duration-500 ease-out ${
              imageStates.imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            }`}
            priority
            unoptimized
            onLoad={() => {
              setImageStates(prev => ({
                ...prev,
                isLoading: false,
                imageLoaded: true
              }))
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
          
          {/* Modern Loading indicator */}
          {imageStates.isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center space-x-3">
                  {/* Modern pulse dots */}
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-white text-sm font-medium">
                    Loading beautiful memories...
                  </span>
                </div>
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

      {/* Photo Info - Modern Design */}
      <div className="absolute bottom-4 left-4 text-white z-10">
        <div className="backdrop-blur-md bg-black/30 rounded-xl px-4 py-2 border border-white/10">
          <p className="font-medium text-sm">{photo.filename}</p>
          <p className="text-gray-200 text-xs mt-1">{new Date(photo.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Keyboard Shortcuts Help - Modern Design */}
      <div className="absolute bottom-4 right-4 text-white text-xs z-10">
        <div className="backdrop-blur-md bg-black/30 rounded-xl px-3 py-2 border border-white/10">
          <p className="opacity-80">Q: Like • W: Favorite • ←→: Navigate • F: Full Size • ESC: Close</p>
        </div>
      </div>

      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  )
}