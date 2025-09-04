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
  photos?: Photo[];
  photographer: {
    name: string;
  };
  likedBy: { userId: string }[];
  favoritedBy: { userId: string }[];
}

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [accessibleGalleries, setAccessibleGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "CLIENT") {
      fetchAccessibleGalleries();
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Client Dashboard</h1>
        <p className="text-gray-600 mt-2">View galleries shared with you</p>
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

      {/* Accessible Galleries Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Shared Galleries</h2>
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
      ) : accessibleGalleries.length === 0 ? (
        <div className="text-center py-12">
          <Images className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No shared galleries
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Galleries shared with you by photographers will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accessibleGalleries.map((gallery, index) => (
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
                      <Link href={`/gallery/${gallery.id}`} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open in New Tab
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                {/* Gallery preview - show cover photo */}
                {gallery.photos && gallery.photos.length > 0 && (
                  <div className="mb-4">
                    <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300 ring-1 ring-gray-200/50 group-hover:ring-[#425146]/30">
                      <Image
                        src={gallery.photos[0].thumbnailUrl || "/placeholder.svg"}
                        alt={gallery.photos[0].filename}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        priority={index === 0}
                        sizes="(max-width: 1024px) 50vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4 px-2">
                  <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 rounded-full px-3 py-1">
                    <User className="mr-1 h-4 w-4 text-[#425146]" />
                    <span className="font-medium">{gallery.photographer.name}</span>
                  </div>
                  <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 rounded-full px-3 py-1">
                    <Images className="mr-1 h-4 w-4 text-[#425146]" />
                    <span className="font-medium">{gallery.photoCount} photos</span>
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
    </div>
  );
}
