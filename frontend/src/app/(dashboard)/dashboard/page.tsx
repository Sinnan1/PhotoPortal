"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { useGalleries, useDeleteGallery, useLikeGallery, useUnlikeGallery, useFavoriteGallery, useUnfavoriteGallery, useSearchGalleries } from "@/hooks/queries/useGalleries";
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
import { GalleryDateModal } from "@/components/gallery/gallery-date-modal";
import { GalleryGroupAssignmentModal } from "@/components/gallery/gallery-group-assignment-modal";
import { TimelineView } from "@/components/timeline/TimelineView";
import { ViewModeSelector } from "@/components/timeline/ViewModeSelector";
import { SearchBar } from "@/components/dashboard/SearchBar";
import { SearchResults } from "@/components/dashboard/SearchResults";
import { GalleryGrid } from "@/components/dashboard/GalleryGrid";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ShortcutsHelpModal } from "@/components/ShortcutsHelpModal";
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
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

  const [viewMode, setViewMode] = useState<'timeline' | 'all' | 'recent'>('timeline');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showGroupAssignmentModal, setShowGroupAssignmentModal] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [galleryToEditDate, setGalleryToEditDate] = useState<Gallery | null>(null);

  const [galleryToAssignGroup, setGalleryToAssignGroup] = useState<Gallery | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const { data: searchResults = [], isLoading: isSearching } = useSearchGalleries(searchQuery, dateRange ? { from: dateRange.from, to: dateRange.to } : undefined);

  const isSearchActive = !!searchQuery || !!dateRange?.from;

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onEscape: () => {
      setShowCreateModal(false);
      setShowShareModal(false);
      setShowAccessModal(false);
      setShowDateModal(false);
      setShowGroupAssignmentModal(false);
      setShowShortcutsHelp(false);
    },
    onSearch: () => {
      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      searchInput?.focus();
    },
    onNewGallery: () => setShowCreateModal(true),
    onShowHelp: () => setShowShortcutsHelp(true),
  });

  // Sort galleries
  const sortGalleries = (galleriesToSort: Gallery[]) => {
    const sorted = [...galleriesToSort];
    switch (sortBy) {
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.shootDate || b.createdAt).getTime() - new Date(a.shootDate || a.createdAt).getTime());
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.shootDate || a.createdAt).getTime() - new Date(b.shootDate || b.createdAt).getTime());
      case 'name-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'name-desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      case 'likes':
        return sorted.sort((a, b) => (b._count?.likedBy || 0) - (a._count?.likedBy || 0));
      case 'size':
        return sorted.sort((a, b) => (b.totalSize || 0) - (a.totalSize || 0));
      default:
        return sorted;
    }
  };

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

  const handleAddDate = (gallery: Gallery) => {
    setGalleryToEditDate(gallery);
    setShowDateModal(true);
  };

  const handleManageGroup = (gallery: Gallery) => {
    setGalleryToAssignGroup(gallery);
    setShowGroupAssignmentModal(true);
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

  // Filter galleries for "Recent" view (last 20)
  const recentGalleries = [...galleries].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 20);

  const displayedGalleries = viewMode === 'recent' ? sortGalleries(recentGalleries) : sortGalleries(galleries);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight font-serif text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground font-light text-lg tracking-wide">
            Manage your photo galleries
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          size="lg"
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-black/5 rounded-full px-8 h-12 font-medium tracking-wide transition-all duration-300 hover:scale-105"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Gallery
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-12 animate-in fade-in slide-in-from-top-6 duration-700 delay-50">
        <SearchBar
          onSearch={(query, range) => {
            setSearchQuery(query);
            setDateRange(range);
          }}
          className="w-full max-w-2xl"
        />
      </div>

      {/* Quick Access Cards - Premium Design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 animate-in fade-in slide-in-from-top-8 duration-700 delay-100">
        {/* Liked Photos Card */}
        <Link href="/dashboard/liked" className="group">
          <div className="h-full relative overflow-hidden rounded-2xl border border-border/50 bg-white/40 dark:bg-card/40 backdrop-blur-sm p-6 hover:border-border hover:bg-white/60 dark:hover:bg-card/60 transition-all duration-500 group-hover:-translate-y-1 shadow-sm hover:shadow-md">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] dark:opacity-5 group-hover:opacity-[0.07] dark:group-hover:opacity-10 transition-opacity duration-500 scale-150 group-hover:scale-100 transform origin-top-right">
              <Heart className="w-32 h-32 text-foreground" />
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="w-12 h-12 rounded-full bg-background/50 flex items-center justify-center border border-border/50 group-hover:border-red-500/20 group-hover:bg-red-500/10 transition-colors duration-500">
                <Heart className="h-5 w-5 text-muted-foreground group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors duration-500" />
              </div>
              <div>
                <h3 className="text-xl font-serif font-medium text-foreground group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors mb-1">Liked Photos</h3>
                <p className="text-sm text-muted-foreground font-light">Curated collection of your top picks</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Favorites Card */}
        <Link href="/dashboard/favorites" className="group">
          <div className="h-full relative overflow-hidden rounded-2xl border border-border/50 bg-white/40 dark:bg-card/40 backdrop-blur-sm p-6 hover:border-border hover:bg-white/60 dark:hover:bg-card/60 transition-all duration-500 group-hover:-translate-y-1 shadow-sm hover:shadow-md">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] dark:opacity-5 group-hover:opacity-[0.07] dark:group-hover:opacity-10 transition-opacity duration-500 scale-150 group-hover:scale-100 transform origin-top-right">
              <Star className="w-32 h-32 text-foreground" />
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="w-12 h-12 rounded-full bg-background/50 flex items-center justify-center border border-border/50 group-hover:border-yellow-500/20 group-hover:bg-yellow-500/10 transition-colors duration-500">
                <Star className="h-5 w-5 text-muted-foreground group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors duration-500" />
              </div>
              <div>
                <h3 className="text-xl font-serif font-medium text-foreground group-hover:text-yellow-700 dark:group-hover:text-yellow-300 transition-colors mb-1">Favorites</h3>
                <p className="text-sm text-muted-foreground font-light">Your absolute favorite moments</p>
              </div>
            </div>
          </div>
        </Link>

        {/* For Posts Card */}
        <Link href="/dashboard/posts" className="group">
          <div className="h-full relative overflow-hidden rounded-2xl border border-border/50 bg-white/40 dark:bg-card/40 backdrop-blur-sm p-6 hover:border-border hover:bg-white/60 dark:hover:bg-card/60 transition-all duration-500 group-hover:-translate-y-1 shadow-sm hover:shadow-md">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] dark:opacity-5 group-hover:opacity-[0.07] dark:group-hover:opacity-10 transition-opacity duration-500 scale-150 group-hover:scale-100 transform origin-top-right">
              <Share2 className="w-32 h-32 text-foreground" />
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="w-12 h-12 rounded-full bg-background/50 flex items-center justify-center border border-border/50 group-hover:border-purple-500/20 group-hover:bg-purple-500/10 transition-colors duration-500">
                <Share2 className="h-5 w-5 text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-500 transition-colors duration-500" />
              </div>
              <div>
                <h3 className="text-xl font-serif font-medium text-foreground group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors mb-1">For Posts</h3>
                <p className="text-sm text-muted-foreground font-light">Ready for social media sharing</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Galleries Section Header with View Selector */}
      {!isSearchActive && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 animate-in fade-in slide-in-from-top-8 duration-700 delay-200">
          <h2 className="text-3xl font-bold tracking-tight font-serif text-foreground">Your Galleries</h2>
          <ViewModeSelector currentMode={viewMode} onChange={setViewMode} sortBy={sortBy} onSortChange={setSortBy} />
        </div>
      )}

      <div className="animate-in fade-in slide-in-from-top-12 duration-700 delay-300">
        {isSearchActive ? (
          <SearchResults
            results={searchResults}
            isLoading={isSearching}
            query={searchQuery}
          />
        ) : viewMode === 'timeline' ? (
          <TimelineView
            onGalleryClick={(id: string) => window.location.href = `/gallery/${id}`}
            onAddDate={handleAddDate}
          />
        ) : (
          <GalleryGrid
            galleries={displayedGalleries}
            isLoading={loading}
            onManageGroup={handleManageGroup}
            onAddDate={handleAddDate}
            onShare={handleShareGallery}
            onManageAccess={handleManageAccess}
            onDelete={handleDeleteGallery}
            onCreateGallery={() => setShowCreateModal(true)}
          />
        )}
      </div>

      <CreateGalleryModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          // No need to manually fetch, React Query handles invalidation
          setShowCreateModal(false);
        }}
      />

      <GalleryDateModal
        open={showDateModal}
        onOpenChange={setShowDateModal}
        gallery={galleryToEditDate}
      />

      {selectedGallery && (
        <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share Gallery</DialogTitle>
              <DialogDescription>
                Share this link with your clients to give them access.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2 mt-4">
              <div className="grid flex-1 gap-2">
                <Input
                  defaultValue={`${window.location.origin}/gallery/${selectedGallery.id}`}
                  readOnly
                  className="h-10"
                />
              </div>
              <Button
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/gallery/${selectedGallery.id}`
                  );
                  showToast("Link copied to clipboard", "success");
                }}
                className="h-10 w-10"
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

      <GalleryGroupAssignmentModal
        open={showGroupAssignmentModal}
        onOpenChange={setShowGroupAssignmentModal}
        gallery={galleryToAssignGroup}
      />

      <ShortcutsHelpModal
        open={showShortcutsHelp}
        onOpenChange={setShowShortcutsHelp}
      />
    </div>
  );
}
