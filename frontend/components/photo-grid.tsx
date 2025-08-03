// src/components/photo-grid.tsx
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, Eye, Trash2 } from "lucide-react";

interface Photo {
  id: string;
  filename: string;
  thumbnailUrl: string;
  originalUrl: string;
  fileSize?: number;
  downloadCount?: number;
  createdAt: string;
}

interface PhotoGridProps {
  photos: Photo[];
  galleryId?: string;
  isAdmin?: boolean;
  onDelete?: (photoId: string) => void;
  onView?: (photo: Photo) => void;
  onDownload?: (photoId: string) => void;
  columns?: {
    sm: number;
    md: number;
    lg: number;
    xl?: number;
  };
  className?: string;
}

export function PhotoGrid({
  photos,
  galleryId,
  isAdmin = false,
  onDelete,
  onView,
  onDownload,
  columns = { sm: 2, md: 3, lg: 4 },
  className = "",
}: PhotoGridProps) {
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
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden"
        >
          <Image
            src={photo.thumbnailUrl || "/placeholder.svg"}
            alt={photo.filename}
            fill
            className="object-cover cursor-pointer transition-transform group-hover:scale-105"
            onClick={() => onView?.(photo)}
            // CRITICAL: Add priority to first row of images (above the fold)
            priority={index < columns.lg * 2} // First 2 rows
            loading={index < columns.lg * 2 ? "eager" : "lazy"}
            sizes={getSizes()}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          />

          {/* Action overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {onView && (
                <Button
                  size="sm"
                  variant="secondary"
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
      ))}
    </div>
  );
}
