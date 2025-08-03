"use client";

import type React from "react";

import { useState, useEffect } from "react";
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
import { Lock, Download, Calendar, User, Images, Loader2 } from "lucide-react";
import Image from "next/image";
import { PhotoLightbox } from "@/components/photo-lightbox";

interface Photo {
  id: string;
  filename: string;
  thumbnailUrl: string;
  originalUrl: string;
  createdAt: string;
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

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    fetchGallery();
  }, [galleryId]);

  useEffect(() => {
    if (gallery?.photos) {
      console.log(
        "Photo URLs:",
        gallery.photos.map((p) => ({
          filename: p.filename,
          thumbnailUrl: p.thumbnailUrl,
          originalUrl: p.originalUrl,
        }))
      );
    }
  }, [gallery]);

  const fetchGallery = async () => {
    try {
      const response = await api.getGallery(galleryId);
      setGallery(response.data);
    } catch (error: any) {
      if (error.message.includes("password")) {
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
      await api.verifyGalleryPassword(galleryId, password);
      setPasswordRequired(false);
      fetchGallery();
    } catch (error) {
      showToast("Incorrect password", "error");
    } finally {
      setVerifying(false);
    }
  };

  const handleDownload = (photoId: string) => {
    const downloadUrl = api.downloadPhoto(photoId, galleryId);
    window.open(downloadUrl, "_blank");
  };

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
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">{gallery.title}</h1>
          {gallery.downloadLimit && (
            <Badge variant="outline">
              {gallery.downloadCount}/{gallery.downloadLimit} downloads
            </Badge>
          )}
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



      {/* Photo Grid */}
      {gallery.photos.length === 0 ? (
        <div className="text-center py-12">
          <Images className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No photos yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Photos will appear here once uploaded.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {gallery.photos.map((photo, index) => (
            <div
              key={photo.id}
              className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden"
            >
              {/* Using original URLs for better quality in gallery grid */}
              <img
                src={photo.originalUrl || "/placeholder.svg"}
                alt={photo.filename}
                className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                onClick={() => setSelectedPhoto(photo)}
                onError={(e) => {
                  console.error('Image failed to load:', photo.originalUrl);
                  // Fallback to thumbnail if original fails
                  const target = e.target as HTMLImageElement;
                  target.src = photo.thumbnailUrl || "/placeholder.svg";
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', photo.filename);
                }}
                crossOrigin="anonymous"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                <Button
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(photo.id);
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
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
