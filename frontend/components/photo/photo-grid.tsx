// src/components/photo-grid.tsx
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, Eye, Trash2, Heart, Star, Share2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { Photo } from "@/types";
import { usePhotoActions } from "@/hooks/usePhotoActions";
import { useImagePreload } from "@/hooks/useImagePreload";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface PhotoGridProps {
  photos: Photo[];
  galleryId?: string;
  isAdmin?: boolean;
  onDelete?: (photoId: string) => void;
  onView?: (photo: Photo) => void;
  onDownload?: (photoId: string) => void;
  onUnpost?: (photoId: string) => void;
  onPhotoStatusChange?: (photoId: string, status: { liked?: boolean; favorited?: boolean }) => void;
  columns?: {
    sm: number;
    md: number;
    lg: number;
    xl?: number;
  };
  viewMode?: "grid" | "tile";
  className?: string;
  lastPhotoElementRef?: (node: HTMLDivElement) => void;
}

// Skeleton loader component for gold/beige aesthetic
function PhotoSkeleton() {
  return (
    <div className="relative aspect-square bg-muted rounded-xl overflow-hidden border border-border">
      {/* Main image area */}
      <div className="w-full h-4/5 bg-gradient-to-br from-muted via-background to-muted animate-pulse">
        {/* Subtle shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer"></div>
      </div>

      {/* Action area */}
      <div className="absolute bottom-0 left-0 right-0 h-1/5 bg-muted/50 border-t border-border">
        <div className="flex items-center justify-center h-full gap-2">
          <div className="w-8 h-8 bg-muted-foreground/30 rounded-lg animate-pulse"></div>
          <div className="w-8 h-8 bg-muted-foreground/30 rounded-lg animate-pulse"></div>
          <div className="w-8 h-8 bg-muted-foreground/30 rounded-lg animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

export function PhotoGrid({
  photos,
  galleryId,
  isAdmin = false,
  onDelete,
  onView,
  onDownload,
  onUnpost,
  onPhotoStatusChange,
  columns = { sm: 3, md: 4, lg: 5, xl: 6 },
  viewMode = "grid",
  className = "",
  lastPhotoElementRef,
  loading = false,
}: PhotoGridProps & { loading?: boolean }) {
  const { user } = useAuth();

  const {
    handleLikePhoto,
    handleFavoritePhoto,
    handleDeletePhoto
  } = usePhotoActions({
    photos,
    onPhotoStatusChange,
    onDelete
  });

  const { loadedImages, handleImageLoad } = useImagePreload();
  const { konamiActivated } = useKeyboardShortcuts();

  const handleDownloadClick = (photoId: string) => {
    if (onDownload) {
      onDownload(photoId);
    }
  };

  const getGridClasses = () => {
    const baseClasses = "grid gap-3";
    const responsiveClasses = [
      "grid-cols-1",
      `sm:grid-cols-${columns.sm}`,
      `md:grid-cols-${columns.md}`,
      `lg:grid-cols-${columns.lg}`,
      columns.xl ? `xl:grid-cols-${columns.xl}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    return `${baseClasses} ${responsiveClasses} ${className}`;
  };

  const getSizes = () => {
    const breakpoints = [
      "(max-width: 640px) 100vw",
      `(max-width: 768px) ${100 / columns.sm}vw`,
      `(max-width: 1024px) ${100 / columns.md}vw`,
      columns.xl
        ? `(max-width: 1280px) ${100 / columns.lg}vw, ${100 / columns.xl}vw`
        : `${100 / columns.lg}vw`,
    ];
    return breakpoints.join(", ");
  };

  if (loading && photos.length === 0) {
    // Show skeleton loaders when loading
    return (
      <div className={getGridClasses()}>
        {Array.from({ length: 12 }).map((_, index) => (
          <PhotoSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <Eye className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No photos yet
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Photos will appear here once uploaded.
        </p>
      </div>
    );
  }

  return (
    <div className={getGridClasses()}>
      {photos.map((photo, index) => {
        const isLastPhoto = index === photos.length - 1;

        // Debug: Check if postBy data exists
        const isPosted = (photo.postBy ?? []).some((post) => post.userId === user?.id);

        return (
          <div
            key={photo.id}
            ref={isLastPhoto ? lastPhotoElementRef : undefined}
            className={`photo-grid-item group relative ${viewMode === "tile"
              ? "aspect-[16/9] bg-card rounded-lg overflow-hidden border border-border shadow-sm hover:shadow-lg hover:border-olive-green/20 transition-all duration-200"
              : "aspect-square bg-card rounded-lg overflow-hidden border border-border shadow-sm hover:shadow-lg hover:border-olive-green/20 transition-all duration-200"
              } ${konamiActivated ? 'konami-code' : ''
              } ${index === 3 ? 'wedding-joke' : '' // Add wedding joke to 4th photo
              } ${index === 7 ? 'secret-joke' : '' // Add secret joke to 8th photo
              }`}
          >
            <Image
              src={photo.thumbnailUrl || "/placeholder.svg"}
              alt={photo.filename}
              fill
              className={`object-cover cursor-pointer transition-all duration-500 ease-out ${loadedImages.has(photo.id)
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-105'
                } group-hover:scale-105`}
              onClick={() => onView?.(photo)}
              priority={index < columns.lg}
              sizes={getSizes()}
              unoptimized
              onLoad={() => handleImageLoad(photo.id)}
              onError={(e) => {
                console.error(`Failed to load image: ${photo.filename}`, e);
                // Still mark as loaded to avoid infinite loading state
                handleImageLoad(photo.id);
              }}
            />

            {/* Action overlay - positioned at bottom to avoid overlap with like/favorite */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all flex items-end justify-center pb-2">
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {onView && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="backdrop-blur-sm bg-white/80 hover:bg-white h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(photo);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}

                {onDownload && (
                  <Button
                    size="sm"
                    className="backdrop-blur-sm h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadClick(photo.id);
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                )}

                {onUnpost && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="backdrop-blur-sm bg-white/80 hover:bg-white h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpost(photo.id);
                    }}
                    title="Remove from posts"
                  >
                    <Share2 className="h-3.5 w-3.5 text-purple-600" />
                  </Button>
                )}

                {isAdmin && onDelete && (
                  <Button
                    size="sm"

                    variant="destructive"
                    className="backdrop-blur-sm h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Like/Favorite buttons - positioned at top-left to avoid overlap */}
            <div className="absolute top-1.5 left-1.5 flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="text-white backdrop-blur-sm bg-black/20 hover:bg-black/30 h-6 w-6 p-0 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLikePhoto(photo.id);
                }}
                aria-label="Like photo"
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
                  e.stopPropagation();
                  handleFavoritePhoto(photo.id);
                }}
                aria-label="Favorite photo"
              >
                <Star
                  className={`h-3 w-3 ${(photo.favoritedBy ?? []).some((fav) => fav.userId === user?.id) ? "text-yellow-500 fill-current" : ""}`}
                />
              </Button>
            </div>

            {/* Photo info overlay for admin */}
            {isAdmin && (photo.fileSize || photo.downloadCount !== undefined) && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-white text-xs truncate">{photo.filename}</p>
                <div className="flex justify-between text-gray-300 text-xs">
                  {photo.fileSize && (
                    <span>{(photo.fileSize / 1024 / 1024).toFixed(1)}MB</span>
                  )}
                  {photo.downloadCount !== undefined && (
                    <span>{photo.downloadCount} downloads</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}