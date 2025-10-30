"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Heart, Star, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

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
  const { showToast } = useToast();

  const handleDownloadFiltered = async (filterType: 'liked' | 'favorited') => {
    const setDownloading = filterType === 'liked' ? setIsDownloadingLiked : setIsDownloadingFavorited;
    setDownloading(true);
    try {
      const response = await api.createDownloadTicket(galleryId, { filter: filterType });
      window.location.href = response.data.downloadUrl;
    } catch (error) {
      showToast("Failed to start download", "error");
    } finally {
      setDownloading(false);
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