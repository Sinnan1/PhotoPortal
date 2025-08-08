"use client";

import type React from "react";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Download, Calendar, User, Images, Loader2, Trash2, Heart, Star } from "lucide-react";
import Image from "next/image";
import { PhotoLightbox } from "@/components/photo-lightbox";
import JSZip from "jszip";
import { PhotoGrid } from "@/components/photo-grid";
import { useAuth } from "@/lib/auth-context";

interface Photo {
  id: string;
  filename: string;
  thumbnailUrl: string;
  originalUrl: string;
  createdAt: string;
  likedBy: { userId: string }[];
  favoritedBy: { userId: string }[];
}

interface Gallery {
  id: string;
  title: string;
  description: string;
  expiresAt: string | null;
  downloadLimit: number | null;
  downloadCount: number;
  isExpired: boolean;
  photographer: {
    name: string;
  };
  photos: Photo[];
}

export default function GalleryPage() {
  const params = useParams();
  const galleryId = params.id as string;
  const { showToast } = useToast();
  const { user } = useAuth();

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "liked" | "favorited">("all");

  useEffect(() => {
    fetchGallery();
  }, [galleryId]);

  const fetchGallery = async () => {
    try {
      const response = await api.getGallery(galleryId);
      setGallery(response.data);
    } catch (error: any) {
      if (error.message.toLowerCase().includes("password")) {
        setPasswordRequired(true);
      } else {
        showToast("Failed to load gallery", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);

    try {
      // Re-fetch gallery providing password header so backend authorizes
      const response = await api.getGallery(galleryId, password);
      setGallery(response.data);
      setPasswordRequired(false);
    } catch (error) {
      showToast("Incorrect password", "error");
    } finally {
      setVerifying(false);
    }
  };

  const handleDownload = async (photoId: string) => {
    try {
      const response = await api.downloadPhoto(photoId, galleryId);
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

    } catch (error) {
      console.error("Download failed", error);
      showToast("Download failed", "error");
    }
  };

  const handleDownloadAll = async () => {
    if (!gallery || gallery.photos.length === 0) {
      showToast("No photos to download", "info");
      return;
    }

    setIsDownloadingAll(true);
    showToast("Preparing download...", "info");

    try {
      const zip = new JSZip();
      const photoPromises = gallery.photos.map(async (photo) => {
        try {
          // Use backend download endpoint to enforce limits and count
          const resp = await api.downloadPhoto(photo.id, galleryId);
          const { downloadUrl, filename } = resp.data;
          const response = await fetch(downloadUrl);
          if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
          const blob = await response.blob();
          zip.file(filename, blob);
        } catch (error) {
          console.error(`Failed to download ${photo.filename}:`, error);
        }
      });

      await Promise.all(photoPromises);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${gallery.title.replace(/\s+/g, '_')}_photos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("Download started!", "success");
    } catch (error) {
      console.error("Failed to create zip file", error);
      showToast("Failed to create zip file", "error");
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      await api.deletePhoto(photoId);
      setGallery((prevGallery) => {
        if (!prevGallery) return null;
        return {
          ...prevGallery,
          photos: prevGallery.photos.filter((p) => p.id !== photoId),
        };
      });
      showToast("Photo deleted", "success");
    } catch (error) {
      console.error("Failed to delete photo", error);
      showToast("Failed to delete photo", "error");
    }
  };

  const handleImageError = (photoId: string) => {
    setImageErrors(prev => new Set(prev).add(photoId));
  };

  const filteredPhotos = useMemo(() => {
    if (!gallery) return [];
    if (filter === "liked") return gallery.photos.filter((p) => p.likedBy?.length > 0);
    if (filter === "favorited") return gallery.photos.filter((p) => p.favoritedBy?.length > 0);
    return gallery.photos;
  }, [gallery, filter, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <CardTitle>Password Required</CardTitle>
            <CardDescription>
              This gallery is password protected. Please enter the password to
              view photos.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handlePasswordSubmit}>
            <CardContent className="space-y-4">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter gallery password"
                required
              />
              <Button type="submit" className="w-full" disabled={verifying}>
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Access Gallery
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Gallery Not Found
          </h1>
          <p className="text-gray-600 mt-2">
            The gallery you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  if (gallery.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Gallery Expired</h1>
          <p className="text-gray-600 mt-2">
            This gallery is no longer available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Gallery Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 sm:mb-0">{gallery.title}</h1>
          <div className="flex items-center space-x-2">
            {gallery.photos.length > 0 && (
              <Button onClick={handleDownloadAll} disabled={isDownloadingAll}>
                {isDownloadingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download All
              </Button>
            )}
            {gallery.photos.some((p) => p.likedBy?.length > 0) && (
              <Button onClick={async () => {
                setIsDownloadingAll(true);
                try {
                  const liked = gallery.photos.filter((p) => p.likedBy?.length > 0);
                  const zip = new JSZip();
                  await Promise.all(liked.map(async (photo) => {
                    try {
                      const resp = await api.downloadPhoto(photo.id, galleryId);
                      const { downloadUrl, filename } = resp.data;
                      const fileResp = await fetch(downloadUrl);
                      if (!fileResp.ok) throw new Error(`Failed to fetch ${filename}`);
                      const blob = await fileResp.blob();
                      zip.file(filename, blob);
                    } catch (err) {
                      console.error(`Failed to download ${photo.filename}:`, err);
                    }
                  }));
                  const zipBlob = await zip.generateAsync({ type: "blob" });
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(zipBlob);
                  link.download = `${gallery.title.replace(/\s+/g, '_')}_liked.zip`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  showToast("Download started!", "success");
                } catch (e) {
                  console.error(e);
                  showToast("Failed to create zip file", "error");
                } finally {
                  setIsDownloadingAll(false);
                }
              }} disabled={isDownloadingAll}>
                {isDownloadingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download Liked
              </Button>
            )}
            {gallery.photos.some((p) => p.favoritedBy?.length > 0) && (
              <Button onClick={async () => {
                setIsDownloadingAll(true);
                try {
                  const fav = gallery.photos.filter((p) => p.favoritedBy?.length > 0);
                  const zip = new JSZip();
                  await Promise.all(fav.map(async (photo) => {
                    try {
                      const resp = await api.downloadPhoto(photo.id, galleryId);
                      const { downloadUrl, filename } = resp.data;
                      const fileResp = await fetch(downloadUrl);
                      if (!fileResp.ok) throw new Error(`Failed to fetch ${filename}`);
                      const blob = await fileResp.blob();
                      zip.file(filename, blob);
                    } catch (err) {
                      console.error(`Failed to download ${photo.filename}:`, err);
                    }
                  }));
                  const zipBlob = await zip.generateAsync({ type: "blob" });
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(zipBlob);
                  link.download = `${gallery.title.replace(/\s+/g, '_')}_favorites.zip`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  showToast("Download started!", "success");
                } catch (e) {
                  console.error(e);
                  showToast("Failed to create zip file", "error");
                } finally {
                  setIsDownloadingAll(false);
                }
              }} disabled={isDownloadingAll}>
                {isDownloadingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download Favorites
              </Button>
            )}
            {gallery.downloadLimit && (
              <Badge variant="outline">
                {gallery.downloadCount}/{gallery.downloadLimit} downloads
              </Badge>
            )}
          </div>
        </div>

        {gallery.description && (
          <p className="text-gray-600 mb-4">{gallery.description}</p>
        )}

        <div className="flex items-center space-x-6 text-sm text-gray-500">
          <div className="flex items-center">
            <User className="mr-1 h-4 w-4" />
            {gallery.photographer.name}
          </div>
          <div className="flex items-center">
            <Images className="mr-1 h-4 w-4" />
            {gallery.photos.length} photos
          </div>
          {gallery.expiresAt && (
            <div className="flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              Expires {new Date(gallery.expiresAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex justify-end gap-2 mb-4">
        <Button
          variant={filter === "all" ? "secondary" : "ghost"}
          onClick={() => setFilter("all")}
        >
          All ({gallery.photos.length})
        </Button>
        <Button
          variant={filter === "liked" ? "secondary" : "ghost"}
          onClick={() => setFilter("liked")}
        >
          <Heart className="mr-2 h-4 w-4" />
          Liked ({gallery.photos.filter(p => p.likedBy?.length > 0).length})
        </Button>
        <Button
          variant={filter === "favorited" ? "secondary" : "ghost"}
          onClick={() => setFilter("favorited")}
        >
          <Star className="mr-2 h-4 w-4" />
          Favorited ({gallery.photos.filter(p => p.favoritedBy?.length > 0).length})
        </Button>
      </div>

      {/* Photo Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-12">
          <Images className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No photos to display
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === "all" ? "This gallery is empty." : `You have no ${filter} photos in this gallery.`}
          </p>
        </div>
      ) : (
        <PhotoGrid
          photos={filteredPhotos}
          onView={setSelectedPhoto}
          onDownload={handleDownload}
          onDelete={handleDelete}
          columns={{ sm: 2, md: 3, lg: 4 }}
        />
      )}

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          photos={gallery.photos}
          onClose={() => setSelectedPhoto(null)}
          onNext={() => {
            const currentIndex = gallery.photos.findIndex(
              (p) => p.id === selectedPhoto.id
            );
            const nextIndex = (currentIndex + 1) % gallery.photos.length;
            setSelectedPhoto(gallery.photos[nextIndex]);
          }}
          onPrevious={() => {
            const currentIndex = gallery.photos.findIndex(
              (p) => p.id === selectedPhoto.id
            );
            const prevIndex =
              currentIndex === 0 ? gallery.photos.length - 1 : currentIndex - 1;
            setSelectedPhoto(gallery.photos[prevIndex]);
          }}
          onDownload={() => handleDownload(selectedPhoto.id)}
        />
      )}
    </div>
  );
}
