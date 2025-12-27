"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { motion } from "framer-motion";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { TotalPhotoCount, PhotoCount } from "@/components/admin/PhotoCount";
import { ClientActivityMetrics } from "@/components/admin/ClientActivityMetrics";
import type { AdminGallery } from "@/types";

export default function AdminGalleriesPage() {
  const [galleries, setGalleries] = useState<AdminGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalGalleries, setTotalGalleries] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'archived' | 'large'>('all');
  const { toast } = useToast();

  // Large gallery threshold (number of photos)
  const LARGE_GALLERY_THRESHOLD = 50;

  // Filter galleries based on selected filter
  const filteredGalleries = useMemo(() => {
    switch (activeFilter) {
      case 'active':
        return galleries.filter(g => g.isPublic);
      case 'archived':
        return galleries.filter(g => !g.isPublic);
      case 'large':
        return galleries.filter(g => (g.stats?.totalPhotos || 0) >= LARGE_GALLERY_THRESHOLD);
      case 'all':
      default:
        return galleries;
    }
  }, [galleries, activeFilter]);

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
    used: parseFloat((totalGalleries * 0.1).toFixed(1)),
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
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-audrey text-gray-900 dark:text-gray-100">Gallery Oversight</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 md:mt-2">
            Monitor and manage all galleries across the platform
          </p>
        </div>
      </div>

      {/* Storage Overview - Compact 2x2 on Mobile */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm group hover:border-primary/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Galleries</CardTitle>
            <FolderOpen className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-6 bg-primary/10 rounded w-16"></div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xl md:text-2xl font-bold font-audrey">{totalGalleries}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">
                  Created by photographers
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm group hover:border-primary/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Photos</CardTitle>
            <Image className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-6 bg-primary/10 rounded w-16"></div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xl md:text-2xl font-bold font-audrey">
                  <TotalPhotoCount galleries={galleries} loading={loading} showLabel={false} />
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">
                  Across all galleries
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Span 2 cols on mobile if we have 3 items, or keep as grid-cols-2 so it wraps. 
            The 3rd one naturally drops to next row on 2-col grid. Ideally we want it full width on bottom row or just 2x2.
            Let's make it col-span-2 on mobile for better balance if we have 3 items. */}
        <Card className="col-span-2 md:col-span-1 border-border/50 bg-background/50 backdrop-blur-sm shadow-sm group hover:border-primary/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Storage Usage</CardTitle>
            <HardDrive className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-6 bg-primary/10 rounded w-16"></div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xl md:text-2xl font-bold font-audrey">{storageStats.used} GB</div>
                <div className="w-full">
                  <Progress value={storageStats.percentage} className="h-1.5 md:h-2" />
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                    {storageStats.percentage}% of {storageStats.total} GB
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters - Glassmorphic Stack */}
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
            <div className="grid grid-cols-2 sm:flex gap-2">
              <Button
                variant={activeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className={`text-xs md:text-sm ${activeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-background/50 border-border/50'}`}
                onClick={() => setActiveFilter('all')}
                aria-pressed={activeFilter === 'all'}
              >
                All
              </Button>
              <Button
                variant={activeFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                className={`text-xs md:text-sm ${activeFilter === 'active' ? 'bg-primary text-primary-foreground' : 'bg-background/50 border-border/50'}`}
                onClick={() => setActiveFilter('active')}
                aria-pressed={activeFilter === 'active'}
              >
                Active
              </Button>
              <Button
                variant={activeFilter === 'archived' ? 'default' : 'outline'}
                size="sm"
                className={`text-xs md:text-sm ${activeFilter === 'archived' ? 'bg-primary text-primary-foreground' : 'bg-background/50 border-border/50'}`}
                onClick={() => setActiveFilter('archived')}
                aria-pressed={activeFilter === 'archived'}
              >
                Archived
              </Button>
              <Button
                variant={activeFilter === 'large' ? 'default' : 'outline'}
                size="sm"
                className={`text-xs md:text-sm ${activeFilter === 'large' ? 'bg-primary text-primary-foreground' : 'bg-background/50 border-border/50'}`}
                onClick={() => setActiveFilter('large')}
                aria-pressed={activeFilter === 'large'}
              >
                Large
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Galleries List/Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-audrey font-bold">
            {filteredGalleries.length} {activeFilter === 'all' ? '' : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} `}Galleries
            {activeFilter !== 'all' && <span className="text-muted-foreground font-normal text-sm ml-2">(of {galleries.length} total)</span>}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 rounded-xl border border-border/50 bg-background/50 animate-pulse" />
            ))}
          </div>
        ) : filteredGalleries.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {activeFilter === 'all' ? 'No galleries found' : `No ${activeFilter} galleries found`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredGalleries.map((gallery, index) => (
              <motion.div
                key={gallery.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-md transition-all duration-300 flex flex-col">
                  <div className="p-4 flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                          <FolderOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-audrey font-bold text-lg truncate group-hover:text-primary transition-colors">{gallery.title}</h3>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(gallery.isPublic ? "active" : "private")}
                            <span className="text-xs text-muted-foreground truncate max-w-[100px]">{gallery.photographer.name}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-muted-foreground py-3 border-t border-border/40">
                      <div className="flex items-center gap-1.5">
                        <PhotoCount
                          initialCount={gallery.stats?.totalPhotos}
                          showLabel={true}
                          className="inline"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(gallery.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span>{gallery.stats?.totalFolders || gallery._count?.folders || 0} folders</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span className="truncate">{gallery.photographer.email.split('@')[0]}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-3 pt-0 mt-auto flex gap-2">
                    <Button size="sm" className="flex-1 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-none">
                      <Eye className="h-4 w-4 mr-1.5" /> View
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}