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
  HardDrive,
  ArrowRightLeft,
  Loader2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { useStorageData, formatStorageSize } from "@/hooks/use-storage-data";
import { TotalPhotoCount, PhotoCount } from "@/components/admin/PhotoCount";
import { ClientActivityMetrics } from "@/components/admin/ClientActivityMetrics";
import type { AdminGallery } from "@/types";

interface Photographer {
  id: string;
  name: string;
  email: string;
}

export default function AdminGalleriesPage() {
  const [galleries, setGalleries] = useState<AdminGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalGalleries, setTotalGalleries] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'archived' | 'large'>('all');
  const { toast } = useToast();

  // Transfer modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<AdminGallery | null>(null);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [selectedPhotographer, setSelectedPhotographer] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  const [loadingPhotographers, setLoadingPhotographers] = useState(false);

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
    fetchStorageData(); // Fetch storage from centralized analytics API
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

  // Fetch photographers for transfer modal
  const fetchPhotographers = async () => {
    try {
      setLoadingPhotographers(true);
      const response = await adminApi.getAllUsers({ role: 'PHOTOGRAPHER', limit: 100 });
      setPhotographers(response.data.users || []);
    } catch (error) {
      console.error('Failed to fetch photographers:', error);
      toast({
        title: "Error",
        description: "Failed to load photographers",
        variant: "destructive",
      });
    } finally {
      setLoadingPhotographers(false);
    }
  };

  // Open transfer modal
  const openTransferModal = (gallery: AdminGallery) => {
    setSelectedGallery(gallery);
    setSelectedPhotographer("");
    setTransferModalOpen(true);
    fetchPhotographers();
  };

  // Handle transfer
  const handleTransfer = async () => {
    if (!selectedGallery || !selectedPhotographer) return;

    try {
      setTransferring(true);
      const response = await adminApi.transferGalleryOwnership(selectedGallery.id, selectedPhotographer);
      toast({
        title: "Success",
        description: response.message || "Gallery transferred successfully",
      });
      setTransferModalOpen(false);
      fetchGalleries(); // Refresh list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to transfer gallery",
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  // Use centralized storage hook for accurate B2 data
  const { totalStorageBytes, fetchStorageData, loading: storageLoading } = useStorageData();

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
      {/* Transfer Modal */}
      <AnimatePresence>
        {transferModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setTransferModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background rounded-xl border border-border p-6 w-full max-w-md m-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Transfer Gallery Ownership</h3>
                <Button variant="ghost" size="icon" onClick={() => setTransferModalOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {selectedGallery && (
                <div className="space-y-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Gallery</p>
                    <p className="font-medium">{selectedGallery.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Current owner: {selectedGallery.photographer.name}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Transfer to</label>
                    {loadingPhotographers ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <select
                        className="w-full p-2 rounded-lg border border-border bg-background"
                        value={selectedPhotographer}
                        onChange={(e) => setSelectedPhotographer(e.target.value)}
                      >
                        <option value="">Select a photographer...</option>
                        {photographers
                          .filter(p => p.id !== selectedGallery.photographerId)
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.email})
                            </option>
                          ))}
                      </select>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setTransferModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={!selectedPhotographer || transferring}
                      onClick={handleTransfer}
                    >
                      {transferring ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Transferring...
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="h-4 w-4 mr-2" />
                          Transfer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-audrey text-gray-900 dark:text-gray-100">Gallery Oversight</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 md:mt-2">
            Monitor and manage all galleries across the platform
          </p>
        </div>
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border/50"
                      onClick={() => openTransferModal(gallery)}
                      title="Transfer ownership"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
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