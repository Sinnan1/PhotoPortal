// If you want to update your dashboard to use PhotoGrid for gallery previews
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Images,
  Download,
  Calendar,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { CreateGalleryModal } from "@/components/create-gallery-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  photoCount: number;
  downloadCount: number;
  expiresAt: string | null;
  createdAt: string;
  isExpired: boolean;
  photos?: Photo[]; // Add this for preview images
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (user?.role === "PHOTOGRAPHER") {
      fetchGalleries();
    }
  }, [user]);

  const fetchGalleries = async () => {
    try {
      const response = await api.getGalleries();
      setGalleries(response.data);
    } catch (error) {
      showToast("Failed to load galleries", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGallery = async (id: string) => {
    if (!confirm("Are you sure you want to delete this gallery?")) return;

    try {
      await api.deleteGallery(id);
      setGalleries(galleries.filter((g) => g.id !== id));
      showToast("Gallery deleted successfully", "success");
    } catch (error) {
      showToast("Failed to delete gallery", "error");
    }
  };

  if (user?.role !== "PHOTOGRAPHER") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mt-2">
            This page is only available to photographers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your photo galleries</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Gallery
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : galleries.length === 0 ? (
        <div className="text-center py-12">
          <Images className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No galleries
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new gallery.
          </p>
          <div className="mt-6">
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Gallery
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleries.map((gallery, index) => (
            <Card
              key={gallery.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex-1">
                  <CardTitle className="text-lg">{gallery.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {gallery.description}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/gallery/${gallery.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Gallery
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/galleries/${gallery.id}/manage`}>
                        Edit Gallery
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteGallery(gallery.id)}
                      className="text-red-600"
                    >
                      Delete Gallery
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                {/* Gallery preview - show first few photos if available */}
                {gallery.photos && gallery.photos.length > 0 && (
                  <div className="mb-4">
                    <div className="grid grid-cols-3 gap-1 h-20">
                      {gallery.photos.slice(0, 3).map((photo, photoIndex) => (
                        <div
                          key={photo.id}
                          className="relative aspect-square bg-gray-100 rounded overflow-hidden"
                        >
                          <Image
                            src={photo.thumbnailUrl || "/placeholder.svg"}
                            alt={photo.filename}
                            fill
                            className="object-cover"
                            // CRITICAL: Add priority to first gallery's first photos
                            priority={index === 0 && photoIndex === 0}
                            sizes="(max-width: 1024px) 33vw, 11vw"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Images className="mr-1 h-4 w-4" />
                    {gallery.photoCount} photos
                  </div>
                  <div className="flex items-center">
                    <Download className="mr-1 h-4 w-4" />
                    {gallery.downloadCount} downloads
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="mr-1 h-4 w-4" />
                    {gallery.expiresAt ? (
                      <span>
                        Expires{" "}
                        {new Date(gallery.expiresAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span>No expiry</span>
                    )}
                  </div>

                  {gallery.isExpired && (
                    <Badge variant="destructive">Expired</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateGalleryModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          fetchGalleries();
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}
