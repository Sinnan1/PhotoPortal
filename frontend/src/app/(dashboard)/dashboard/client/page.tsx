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
  Images,
  Calendar,
  User,
  MoreHorizontal,
  Eye,
  Heart,
  Star,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientWelcomeModal } from "@/components/ui/client-welcome-modal";

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
  photos?: Photo[];
  coverPhoto?: Photo;
  _count: {
    photos: number;
  };
}

interface Gallery {
  id: string;
  title: string;
  description: string;
  downloadCount: number;
  expiresAt: string | null;
  createdAt: string;
  isExpired: boolean;
  folders: Folder[];
  photographer: {
    name: string;
  };
  likedBy: { userId: string }[];
  favoritedBy: { userId: string }[];
  _count?: {
    likedBy: number;
    favoritedBy: number;
  };
}

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [accessibleGalleries, setAccessibleGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    if (user?.role === "CLIENT") {
      fetchAccessibleGalleries();
      
      // Check if user has seen the welcome modal
      const hasSeenModal = localStorage.getItem("clientWelcomeModalSeen");
      if (!hasSeenModal) {
        setShowWelcomeModal(true);
      }
    }
  }, [user]);

  const fetchAccessibleGalleries = async () => {
    try {
      const response = await api.getClientGalleries();
      setAccessibleGalleries(response.data);
    } catch (error) {
      showToast("Failed to load accessible galleries", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLikeGallery = async (galleryId: string) => {
    try {
      const gallery = accessibleGalleries.find((g) => g.id === galleryId);
      if (!gallery) return;

      const isLiked = gallery.likedBy.some((like) => like.userId === user?.id);

      if (isLiked) {
        await api.unlikeGallery(galleryId);
      } else {
        await api.likeGallery(galleryId);
      }

      fetchAccessibleGalleries();
    } catch (error) {
      showToast("Failed to update like status", "error");
    }
  };

  const handleFavoriteGallery = async (galleryId: string) => {
    try {
      const gallery = accessibleGalleries.find((g) => g.id === galleryId);
      if (!gallery) return;

      const isFavorited = gallery.favoritedBy.some(
        (favorite) => favorite.userId === user?.id
      );

      if (isFavorited) {
        await api.unfavoriteGallery(galleryId);
      } else {
        await api.favoriteGallery(galleryId);
      }

      fetchAccessibleGalleries();
    } catch (error) {
      showToast("Failed to update favorite status", "error");
    }
  };

  if (user?.role !== "CLIENT") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mt-2">
            This page is only available to clients.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ClientWelcomeModal
        open={showWelcomeModal}
        onOpenChange={setShowWelcomeModal}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-12">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 font-audrey">Dashboard</h1>
          <p className="text-muted-foreground text-base sm:text-lg">View galleries shared with you</p>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        <Link href="/dashboard/liked" className="group">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/20">
            <CardContent className="p-5">
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
            <CardContent className="p-5">
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
      </div>

      {/* Accessible Galleries Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight font-audrey">Shared Galleries</h2>
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
      ) : accessibleGalleries.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6">
            <Images className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            No shared galleries
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Galleries shared with you by photographers will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {accessibleGalleries.map((gallery, index) => (
            <Card
              key={gallery.id}
              className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20"
            >
              {/* Cover Image */}
              <Link href={`/gallery/${gallery.id}`}>
                <div className="relative aspect-[4/3] bg-gradient-to-br from-muted/50 to-muted overflow-hidden">
                  {gallery.folders && gallery.folders.length > 0 && gallery.folders[0].coverPhoto ? (
                    <Image
                      src={gallery.folders[0].coverPhoto.thumbnailUrl || "/placeholder.svg"}
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
                          <Link href={`/gallery/${gallery.id}`} target="_blank">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open in New Tab
                          </Link>
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
                    <User className="h-4 w-4 text-primary mb-1" />
                    <span className="text-xs font-semibold truncate w-full text-center">
                      {gallery.photographer.name}
                    </span>
                    <span className="text-xs text-muted-foreground">photographer</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                    <Images className="h-4 w-4 text-primary mb-1" />
                    <span className="text-lg font-semibold">
                      {gallery.folders?.reduce((sum, folder) => sum + (folder?._count?.photos ?? 0), 0) ?? 0}
                    </span>
                    <span className="text-xs text-muted-foreground">photos</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                    <Heart className="h-4 w-4 text-red-500 mb-1" />
                    <span className="text-lg font-semibold">{gallery._count?.likedBy ?? 0}</span>
                    <span className="text-xs text-muted-foreground">liked</span>
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
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" />
                      <span>{gallery._count?.likedBy ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" />
                      <span>{gallery._count?.favoritedBy ?? 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </>
  );
}
