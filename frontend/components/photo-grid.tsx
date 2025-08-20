// src/components/photo-grid.tsx
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, Eye, Trash2, Heart, Star } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useState, useEffect } from "react";

interface Photo {
  id: string;
  filename: string;
  thumbnailUrl: string;
  originalUrl: string;
  fileSize?: number;
  downloadCount?: number;
  createdAt: string;
  likedBy?: { userId: string }[];
  favoritedBy?: { userId: string }[];
}

interface PhotoGridProps {
  photos: Photo[];
  galleryId?: string;
  isAdmin?: boolean;
  onDelete?: (photoId: string) => void;
  onView?: (photo: Photo) => void;
  onDownload?: (photoId: string) => void;
  onPhotoStatusChange?: (photoId: string, status: { liked?: boolean; favorited?: boolean }) => void;
  columns?: {
    sm: number;
    md: number;
    lg: number;
    xl?: number;
  };
  className?: string;
  lastPhotoElementRef?: (node: HTMLDivElement) => void;
}

export function PhotoGrid({
  photos,
  galleryId,
  isAdmin = false,
  onDelete,
  onView,
  onDownload,
  onPhotoStatusChange,
  columns = { sm: 2, md: 3, lg: 4 },
  className = "",
  lastPhotoElementRef,
}: PhotoGridProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [photoState, setPhotoState] = useState(photos);

  // Keep local state in sync with incoming photos (e.g., when applying filters)
  useEffect(() => {
    setPhotoState(photos);
  }, [photos]);

  const handleDownload = (photoId: string) => {
    if (onDownload) {
      onDownload(photoId);
    }
  };


  const handleDelete = (photoId: string) => {
    if (onDelete && confirm("Are you sure you want to delete this photo?")) {
      onDelete(photoId);
    }
  };

  const handleLikePhoto = async (photoId: string) => {
    try {
      const photo = photoState.find((p) => p.id === photoId);
      if (!photo) return;

      const isLiked = (photo.likedBy ?? []).some((like) => like.userId === user?.id);

      if (isLiked) {
        await api.unlikePhoto(photoId);
      } else {
        await api.likePhoto(photoId);
      }

      // Optimistically update the UI
      const updatedPhotos = photoState.map((p) => {
        if (p.id === photoId) {
          if (isLiked) {
            return { ...p, likedBy: (p.likedBy ?? []).filter((like) => like.userId !== user?.id) };
          } else {
            return { ...p, likedBy: [ ...(p.likedBy ?? []), { userId: user!.id } ] };
          }
        }
        return p;
      });
      setPhotoState(updatedPhotos);
      // Notify parent so it can update its source list for filtering
      onPhotoStatusChange?.(photoId, { liked: !isLiked });

    } catch (error) {
      showToast("Failed to update like status", "error");
    }
  };

  const handleFavoritePhoto = async (photoId: string) => {
    try {
      const photo = photoState.find((p) => p.id === photoId);
      if (!photo) return;

      const isFavorited = (photo.favoritedBy ?? []).some((favorite) => favorite.userId === user?.id);

      if (isFavorited) {
        await api.unfavoritePhoto(photoId);
      } else {
        await api.favoritePhoto(photoId);
      }

      // Optimistically update the UI
      const updatedPhotos = photoState.map((p) => {
        if (p.id === photoId) {
          if (isFavorited) {
            return { ...p, favoritedBy: (p.favoritedBy ?? []).filter((favorite) => favorite.userId !== user?.id) };
          } else {
            return { ...p, favoritedBy: [ ...(p.favoritedBy ?? []), { userId: user!.id } ] };
          }
        }
        return p;
      });
      setPhotoState(updatedPhotos);
      // Notify parent so it can update its source list for filtering
      onPhotoStatusChange?.(photoId, { favorited: !isFavorited });

    } catch (error) {
      showToast("Failed to update favorite status", "error");
    }
  };

  const getGridClasses = () => {
    const baseClasses = "grid gap-4";
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

  if (photoState.length === 0) {
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
      {photoState.map((photo, index) => {
        const isLastPhoto = index === photoState.length - 1;
        return (
          <div
            key={photo.id}
            ref={isLastPhoto ? lastPhotoElementRef : undefined}
            className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden"
          >
          <Image
            src={photo.thumbnailUrl || "/placeholder.svg"}
            alt={photo.filename}
            fill
            className="object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105"
            onClick={() => onView?.(photo)}
            // Fix 1: Remove conflicting loading prop when priority is true
            priority={index < columns.lg}
            sizes={getSizes()}
            // Fix 2: Remove blur placeholder temporarily to test
            //placeholder="blur"
            // blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/..."
            
            // Fix 3: Add error handling and debugging
            onLoad={() => console.log(`Image loaded: ${photo.filename}`)}
            onError={(e) => {
              console.error(`Failed to load image: ${photo.filename}`, e);
              console.error(`Image URL: ${photo.thumbnailUrl}`);
            }}
          />

          {/* Action overlay - positioned at bottom to avoid overlap with like/favorite */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-end justify-center pb-4">
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {onView && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="backdrop-blur-sm bg-white/90 hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(photo);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}

              {onDownload && (
                <Button
                  size="sm"
                  className="backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(photo.id);
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}

              {isAdmin && onDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photo.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Like/Favorite buttons - positioned at top-left to avoid overlap */}
          <div className="absolute top-2 left-2 flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="text-white backdrop-blur-sm bg-black/30 hover:bg-black/50 p-1.5"
              onClick={(e) => {
                e.stopPropagation();
                handleLikePhoto(photo.id);
              }}
              aria-label="Like photo"
            >
              <Heart
                className={`h-4 w-4 ${(photo.likedBy ?? []).some((like) => like.userId === user?.id) ? "text-red-500 fill-current" : ""}`}
              />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white backdrop-blur-sm bg-black/30 hover:bg-black/50 p-1.5"
              onClick={(e) => {
                e.stopPropagation();
                handleFavoritePhoto(photo.id);
              }}
              aria-label="Favorite photo"
            >
              <Star
                className={`h-4 w-4 ${(photo.favoritedBy ?? []).some((fav) => fav.userId === user?.id) ? "text-yellow-500 fill-current" : ""}`}
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