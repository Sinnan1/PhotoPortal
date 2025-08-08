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
  Users,
  Download,
  Heart,
  Star,
  Eye,
  TrendingUp,
  Calendar,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Totals {
  photos: number;
  galleries: number;
  clients: number;
}

interface Photo {
  id: string;
  filename: string;
  thumbnailUrl: string;
  originalUrl: string;
  _count: {
    likedBy?: number;
    favoritedBy?: number;
  };
}

interface Gallery {
  id: string;
  title: string;
  downloadCount: number;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [mostLikedPhotos, setMostLikedPhotos] = useState<Photo[]>([]);
  const [mostFavoritedPhotos, setMostFavoritedPhotos] = useState<Photo[]>([]);
  const [mostViewedGalleries, setMostViewedGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "PHOTOGRAPHER") {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const [
        totalsResponse,
        mostLikedResponse,
        mostFavoritedResponse,
        mostViewedResponse,
      ] = await Promise.all([
        api.getTotals(),
        api.getMostLikedPhotos(),
        api.getMostFavoritedPhotos(),
        api.getMostViewedGalleries(),
      ]);

      setTotals(totalsResponse.data);
      setMostLikedPhotos(mostLikedResponse.data);
      setMostFavoritedPhotos(mostFavoritedResponse.data);
      setMostViewedGalleries(mostViewedResponse.data);
    } catch (error) {
      showToast("Failed to load analytics", "error");
    } finally {
      setLoading(false);
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">Track your gallery performance and engagement</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
                <Images className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals?.photos || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Across all galleries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Galleries</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals?.galleries || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active galleries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals?.clients || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Registered clients
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Most Liked Photos */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Most Liked Photos
              </CardTitle>
              <CardDescription>
                Photos with the highest number of likes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mostLikedPhotos.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No liked photos yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Photos will appear here once clients start liking them.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {mostLikedPhotos.map((photo, index) => (
                    <div key={photo.id} className="relative group">
                      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={photo.thumbnailUrl || "/placeholder.svg"}
                          alt={photo.filename}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
                      </div>
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <Badge className="flex items-center gap-1 text-xs">
                          <Heart className="h-3 w-3" />
                          {photo._count.likedBy}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Most Favorited Photos */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Most Favorited Photos
              </CardTitle>
              <CardDescription>
                Photos with the highest number of favorites
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mostFavoritedPhotos.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No favorited photos yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Photos will appear here once clients start favoriting them.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {mostFavoritedPhotos.map((photo, index) => (
                    <div key={photo.id} className="relative group">
                      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={photo.thumbnailUrl || "/placeholder.svg"}
                          alt={photo.filename}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
                      </div>
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <Badge className="flex items-center gap-1 text-xs">
                          <Star className="h-3 w-3" />
                          {photo._count.favoritedBy ?? 0}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Most Viewed Galleries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Most Viewed Galleries
              </CardTitle>
              <CardDescription>
                Galleries with the highest download counts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mostViewedGalleries.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No gallery views yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Galleries will appear here once clients start downloading photos.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mostViewedGalleries.map((gallery, index) => (
                    <div
                      key={gallery.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-sm">
                          #{index + 1}
                        </Badge>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {gallery.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Gallery ID: {gallery.id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">
                          {gallery.downloadCount} downloads
                        </span>
                        <Link href={`/gallery/${gallery.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
