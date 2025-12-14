"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { PhotoGrid } from "@/components/photo/photo-grid";
import { PhotoLightbox } from "@/components/photo/photo-lightbox";
import { Share2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PhotoWithContext } from "@/types";
import { usePostedPhotos } from "@/hooks/queries/usePhotos";
import { usePhotoActions } from "@/hooks/usePhotoActions";

export default function PostsPage() {
  const { data: photos = [], isLoading: loading } = usePostedPhotos();
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithContext | null>(null);
  const { toast } = useToast();

  const { handlePostPhoto } = usePhotoActions({
    photos,
    onPhotoStatusChange: () => {
      // React Query handles invalidation
    }
  });

  const handleDownload = async (photoId: string) => {
    let blobUrl: string | null = null;
    try {
      const response = await api.downloadPhoto(photoId);
      const { downloadUrl, filename } = response.data;

      // Fetch the image data
      const imageResponse = await fetch(downloadUrl);
      const imageBlob = await imageResponse.blob();

      // Create a temporary link to trigger the download
      blobUrl = URL.createObjectURL(imageBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: "Your photo is being downloaded",
      });
    } catch (error) {
      console.error("Download failed", error);
      toast({
        title: "Download failed",
        description: "Failed to download photo",
        variant: "destructive",
      });
    } finally {
      // Always revoke the blob URL to prevent memory leak
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Share2 className="h-8 w-8 text-purple-500" />
          <h1 className="text-3xl font-bold">For Posts</h1>
        </div>
        <p className="text-muted-foreground">
          Photos marked for social media posting across all your galleries
        </p>
      </div>

      {/* Stats Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Photos for Posting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-purple-500">{photos.length}</div>
            <div className="text-gray-600">
              {photos.length === 1 ? "photo" : "photos"} marked for posting
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-12">
          <Share2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium">
            No photos marked for posting yet
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Mark photos for posting from your galleries to see them here.
          </p>
        </div>
      ) : (
        <PhotoGrid
          photos={photos}
          onView={(p) => setSelectedPhoto(p as PhotoWithContext)}
          onDownload={handleDownload}
          onUnpost={handlePostPhoto}
          columns={{ sm: 2, md: 3, lg: 4 }}
        />
      )}

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          photos={photos}
          onClose={() => setSelectedPhoto(null)}
          onNext={() => {
            const currentIndex = photos.findIndex(
              (p) => p.id === selectedPhoto.id
            );
            const nextIndex = (currentIndex + 1) % photos.length;
            setSelectedPhoto(photos[nextIndex]);
          }}
          onPrevious={() => {
            const currentIndex = photos.findIndex(
              (p) => p.id === selectedPhoto.id
            );
            const prevIndex =
              currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
            setSelectedPhoto(photos[prevIndex]);
          }}
          onDownload={() => handleDownload(selectedPhoto.id)}
          onUnpost={() => handlePostPhoto(selectedPhoto.id)}
        />
      )}
    </div>
  );
}
