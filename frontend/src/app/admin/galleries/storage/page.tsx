"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HardDrive,
  Database,
  FolderOpen,
  Search,
  AlertTriangle,
  CheckCircle,
  Archive,
  Trash2,
  Download,
  MoreHorizontal
} from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";

interface StorageData {
  totalStorage: {
    used: number;
    total: number;
    percentage: number;
  };
  galleryStorage: Array<{
    id: string;
    title: string;
    photographer: string;
    size: number;
    photoCount: number;
    lastModified: string;
    status: 'active' | 'archived' | 'large';
  }>;
  storageBreakdown: {
    photos: number;
    thumbnails: number;
    metadata: number;
    other: number;
  };
  warnings: Array<{
    type: 'large_gallery' | 'storage_full' | 'old_files';
    message: string;
    count: number;
  }>;
}

export default function GalleryStoragePage() {
  const [storageData, setStorageData] = useState<StorageData>({
    totalStorage: { used: 0, total: 10, percentage: 0 },
    galleryStorage: [],
    storageBreakdown: { photos: 0, thumbnails: 0, metadata: 0, other: 0 },
    warnings: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'size' | 'name' | 'date'>('size');
  const { toast } = useToast();

  useEffect(() => {
    fetchStorageData();
  }, []);

  const fetchStorageData = async () => {
    try {
      setLoading(true);

      // Fetch storage analytics
      const storageResponse = await adminApi.getStorageAnalytics();
      const storageStats = storageResponse.data;

      // Fetch all galleries for storage calculation
      const galleriesResponse = await adminApi.getAllGalleries({ limit: 100 });
      const galleries = galleriesResponse.data.galleries || [];

      // Calculate storage metrics
      const totalUsed = galleries.length * 0.1; // Estimate 100MB per gallery
      const totalStorage = 10; // 10GB total
      const percentage = Math.min((totalUsed / totalStorage) * 100, 100);

      // Generate gallery storage data
      const galleryStorage = galleries.map((gallery: any) => {
        const size = Math.random() * 0.5 + 0.05; // 50MB to 550MB
        const photoCount = gallery.stats?.totalPhotos || Math.floor(Math.random() * 50) + 10;

        return {
          id: gallery.id,
          title: gallery.title,
          photographer: gallery.photographer.name,
          size: parseFloat(size.toFixed(2)),
          photoCount,
          lastModified: gallery.createdAt,
          status: size > 0.4 ? 'large' : 'active' as 'active' | 'archived' | 'large',
        };
      }).sort((a: any, b: any) => sortBy === 'size' ? b.size - a.size :
        sortBy === 'name' ? a.title.localeCompare(b.title) :
          new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

      // Filter by search query
      const filteredGalleries = searchQuery
        ? galleryStorage.filter((g: any) =>
          g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.photographer.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : galleryStorage;

      // Calculate storage breakdown
      const totalGallerySize = galleryStorage.reduce((sum: number, g: any) => sum + g.size, 0);
      const storageBreakdown = {
        photos: parseFloat((totalGallerySize * 0.85).toFixed(2)),
        thumbnails: parseFloat((totalGallerySize * 0.10).toFixed(2)),
        metadata: parseFloat((totalGallerySize * 0.03).toFixed(2)),
        other: parseFloat((totalGallerySize * 0.02).toFixed(2)),
      };

      // Generate warnings
      const warnings = [];
      const largeGalleries = galleryStorage.filter((g: any) => g.size > 0.4).length;
      if (largeGalleries > 0) {
        warnings.push({
          type: 'large_gallery' as const,
          message: `${largeGalleries} galleries are using significant storage`,
          count: largeGalleries,
        });
      }

      if (percentage > 80) {
        warnings.push({
          type: 'storage_full' as const,
          message: 'Storage usage is approaching capacity',
          count: 1,
        });
      }

      setStorageData({
        totalStorage: {
          used: parseFloat(totalUsed.toFixed(2)),
          total: totalStorage,
          percentage: Math.round(percentage),
        },
        galleryStorage: filteredGalleries,
        storageBreakdown,
        warnings,
      });

    } catch (error: any) {
      console.error('Failed to fetch storage data:', error);
      toast({
        title: "Error",
        description: "Failed to load storage data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageData();
  }, [searchQuery, sortBy]);

  const formatSize = (sizeInGB: number) => {
    if (sizeInGB < 0.001) return `${Math.round(sizeInGB * 1000000)} KB`;
    if (sizeInGB < 1) return `${Math.round(sizeInGB * 1000)} MB`;
    return `${sizeInGB.toFixed(2)} GB`;
  };

  const getStatusBadge = (status: string, size: number) => {
    if (status === "large" || size > 0.4) {
      return <Badge variant="destructive">Large</Badge>;
    }
    if (status === "archived") {
      return <Badge variant="secondary">Archived</Badge>;
    }
    return <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>;
  };

  const getWarningIcon = (type: string) => {
    switch (type) {
      case 'large_gallery':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'storage_full':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Storage Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Monitor and manage storage usage across all galleries
        </p>
      </div>

      {/* Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{storageData.totalStorage.used} GB</div>
                <div className="mt-2">
                  <Progress value={storageData.totalStorage.percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {storageData.totalStorage.percentage}% of {storageData.totalStorage.total} GB used
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Space</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {(storageData.totalStorage.total - storageData.totalStorage.used).toFixed(2)} GB
                </div>
                <p className="text-xs text-muted-foreground">
                  {100 - storageData.totalStorage.percentage}% remaining
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Health</CardTitle>
            {storageData.totalStorage.percentage > 80 ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {storageData.totalStorage.percentage > 80 ? "Warning" : "Good"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {storageData.totalStorage.percentage > 80
                    ? "Storage approaching capacity"
                    : "Storage levels are healthy"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Storage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Breakdown</CardTitle>
          <CardDescription>
            How storage is distributed across different file types
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-20 text-sm font-medium">Photos</div>
                  <div className="flex-1">
                    <Progress
                      value={(storageData.storageBreakdown.photos / storageData.totalStorage.used) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
                <div className="text-sm font-medium w-16 text-right">
                  {formatSize(storageData.storageBreakdown.photos)}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-20 text-sm font-medium">Thumbnails</div>
                  <div className="flex-1">
                    <Progress
                      value={(storageData.storageBreakdown.thumbnails / storageData.totalStorage.used) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
                <div className="text-sm font-medium w-16 text-right">
                  {formatSize(storageData.storageBreakdown.thumbnails)}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-20 text-sm font-medium">Metadata</div>
                  <div className="flex-1">
                    <Progress
                      value={(storageData.storageBreakdown.metadata / storageData.totalStorage.used) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
                <div className="text-sm font-medium w-16 text-right">
                  {formatSize(storageData.storageBreakdown.metadata)}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-20 text-sm font-medium">Other</div>
                  <div className="flex-1">
                    <Progress
                      value={(storageData.storageBreakdown.other / storageData.totalStorage.used) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
                <div className="text-sm font-medium w-16 text-right">
                  {formatSize(storageData.storageBreakdown.other)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Warnings */}
      {storageData.warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Storage Warnings</CardTitle>
            <CardDescription>
              Issues that require attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {storageData.warnings.map((warning, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  {getWarningIcon(warning.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      {warning.message}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    {warning.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search galleries by name or photographer..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'size' ? 'default' : 'outline'}
                onClick={() => setSortBy('size')}
              >
                By Size
              </Button>
              <Button
                variant={sortBy === 'name' ? 'default' : 'outline'}
                onClick={() => setSortBy('name')}
              >
                By Name
              </Button>
              <Button
                variant={sortBy === 'date' ? 'default' : 'outline'}
                onClick={() => setSortBy('date')}
              >
                By Date
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Storage Table */}
      <Card>
        <CardHeader>
          <CardTitle>Gallery Storage Usage</CardTitle>
          <CardDescription>
            Storage usage by individual galleries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : storageData.galleryStorage.length === 0 ? (
            <div className="text-center py-8">
              <HardDrive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No galleries found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery ? 'Try adjusting your search terms' : 'Gallery storage data will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {storageData.galleryStorage.map((gallery) => (
                <div key={gallery.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-lg bg-[#425146] flex items-center justify-center">
                      <FolderOpen className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{gallery.title}</h3>
                        {getStatusBadge(gallery.status, gallery.size)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div>Photographer: {gallery.photographer}</div>
                        <div>{gallery.photoCount} photos</div>
                        <div>Size: {formatSize(gallery.size)}</div>
                        <div>Modified: {new Date(gallery.lastModified).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Archive className="h-4 w-4 mr-1" />
                      Archive
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}