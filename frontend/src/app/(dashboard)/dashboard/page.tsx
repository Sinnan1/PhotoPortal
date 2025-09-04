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
  Heart,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { CreateGalleryModal } from "@/components/create-gallery-modal";
import { GalleryAccessModal } from "@/components/gallery-access-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Share2, Copy } from 'lucide-react';

interface Photo {
  id: string;
  filename: string;
  thumbnailUrl: string;
  originalUrl: string;
  createdAt: string;
}

interface Folder {
  id: string;
  name: string;
  coverPhoto?: Photo;
  _count: {
    photos: number;
  };
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
  folders?: Folder[]; // Updated to use folders instead of direct photos
  likedBy: { userId: string }[];
  favoritedBy: { userId: string }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);

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

  const handleLikeGallery = async (galleryId: string) => {
    try {
      const gallery = galleries.find((g) => g.id === galleryId);
      if (!gallery) return;

      const isLiked = gallery.likedBy.some((like) => like.userId === user?.id);

      if (isLiked) {
        await api.unlikeGallery(galleryId);
      } else {
        await api.likeGallery(galleryId);
      }

      fetchGalleries();
    } catch (error) {
      showToast("Failed to update like status", "error");
    }
  };

  const handleShareGallery = (gallery: Gallery) => {
    setSelectedGallery(gallery);
    setShowShareModal(true);
  };

  const handleFavoriteGallery = async (galleryId: string) => {
    try {
      const gallery = galleries.find((g) => g.id === galleryId);
      if (!gallery) return;

      const isFavorited = gallery.favoritedBy.some(
        (favorite) => favorite.userId === user?.id
      );

      if (isFavorited) {
        await api.unfavoriteGallery(galleryId);
      } else {
        await api.favoriteGallery(galleryId);
      }

      fetchGalleries();
    } catch (error) {
      showToast("Failed to update favorite status", "error");
    }
  };

  const handleManageAccess = (gallery: Gallery) => {
    setSelectedGallery(gallery);
    setShowAccessModal(true);
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
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage your photo galleries</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Gallery
        </Button>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link href="/dashboard/liked">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <Heart className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Liked Photos</h3>
                  <p className="text-gray-600">View your liked photos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/favorites">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Favorites</h3>
                  <p className="text-gray-600">View your favorited photos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Galleries Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Galleries</h2>
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
          <Images className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium">
            No galleries
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
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
              className="hover:shadow-2xl hover:shadow-[#425146]/20 transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-900 dark:to-gray-800/80 backdrop-blur-sm hover:scale-[1.02] group"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-[#425146] transition-colors duration-300">{gallery.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-gray-600 dark:text-gray-300 mt-1">
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
                      onClick={() => handleShareGallery(gallery)}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleManageAccess(gallery)}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Manage Access
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteGallery(gallery.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Gallery
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                {/* Gallery preview - show cover photo */}
                {gallery.folders && gallery.folders.length > 0 && (
                  <div className="mb-4">
                    <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300 ring-1 ring-gray-200/50 group-hover:ring-[#425146]/30">
                      {gallery.folders[0].coverPhoto ? (
                        <Image
                          src={gallery.folders[0].coverPhoto.thumbnailUrl || "/placeholder.svg"}
                          alt={gallery.folders[0].coverPhoto.filename}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          priority={index === 0}
                          sizes="(max-width: 1024px) 50vw, 25vw"
                        />
                      ) : gallery.folders[0]._count?.photos > 0 ? (
                        // If no cover photo but folder has photos, show a placeholder with photo count
                        <div className="w-full h-full bg-gradient-to-br from-[#425146]/20 to-[#425146]/10 flex items-center justify-center">
                          <div className="text-center">
                            <Images className="w-12 h-12 text-[#425146] mx-auto mb-2" />
                            <p className="text-sm font-medium text-[#425146]">{gallery.folders[0]._count.photos} photos</p>
                          </div>
                        </div>
                      ) : (
                        // Empty folder placeholder
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <Images className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4 px-2">
                  <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 rounded-full px-3 py-1">
                    <Images className="mr-1 h-4 w-4 text-[#425146]" />
                    <span className="font-medium">{gallery.folders?.reduce((sum, folder) => sum + (folder?._count?.photos ?? 0), 0) ?? 0} photos</span>
                  </div>
                  <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 rounded-full px-3 py-1">
                    <Download className="mr-1 h-4 w-4 text-[#425146]" />
                    <span className="font-medium">{gallery.downloadCount} downloads</span>
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

                <div className="flex items-center justify-end gap-2 mt-4 px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLikeGallery(gallery.id)}
                  >
                    <Heart
                      className={`mr-2 h-4 w-4 ${
                        gallery.likedBy?.some((like) => like.userId === user?.id)
                          ? "text-red-500 fill-current"
                          : ""
                      }`}
                    />
                    {gallery.likedBy?.length || 0}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFavoriteGallery(gallery.id)}
                  >
                    <Star
                      className={`mr-2 h-4 w-4 ${
                        gallery.favoritedBy?.some(
                          (favorite) => favorite.userId === user?.id
                        )
                          ? "text-yellow-500 fill-current"
                          : ""
                      }`}
                    />
                    {gallery.favoritedBy?.length || 0}
                  </Button>
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

      {selectedGallery && (
        <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share "{selectedGallery.title}"</DialogTitle>
              <DialogDescription>
                Anyone with this link can view the gallery.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2">
              <Input
                value={`${window.location.origin}/gallery/${selectedGallery.id}`}
                readOnly
              />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/gallery/${selectedGallery.id}`
                  );
                  showToast("Link copied to clipboard", "success");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <GalleryAccessModal
        open={showAccessModal}
        onOpenChange={setShowAccessModal}
        galleryId={selectedGallery?.id || ""}
        galleryTitle={selectedGallery?.title || ""}
      />
    </div>
  );
}
