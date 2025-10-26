"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Heart, Star, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { DownloadProgress } from "@/components/ui/download-progress";
import { generateFilteredDownloadFilename, validateDownloadRequest, getDownloadBaseUrl } from "@/lib/download-utils";

function getAuthToken() {
  if (typeof document === "undefined") return null;
  
  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("auth-token="))
    ?.split("=")[1];
  
  if (cookieToken) return cookieToken;
  
  try {
    const storedToken = localStorage.getItem("auth-token");
    if (storedToken) return storedToken;
  } catch (error) {
    console.error("Error reading from localStorage:", error);
  }
  
  return null;
}

interface DownloadFilteredPhotosProps {
  galleryId: string;
  galleryTitle: string;
  galleryPassword?: string;
  likedCount?: number;
  favoritedCount?: number;
  className?: string;
}

export function DownloadFilteredPhotos({
  galleryId,
  galleryTitle,
  galleryPassword,
  likedCount = 0,
  favoritedCount = 0,
  className = ""
}: DownloadFilteredPhotosProps) {
  const [isDownloadingLiked, setIsDownloadingLiked] = useState(false);
  const [isDownloadingFavorited, setIsDownloadingFavorited] = useState(false);
  const [likedDownloadId, setLikedDownloadId] = useState<string | null>(null);
  const [favoritedDownloadId, setFavoritedDownloadId] = useState<string | null>(null);
  const { showToast } = useToast();

  const generateFilename = (filterType: 'liked' | 'favorited'): string => {
    const count = filterType === 'liked' ? likedCount : favoritedCount;
    return generateFilteredDownloadFilename(galleryTitle, filterType, count);
  };

  const handleDownloadFiltered = async (filterType: 'liked' | 'favorited') => {
    const token = getAuthToken();
    if (!token) {
      showToast("Please log in to download photos", "error");
      return;
    }

    const count = filterType === 'liked' ? likedCount : favoritedCount;
    const validation = validateDownloadRequest(count, filterType);
    if (!validation.isValid) {
      showToast(validation.message!, "info");
      return;
    }

    const setDownloading = filterType === 'liked' ? setIsDownloadingLiked : setIsDownloadingFavorited;
    const setDownloadId = filterType === 'liked' ? setLikedDownloadId : setFavoritedDownloadId;

    setDownloading(true);
    
    // Use direct domain to bypass Cloudflare timeouts
    const baseUrl = getDownloadBaseUrl();
    showToast(`Preparing ${filterType} photos download...`, "info");

    try {
      const response = await fetch(`${baseUrl}/photos/gallery/${galleryId}/download/${filterType}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(galleryPassword && { 'x-gallery-password': galleryPassword }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to download ${filterType} photos`);
      }

      // Get download ID from response headers for progress tracking
      const downloadId = response.headers.get('X-Download-ID');
      if (downloadId) {
        setDownloadId(downloadId);
      }

      // Get the blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = generateFilename(filterType);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(`${filterType.charAt(0).toUpperCase() + filterType.slice(1)} photos download started!`, "success");
    } catch (error: any) {
      console.error(`Failed to download ${filterType} photos:`, error);
      showToast(error.message || `Failed to download ${filterType} photos`, "error");
    } finally {
      setDownloading(false);
      // Clear download ID after a delay
      setTimeout(() => setDownloadId(null), 5000);
    }
  };

  const handleProgressComplete = (downloadId: string) => {
    if (downloadId === likedDownloadId) {
      setLikedDownloadId(null);
    } else if (downloadId === favoritedDownloadId) {
      setFavoritedDownloadId(null);
    }
  };

  const handleProgressError = (downloadId: string, error: string) => {
    showToast(`Download failed: ${error}`, "error");
    if (downloadId === likedDownloadId) {
      setLikedDownloadId(null);
      setIsDownloadingLiked(false);
    } else if (downloadId === favoritedDownloadId) {
      setFavoritedDownloadId(null);
      setIsDownloadingFavorited(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Download Liked Photos Button */}
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDownloadFiltered('liked')}
          disabled={isDownloadingLiked || likedCount === 0}
          className="w-full sm:w-auto flex items-center gap-2"
        >
          {isDownloadingLiked ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart className="h-4 w-4" />
          )}
          Download Liked ({likedCount})
        </Button>
        
        {likedDownloadId && (
          <DownloadProgress
            downloadId={likedDownloadId}
            onComplete={() => handleProgressComplete(likedDownloadId)}
            onError={(error) => handleProgressError(likedDownloadId, error)}
          />
        )}
      </div>

      {/* Download Favorited Photos Button */}
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDownloadFiltered('favorited')}
          disabled={isDownloadingFavorited || favoritedCount === 0}
          className="w-full sm:w-auto flex items-center gap-2"
        >
          {isDownloadingFavorited ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Star className="h-4 w-4" />
          )}
          Download Favorites ({favoritedCount})
        </Button>
        
        {favoritedDownloadId && (
          <DownloadProgress
            downloadId={favoritedDownloadId}
            onComplete={() => handleProgressComplete(favoritedDownloadId)}
            onError={(error) => handleProgressError(favoritedDownloadId, error)}
          />
        )}
      </div>

      {/* Empty State Messages */}
      {likedCount === 0 && favoritedCount === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          No liked or favorited photos to download
        </div>
      )}
    </div>
  );
}