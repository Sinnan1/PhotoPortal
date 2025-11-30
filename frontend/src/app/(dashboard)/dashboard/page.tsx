"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { useGalleries, useDeleteGallery, useLikeGallery, useUnlikeGallery, useFavoriteGallery, useUnfavoriteGallery } from "@/hooks/queries/useGalleries";
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
  Share2,
  Copy,
  Edit,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { CreateGalleryModal } from "@/components/gallery/create-gallery-modal";
import { GalleryAccessModal } from "@/components/gallery/gallery-access-modal";
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
import type { Photo, Folder, Gallery } from "@/types";

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const { data: galleries = [], isLoading: loading } = useGalleries();
  const deleteGalleryMutation = useDeleteGallery();
  const likeGalleryMutation = useLikeGallery();
  const unlikeGalleryMutation = useUnlikeGallery();
  const favoriteGalleryMutation = useFavoriteGallery();
  const unfavoriteGalleryMutation = useUnfavoriteGallery();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);

  const handleDeleteGallery = async (id: string) => {
    if (!confirm("Are you sure you want to delete this gallery?")) return;

    try {
      await deleteGalleryMutation.mutateAsync(id);
      showToast("Gallery deleted successfully", "success");
    } catch (error) {
      showToast("Failed to delete gallery", "error");
    }
  };

  const handleLikeGallery = async (galleryId: string) => {
    try {
      const gallery = galleries.find((g) => g.id === galleryId);
      if (!gallery) return;

      const isLiked = gallery.likedBy.some((like: { userId: string }) => like.userId === user?.id);

      if (isLiked) {
        await unlikeGalleryMutation.mutateAsync(galleryId);
      } else {
        await likeGalleryMutation.mutateAsync(galleryId);
      }
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
        (favorite: { userId: string }) => favorite.userId === user?.id
      );

      if (isFavorited) {
        await unfavoriteGalleryMutation.mutateAsync(galleryId);
      } else {
        await favoriteGalleryMutation.mutateAsync(galleryId);
      }
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
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground mt-2">
            This page is only available to photographers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-12">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 font-audrey">Dashboard</h1>
          <p className="text-muted-foreground text-base sm:text-lg">Manage your photo galleries</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="lg" className="shadow-sm w-full sm:w-auto">
          <Plus className="mr-2 h-5 w-5" />
          Create Gallery
        </Button>
      </div>

      {/* Quick Access Cards - More refined */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <Link href="/dashboard/liked" className="group">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Heart className="h-5 w-5 text-red-600 dark:text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-0.5">Liked Photos</h3>
                  <p className="text-muted-foreground text-xs">View your liked photos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/favorites" className="group">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-0.5">Favorites</h3>
                  <p className="text-muted-foreground text-xs">View your favorited photos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/posts" className="group">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Share2 className="h-5 w-5 text-purple-600 dark:text-purple-500" />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-0.5">For Posts</h3>
                  <p className="text-muted-foreground text-xs">Photos for social media</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Galleries Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight font-audrey">Your Galleries</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-[4/3] bg-muted rounded-t-xl"></div>
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : galleries.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6">
            <Images className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No galleries yet</h3>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            Get started by creating your first gallery to organize and share your photos.
          </p>
          <Button onClick={() => setShowCreateModal(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create Gallery
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {galleries.map((gallery, index) => (
            <Card
              key={gallery.id}
              className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20"
            >
              {/* Cover Image */}
              <Link href={`/gallery/${gallery.id}`}>
                <div className="relative aspect-[4/3] bg-gradient-to-br from-muted/50 to-muted overflow-hidden">
                  {gallery.folders && gallery.folders.length > 0 && gallery.folders[0].coverPhoto ? (
                    <Image
                      src={
                        gallery.folders[0].coverPhoto.largeUrl ||
                        gallery.folders[0].coverPhoto.mediumUrl ||
                        gallery.folders[0].coverPhoto.thumbnailUrl ||
                        "/placeholder.svg"
                      }
                      alt={gallery.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      priority={index < 3}
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Images className="w-16 h-16 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

                  {/* Quick actions on hover */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-9 w-9 rounded-full shadow-lg backdrop-blur-sm bg-background/90"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/gallery/${gallery.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Gallery
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/galleries/${gallery.id}/manage`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Gallery
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleShareGallery(gallery);
                          }}
                        >
                          <Share2 className="mr-2 h-4 w-4" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleManageAccess(gallery);
                          }}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Manage Access
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteGallery(gallery.id);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Gallery
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Expired badge */}
                  {gallery.isExpired && (
                    <div className="absolute top-4 left-4">
                      <Badge variant="destructive" className="shadow-lg">
                        Expired
                      </Badge>
                    </div>
                  )}
                </div>
              </Link>

              {/* Card Content */}
              <CardContent className="p-6">
                <Link href={`/gallery/${gallery.id}`}>
                  <h3 className="text-xl font-bold mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                    {gallery.title}
                  </h3>
                </Link>

                {gallery.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {gallery.description}
                  </p>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                    <Images className="h-4 w-4 text-primary mb-1" />
                    <span className="text-lg font-semibold">
                      {gallery.folders?.reduce((sum, folder) => sum + (folder?._count?.photos ?? 0), 0) ?? 0}
                    </span>
                    <span className="text-xs text-muted-foreground">Photos</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                    <Heart className="h-4 w-4 text-red-500 mb-1" />
                    <span className="text-lg font-semibold">{gallery._count?.likedBy ?? 0}</span>
                    <span className="text-xs text-muted-foreground">Liked</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                    <Star className="h-4 w-4 text-yellow-500 mb-1" />
                    <span className="text-lg font-semibold">{gallery._count?.favoritedBy ?? 0}</span>
                    <span className="text-xs text-muted-foreground">Favorited</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {gallery.expiresAt ? (
                      <span>Expires {new Date(gallery.expiresAt).toLocaleDateString()}</span>
                    ) : (
                      <span>No expiry</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{formatFileSize(gallery.totalSize || 0)}</span>
                  </div>
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
          // No need to manually fetch, React Query handles invalidation
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
