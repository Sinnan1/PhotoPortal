"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Heart, Star, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { DownloadWarningModal } from "@/components/ui/download-warning-modal";

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
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ type: 'liked' | 'favorited'; count: number } | null>(null);
  const { showToast } = useToast();

  const handleDownloadClick = (filterType: 'liked' | 'favorited') => {
    const count = filterType === 'liked' ? likedCount : favoritedCount;
    setPendingDownload({ type: filterType, count });
    setShowWarningModal(true);
  };

  const handleConfirmDownload = async () => {
    if (!pendingDownload) return;

    const filterType = pendingDownload.type;
    const setDownloading = filterType === 'liked' ? setIsDownloadingLiked : setIsDownloadingFavorited;
    
    setDownloading(true);
    try {
      const response = await api.createDownloadTicket(galleryId, { filter: filterType });
      window.location.href = response.downloadUrl;
    } catch (error) {
      console.error("Failed to start download:", error);
      showToast("Failed to start download", "error");
    } finally {
      setDownloading(false);
      setPendingDownload(null);
    }
  };

  return (
    <>
      <div className={`space-y-3 ${className}`}>
        {/* Download Liked Photos Button */}
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadClick('liked')}
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
            onClick={() => handleDownloadClick('favorited')}
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

      {/* Download Warning Modal */}
      <DownloadWarningModal
        open={showWarningModal}
        onOpenChange={setShowWarningModal}
        onConfirm={handleConfirmDownload}
        downloadType={pendingDownload?.type === 'liked' ? 'Liked Photos' : 'Favorited Photos'}
        photoCount={pendingDownload?.count || 0}
      />
    </>
  );
}
