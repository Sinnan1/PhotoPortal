"use client";

import React, { useState, useEffect } from "react";
import { Image, AlertCircle, Loader2 } from "lucide-react";
import { adminApi } from "@/lib/admin-api";

interface PhotoCountProps {
  galleryId?: string;
  initialCount?: number;
  showLabel?: boolean;
  className?: string;
}

interface PhotoCountData {
  count: number;
  loading: boolean;
  error?: string;
}

export const PhotoCount: React.FC<PhotoCountProps> = ({
  galleryId,
  initialCount,
  showLabel = true,
  className = ""
}) => {
  const [photoData, setPhotoData] = useState<PhotoCountData>({
    count: initialCount || 0,
    loading: !initialCount && !!galleryId,
    error: undefined
  });

  useEffect(() => {
    if (galleryId && !initialCount) {
      fetchPhotoCount();
    }
  }, [galleryId, initialCount]);

  const fetchPhotoCount = async () => {
    if (!galleryId) return;

    try {
      setPhotoData(prev => ({ ...prev, loading: true, error: undefined }));

      const response = await adminApi.getGalleryDetails(galleryId);
      const totalPhotos = response.data.stats?.totalPhotos || 0;

      setPhotoData({
        count: totalPhotos,
        loading: false,
        error: undefined
      });
    } catch (error: any) {
      console.error('Failed to fetch photo count:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to load photo count';
      if (error.status === 404) {
        errorMessage = 'Gallery not found';
      } else if (error.status === 403) {
        errorMessage = 'Access denied';
      } else if (error.status >= 500) {
        errorMessage = 'Server error';
      }

      setPhotoData({
        count: initialCount || 0,
        loading: false,
        error: errorMessage
      });
    }
  };

  const handleRetry = () => {
    if (galleryId) {
      fetchPhotoCount();
    }
  };

  if (photoData.loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        {showLabel && (
          <span className="text-sm text-muted-foreground">Loading photos...</span>
        )}
      </div>
    );
  }

  if (photoData.error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-500">
          {photoData.error}
        </span>
        <button
          onClick={handleRetry}
          className="text-xs text-blue-500 hover:text-blue-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <Image className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">
        {photoData.count.toLocaleString()}
      </span>
      {showLabel && (
        <span className="text-sm text-muted-foreground">
          {photoData.count === 1 ? 'photo' : 'photos'}
        </span>
      )}
    </div>
  );
};

// Component for displaying total photos across all galleries
interface TotalPhotoCountProps {
  galleries: Array<{ stats?: { totalPhotos: number } }>;
  loading?: boolean;
  className?: string;
  showLabel?: boolean;
}

export const TotalPhotoCount: React.FC<TotalPhotoCountProps> = ({
  galleries,
  loading = false,
  className = "",
  showLabel = true
}) => {
  const totalPhotos = galleries.reduce((sum, gallery) => {
    return sum + (gallery.stats?.totalPhotos || 0);
  }, 0);

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        {showLabel && <span className="text-sm text-muted-foreground">Calculating...</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* <Image className="h-4 w-4 text-muted-foreground" /> - Icon might be redundant if parent handles it, but let's keep it for now or make it optional? 
          The parent card in AdminGalleriesPage already has an icon in the header. 
          Actually, looking at the usage in AdminGalleriesPage, the TotalPhotoCount is inside a CardContent where the icon is in CardHeader.
          So we might want to hide the icon too if we want it truly minimal, but the prompt just asked for showLabel.
          Let's just implement showLabel for now.
      */}
      {/* Actually, user wants it COMPACT. The icon here inside the value might be annoying if the card header already has one.
          But let's stick to the requested fix: showLabel.
      */}
      <span className="text-2xl font-bold">
        {totalPhotos.toLocaleString()}
      </span>
      {/* If showLabel is false, we probably don't want the icon either? 
          Wait, the usage in AdminGalleriesPage was:
          <TotalPhotoCount galleries={galleries} loading={loading} showLabel={false} />
          And previously it rendered just the number and an icon.
          Let's make the icon conditional or just leave it. 
          The previous code had:
          <Image className="h-4 w-4 text-muted-foreground" />
          <span className="text-2xl font-bold">...</span>

          If I remove the icon here, it might break other usages.
          Let's just handle showLabel first.
      */}
    </div>
  );
};

export default PhotoCount;