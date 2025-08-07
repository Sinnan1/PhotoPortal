"use client"

import { useEffect } from "react"
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
  const currentIndex = photos.findIndex((p) => p.id === photo.id)
  const isFirst = currentIndex === 0
  const isLast = currentIndex === photos.length - 1

  useEffect(() => {
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
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [isFirst, isLast, onClose, onNext, onPrevious])

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

      {/* Like/Favorite Buttons */}
      <div className="absolute top-4 right-20 z-10">
        <PhotoActions photoId={photo.id} />
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

      {/* Download Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-16 text-white hover:bg-white hover:bg-opacity-20 z-10"
        onClick={onDownload}
      >
        <Download className="h-6 w-6" />
      </Button>

      {/* Photo Counter */}
      <div className="absolute top-4 left-4 text-white text-sm z-10">
        {currentIndex + 1} of {photos.length}
      </div>

      {/* Main Image */}
      <div className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center">
        <Image
          src={photo.originalUrl || "/placeholder.svg"}
          alt={photo.filename}
          width={1200}
          height={800}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="max-w-full max-h-full object-contain"
          priority
          onError={(e) => {
            console.error('Lightbox image failed to load:', photo.originalUrl);
            // Fallback to placeholder
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder.svg";
          }}
        />
      </div>

      {/* Photo Info */}
      <div className="absolute bottom-4 left-4 text-white text-sm z-10">
        <p className="font-medium">{photo.filename}</p>
        <p className="text-gray-300">{new Date(photo.createdAt).toLocaleDateString()}</p>
      </div>

      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  )
}
