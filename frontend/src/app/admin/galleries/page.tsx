"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  FolderOpen, 
  Search, 
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
  Users,
  Image,
  Calendar,
  HardDrive
} from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { TotalPhotoCount, PhotoCount } from "@/components/admin/PhotoCount";
import type { AdminGallery } from "@/types";

export default function AdminGalleriesPage() {
  const [galleries, setGalleries] = useState<AdminGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalGalleries, setTotalGalleries] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchGalleries();
  }, [searchQuery]);

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllGalleries({
        search: searchQuery || undefined,
        limit: 50,
      });
      
      setGalleries(response.data.galleries);
      setTotalGalleries(response.data.pagination?.total || 0);
    } catch (error: any) {
      console.error('Failed to fetch galleries:', error);
      toast({
        title: "Error",
        description: "Failed to load galleries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const storageStats = {
    used: parseFloat((totalGalleries * 0.1).toFixed(1)), // Estimate 100MB per gallery
    total: 10,
    percentage: Math.min(Math.round((totalGalleries * 0.1 / 10) * 100), 100)
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="text-green-600 border-green-600">Public</Badge>;
      case "private":
        return <Badge variant="secondary">Private</Badge>;
      case "archived":
        return <Badge variant="secondary">Archived</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gallery Oversight</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor and manage all galleries across the platform
          </p>
        </div>
      </div>

      {/* Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Galleries</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{totalGalleries}</div>
                <p className="text-xs text-muted-foreground">
                  Created by photographers
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <TotalPhotoCount galleries={galleries} loading={loading} />
                <p className="text-xs text-muted-foreground">
                  Actual count across all galleries
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
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
                <div className="text-2xl font-bold">{storageStats.used} GB</div>
                <div className="mt-2">
                  <Progress value={storageStats.percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {storageStats.percentage}% of {storageStats.total} GB used
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

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
              <Button variant="outline">All Galleries</Button>
              <Button variant="outline">Active</Button>
              <Button variant="outline">Archived</Button>
              <Button variant="outline">Large Files</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Galleries Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Galleries</CardTitle>
          <CardDescription>
            Complete overview of all galleries with management options
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
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : galleries.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No galleries found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery ? 'Try adjusting your search terms' : 'Galleries will appear here when photographers create them'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {galleries.map((gallery) => (
                <div key={gallery.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-lg bg-[#425146] flex items-center justify-center">
                      <FolderOpen className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{gallery.title}</h3>
                        {getStatusBadge(gallery.isPublic ? "active" : "private")}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {gallery.photographer.name}
                        </div>
                        <div className="flex items-center">
                          <PhotoCount 
                            initialCount={gallery.stats?.totalPhotos} 
                            showLabel={false}
                            className="text-sm text-gray-500 dark:text-gray-400"
                          />
                          <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
                            {gallery.stats?.totalPhotos === 1 ? 'photo' : 'photos'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <FolderOpen className="h-3 w-3 mr-1" />
                          {gallery.stats?.totalFolders || gallery._count?.folders || 0} folders
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(gallery.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Photographer: {gallery.photographer.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
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