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
import { motion } from "framer-motion";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";

interface StorageData {
  totalStorage: {
    used: number; // Total bytes used in B2
    totalPhotos: number;
    totalGalleries: number;
    avgFileSize: number; // Average photo size in bytes
  };
  galleryStorage: Array<{
    id: string;
    title: string;
    photographer: string;
    size: number; // Size in bytes
    photoCount: number;
    lastModified: string;
    status: 'active' | 'archived' | 'large';
  }>;
  storageByType: Record<string, number>; // File type -> bytes (e.g., "JPEG": 12345678)
  warnings: Array<{
    type: 'large_gallery' | 'old_files';
    message: string;
    count: number;
  }>;
}

export default function GalleryStoragePage() {
  const [storageData, setStorageData] = useState<StorageData>({
    totalStorage: { used: 0, totalPhotos: 0, totalGalleries: 0, avgFileSize: 0 },
    galleryStorage: [],
    storageByType: {},
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

      // Fetch real storage analytics from API
      const [galleriesResponse, storageAnalyticsResponse] = await Promise.all([
        adminApi.getAllGalleries({ limit: 100 }),
        adminApi.getStorageAnalytics()
      ]);

      const galleries = galleriesResponse.data.galleries || [];
      const storageAnalytics = storageAnalyticsResponse.data;

      const LARGE_GALLERY_THRESHOLD = 500 * 1024 * 1024; // 500 MB in bytes

      // Generate gallery storage data using real totalSize
      const galleryStorage = galleries.map((gallery: any) => {
        const sizeInBytes = Number(gallery.totalSize) || 0;
        const photoCount = gallery.stats?.totalPhotos || 0;

        return {
          id: gallery.id,
          title: gallery.title,
          photographer: gallery.photographer.name,
          size: sizeInBytes,
          photoCount,
          lastModified: gallery.createdAt,
          status: sizeInBytes > LARGE_GALLERY_THRESHOLD ? 'large' : 'active' as 'active' | 'archived' | 'large',
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

      // Calculate total photos from gallery data
      const totalPhotos = galleryStorage.reduce((sum: number, g: any) => sum + g.photoCount, 0);

      // Generate warnings
      const warnings = [];
      const largeGalleries = galleryStorage.filter((g: any) => g.size > LARGE_GALLERY_THRESHOLD).length;
      if (largeGalleries > 0) {
        warnings.push({
          type: 'large_gallery' as const,
          message: `${largeGalleries} galleries are using significant storage (>500 MB)`,
          count: largeGalleries,
        });
      }

      setStorageData({
        totalStorage: {
          used: storageAnalytics.totalStorage || 0,
          totalPhotos,
          totalGalleries: galleries.length,
          avgFileSize: storageAnalytics.totalStorage && totalPhotos ? Math.round(storageAnalytics.totalStorage / totalPhotos) : 0,
        },
        galleryStorage: filteredGalleries,
        storageByType: storageAnalytics.storageByType || {},
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

  const formatSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    if (sizeInBytes < 1024 * 1024 * 1024) return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-audrey text-gray-900 dark:text-gray-100">Storage Management</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 md:mt-2">
            Monitor and manage storage usage across all galleries
          </p>
        </div>
      </motion.div>

      {/* Storage Overview - Compact 2x2 on Mobile */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {[
          {
            title: "B2 Storage Used",
            icon: HardDrive,
            value: formatSize(storageData.totalStorage.used),
            subtext: "Total data stored in Backblaze B2"
          },
          {
            title: "Total Photos",
            icon: Database,
            value: storageData.totalStorage.totalPhotos.toLocaleString(),
            subtext: "Across all galleries"
          },
          {
            title: "Avg Photo Size",
            icon: HardDrive,
            value: formatSize(storageData.totalStorage.avgFileSize),
            subtext: "Average file size"
          },
          {
            title: "Total Galleries",
            icon: FolderOpen,
            value: storageData.totalStorage.totalGalleries.toLocaleString(),
            subtext: "Active galleries"
          }
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm group hover:border-primary/20 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-6 bg-primary/10 rounded w-16"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xl md:text-2xl font-bold font-audrey">{stat.value}</div>
                    <p className="text-[10px] md:text-xs text-muted-foreground">{stat.subtext}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Storage Breakdown & Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle className="font-audrey">Storage Breakdown</CardTitle>
              <CardDescription>Distribution across different file types</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded"></div>)}
                </div>
              ) : Object.keys(storageData.storageByType).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/50 rounded-xl">
                  <Database className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No storage data yet</p>
                </div>
              ) : (
                <>
                  {Object.entries(storageData.storageByType)
                    .sort(([, a], [, b]) => b - a) // Sort by size descending
                    .map(([fileType, bytes], i) => {
                      // Assign colors based on file type
                      const colorMap: Record<string, string> = {
                        'JPEG': 'bg-blue-500',
                        'PNG': 'bg-emerald-500',
                        'WEBP': 'bg-purple-500',
                        'TIFF': 'bg-amber-500',
                        'Canon RAW': 'bg-red-500',
                        'Nikon RAW': 'bg-yellow-500',
                        'Sony RAW': 'bg-orange-500',
                        'DNG RAW': 'bg-pink-500',
                        'Other': 'bg-gray-500',
                      };
                      const color = colorMap[fileType] || 'bg-gray-400';

                      return (
                        <div key={fileType} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${color}`} />
                              <span>{fileType}</span>
                            </div>
                            <span className="font-medium font-mono">{formatSize(bytes)}</span>
                          </div>
                          <Progress value={storageData.totalStorage.used > 0 ? (bytes / storageData.totalStorage.used) * 100 : 0} className="h-1.5" />
                        </div>
                      );
                    })}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle className="font-audrey">Storage Warnings</CardTitle>
              <CardDescription>Issues that require attention</CardDescription>
            </CardHeader>
            <CardContent>
              {storageData.warnings.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/50 rounded-xl">
                  <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">System is healthy. No storage warnings.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {storageData.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      {getWarningIcon(warning.type)}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                          {warning.message}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-orange-500/30 text-orange-600 dark:text-orange-400">
                        {warning.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
        <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search galleries..."
                className="pl-10 bg-background/50 border-border/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 sm:flex gap-2">
              {[
                { label: "Size", key: "size" },
                { label: "Name", key: "name" },
                { label: "Date", key: "date" }
              ].map((btn) => (
                <Button
                  key={btn.key}
                  variant={sortBy === btn.key ? 'default' : 'outline'}
                  onClick={() => setSortBy(btn.key as any)}
                  size="sm"
                  className={`text-xs md:text-sm ${sortBy !== btn.key ? "bg-background/50 border-border/50" : ""}`}
                >
                  By {btn.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Storage List */}
      <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="font-audrey">Gallery Storage Usage</CardTitle>
          <CardDescription>
            Storage usage by individual galleries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>)}
            </div>
          ) : storageData.galleryStorage.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <HardDrive className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No galleries to display</p>
            </div>
          ) : (
            <div className="space-y-3">
              {storageData.galleryStorage.map((gallery, index) => (
                <motion.div
                  key={gallery.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border/40 rounded-xl bg-background/40 hover:bg-background/60 hover:border-primary/20 transition-all duration-300 gap-4"
                >
                  <div className="flex items-start md:items-center space-x-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold font-audrey text-foreground truncate">{gallery.title}</h3>
                        {getStatusBadge(gallery.status, gallery.size)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{gallery.photographer}</span>
                        <span className="hidden md:inline">•</span>
                        <span>{gallery.photoCount} photos</span>
                        <span className="hidden md:inline">•</span>
                        <span>{new Date(gallery.lastModified).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 pl-14 md:pl-0">
                    <div className="text-right">
                      <div className="font-bold font-mono text-sm">{formatSize(gallery.size)}</div>
                      <div className="text-[10px] text-muted-foreground">storage used</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:w-auto md:px-3 md:py-2">
                        <Archive className="h-4 w-4 md:mr-1.5" />
                        <span className="hidden md:inline">Archive</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}