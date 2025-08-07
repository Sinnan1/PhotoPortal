"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { PhotoGrid } from "@/components/photo-grid";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { Star, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Photo {
  id: string;
  filename: string;
  thumbnailUrl: string;
  originalUrl: string;
  createdAt: string;
  gallery: {
    id: string;
    title: string;
    photographer: {
      name: string;
    };
  };
}

export default function FavoritesPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchFavoritedPhotos();
  }, []);

  const fetchFavoritedPhotos = async () => {
    try {
      setLoading(true);
      const response = await api.getFavoritedPhotos();
      setPhotos(response.data);
    } catch (error) {
      console.error("Failed to fetch favorited photos:", error);
      toast({
        title: "Error",
        description: "Failed to load favorited photos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (photoId: string) => {
    try {
      const response = await api.downloadPhoto(photoId);
      const { downloadUrl, filename } = response.data;

      // Fetch the image data
      const imageResponse = await fetch(downloadUrl);
      const imageBlob = await imageResponse.blob();

      // Create a temporary link to trigger the download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(imageBlob);
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
          <Star className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold text-gray-900">Favorites</h1>
        </div>
        <p className="text-gray-600">
          Your collection of favorited photos from all galleries
        </p>
      </div>

      {/* Stats Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Your Favorites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-yellow-500">{photos.length}</div>
            <div className="text-gray-600">
              {photos.length === 1 ? "photo" : "photos"} favorited
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-12">
          <Star className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No favorited photos yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Favorite photos from galleries to see them here.
          </p>
        </div>
      ) : (
        <PhotoGrid
          photos={photos}
          showLikeFavorite={true}
          onView={setSelectedPhoto}
          onDownload={handleDownload}
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
        />
      )}
    </div>
  );
} 