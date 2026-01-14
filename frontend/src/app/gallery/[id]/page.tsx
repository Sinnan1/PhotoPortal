"use client";

import type React from "react";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useGallery, useUpdateGallery } from "@/hooks/queries/useGalleries";
import { useFolder, useSetFolderCover } from "@/hooks/queries/useFolders";
import { useDeletePhoto } from "@/hooks/queries/usePhotos";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Lock, LockOpen, Download, Calendar, User, Images, Loader2, Trash2, Heart, Star, ChevronRight, ChevronDown, Folder as FolderIcon, Grid3X3, RectangleHorizontal, Menu, X, Settings } from "lucide-react";
import type { Photo, Folder, Gallery } from "@/types";
import Image from "next/image";
import { PhotoLightbox } from "@/components/photo/photo-lightbox";

import { PhotoGrid } from "@/components/photo/photo-grid";
import { FolderGrid } from "@/components/gallery/folder-grid";
import { FolderTiles } from "@/components/gallery/folder-tiles";
import { BreadcrumbNavigation } from "@/components/layout/breadcrumb-navigation";
import { CompactFolderTree } from "@/components/gallery/compact-folder-tree";
import { useAuth } from "@/lib/auth-context";
import { DownloadProgress } from "@/components/ui/download-progress";
import { useDownloadProgress } from "@/hooks/use-download-progress";
import { SelectionCounter } from "@/components/ui/selection-counter";
import { GallerySelectionSummary } from "@/components/ui/gallery-selection-summary";
import { DownloadWarningModal } from "@/components/ui/download-warning-modal";
import { MultipartDownloadModal } from "@/components/ui/multipart-download-modal";
import { formatBytes } from "@/lib/utils";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";

// Import the API base URL and getAuthToken function
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
// Direct download URL should include /api suffix
const DIRECT_DOWNLOAD_URL = process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_URL
  ? `${process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_URL}/api`
  : API_BASE_URL;

function getAuthToken() {
  if (typeof document === "undefined") return null

  // First try to get token from cookie
  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("auth-token="))
    ?.split("=")[1]

  if (cookieToken) return cookieToken

  // Fallback: try to get token from localStorage
  try {
    const user = localStorage.getItem("user")
    if (user) {
      const userData = JSON.parse(user)
      // Check if we have a token stored somewhere else
      const storedToken = localStorage.getItem("auth-token")
      if (storedToken) return storedToken
    }
  } catch (error) {
    console.error("Error reading from localStorage:", error)
  }

  return null
}

function GalleryPage() {
  const params = useParams();
  const galleryId = params.id as string;
  const { showToast } = useToast();
  const { user } = useAuth();

  // Track presence while viewing this gallery
  usePresenceHeartbeat(galleryId);



  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isDownloadingCurrent, setIsDownloadingCurrent] = useState(false);
  const [filter, setFilter] = useState<"all" | "liked" | "favorited">("all");
  const [dataSaverMode, setDataSaverMode] = useState(false);
  const [showFolderTree, setShowFolderTree] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "tile">("grid");

  // Download confirmation modal state
  const [downloadModal, setDownloadModal] = useState<{
    open: boolean;
    type: 'all' | 'folder' | 'liked' | 'favorited' | null;
    count: number;
    size: number;
    folderId?: string;
    folderName?: string;
  }>({ open: false, type: null, count: 0, size: 0 });

  const [multipartModal, setMultipartModal] = useState<{
    open: boolean;
    parts: any[];
  }>({ open: false, parts: [] });

  // React Query hooks
  const { data: gallery, isLoading: galleryLoading, error: galleryError } = useGallery(galleryId, { password });
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const { data: folderData, isLoading: folderLoading } = useFolder(currentFolderId || "");

  const setFolderCoverMutation = useSetFolderCover();
  const deletePhotoMutation = useDeletePhoto();
  const updateGalleryMutation = useUpdateGallery();

  // Derived state
  const loading = galleryLoading || (!!currentFolderId && folderLoading);
  const currentFolder = folderData || (gallery?.folders?.find(f => f.id === currentFolderId) ?? null);
  const passwordRequired = galleryError?.message?.toLowerCase().includes("password") || (galleryError as any)?.response?.status === 401 || (galleryError as any)?.response?.status === 403;

  // Download progress hooks
  const downloadAllProgress = useDownloadProgress();
  const downloadCurrentProgress = useDownloadProgress();

  // Selection tracking state
  const [selectionCounts, setSelectionCounts] = useState<{
    [folderId: string]: {
      selectedCount: number;
      likedCount: number;
      favoritedCount: number;
      postedCount: number;
    }
  }>({});

  // Folder navigation state
  // const [currentFolder, setCurrentFolder] = useState<Folder | null>(null); // Replaced by derived state
  const [breadcrumbItems, setBreadcrumbItems] = useState<Array<{ id: string, name: string, type: 'gallery' | 'folder' }>>([]);

  // Type alias for breadcrumb items
  type BreadcrumbItemType = 'gallery' | 'folder';

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const PHOTOS_PER_PAGE = 50; // Good balance for performance and UX

  // Refs for components to trigger refreshes
  const gallerySelectionSummaryRef = useRef<{ refreshData: () => void } | null>(null);
  const currentFolderSelectionCounterRef = useRef<{ refreshCounts: () => void } | null>(null);

  // Keep gallery photos in sync when a photo's like/favorite status changes without re-fetching
  // Keep gallery photos in sync when a photo's like/favorite status changes without re-fetching
  // React Query handles this via invalidation, but we can keep this empty or remove it if not used by children
  // The children components might expect this prop, so we'll keep a dummy or update children
  const handlePhotoStatusChange = (photoId: string, status: { liked?: boolean; favorited?: boolean; posted?: boolean }) => {
    // React Query invalidation handles the updates
  };

  useEffect(() => {
    // Check if we need to force refresh (coming from manage page)
    const searchParams = new URLSearchParams(window.location.search);
    const shouldRefresh = searchParams.get('refresh');

    if (shouldRefresh) {
      // Clear URL parameter after using it
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [galleryId]);

  // Initialize current folder and breadcrumbs when gallery loads
  useEffect(() => {
    if (gallery && gallery.folders && gallery.folders.length > 0 && !currentFolderId) {
      const rootFolder = gallery.folders[0];
      setCurrentFolderId(rootFolder.id);
    }
  }, [gallery, currentFolderId]);

  // Update breadcrumbs when currentFolder changes
  useEffect(() => {
    if (gallery && currentFolder) {
      // Build complete breadcrumb path by traversing folder hierarchy
      const buildBreadcrumbPath = (targetFolder: any): Array<{ id: string, name: string, type: BreadcrumbItemType }> => {
        // Find the folder in the gallery structure to build the path
        const findFolderPath = (folders: any[], targetId: string, currentPath: string[] = []): string[] | null => {
          for (const folder of folders) {
            if (folder.id === targetId) {
              return [...currentPath, folder.id];
            }
            if (folder.children && folder.children.length > 0) {
              const childPath = findFolderPath(folder.children, targetId, [...currentPath, folder.id]);
              if (childPath) {
                return childPath;
              }
            }
          }
          return null;
        };

        const folderPath = findFolderPath(gallery.folders || [], targetFolder.id);
        if (folderPath) {
          // Build path from gallery root to current folder
          let currentFolders = gallery.folders || [];
          const breadcrumbItems: Array<{ id: string, name: string, type: BreadcrumbItemType }> = [{ id: gallery.id, name: gallery.title, type: 'gallery' as BreadcrumbItemType }];

          for (let i = 0; i < folderPath.length; i++) {
            const folderId = folderPath[i];
            const folder = currentFolders.find(f => f.id === folderId);
            if (folder) {
              breadcrumbItems.push({ id: folder.id, name: folder.name, type: 'folder' as BreadcrumbItemType });
              currentFolders = folder.children || [];
            }
          }

          return breadcrumbItems;
        }

        // Fallback: just show gallery and current folder
        return [
          { id: gallery.id, name: gallery.title, type: 'gallery' as BreadcrumbItemType },
          { id: targetFolder.id, name: targetFolder.name, type: 'folder' as BreadcrumbItemType }
        ];
      };

      const newBreadcrumbs = buildBreadcrumbPath(currentFolder);
      setBreadcrumbItems(newBreadcrumbs);
    }
  }, [gallery, currentFolder]);

  // Set initial sidebar state - collapsed by default for slideout behavior
  useEffect(() => {
    setSidebarCollapsed(true);
  }, []);

  // Handle ESC key to close slideout menu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarCollapsed]);



  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // setVerifying(true); // Handled by useGallery loading state when password changes
    // Just triggering re-render with new password will cause useGallery to refetch
  };

  const handleDownload = async (photoId: string) => {
    try {
      const photo = gallery?.folders?.flatMap(f => f?.photos || []).find(p => p.id === photoId);
      if (!photo) {
        throw new Error("Photo not found");
      }

      // Pass gallery password if gallery is password-protected
      await api.downloadPhotoData(photoId, photo.filename, passwordRequired ? password : undefined);
    } catch (error) {
      console.error("Download failed", error);
      showToast("Download failed", "error");
    }
  };

  // Show download confirmation modal for current folder
  const handleDownloadCurrentFolder = () => {
    if (!currentFolder) return;
    setDownloadModal({
      open: true,
      type: 'folder',
      count: galleryPhotoCounts.folder,
      size: galleryPhotoCounts.folderSize,
      folderId: currentFolder.id,
      folderName: currentFolder.name
    });
  };

  // Show download confirmation modal for all photos
  const handleDownloadAll = () => {
    setDownloadModal({
      open: true,
      type: 'all',
      count: galleryPhotoCounts.all,
      size: galleryPhotoCounts.allSize
    });
  };

  // Show download confirmation modal for liked photos
  const handleDownloadLiked = () => {
    setDownloadModal({
      open: true,
      type: 'liked',
      count: galleryPhotoCounts.liked,
      size: galleryPhotoCounts.likedSize
    });
  };

  // Show download confirmation modal for favorited photos
  const handleDownloadFavorited = () => {
    setDownloadModal({
      open: true,
      type: 'favorited',
      count: galleryPhotoCounts.favorited,
      size: galleryPhotoCounts.favoritedSize
    });
  };

  // Handle confirmed download from modal
  const handleConfirmDownload = async () => {
    if (!downloadModal.type) return;

    const filterType = downloadModal.type;
    const folderId = downloadModal.folderId;
    setDownloadModal(prev => ({ ...prev, open: false }));

    try {
      console.log(`Starting ${filterType} photos download for gallery:`, galleryId);

      // Build request options based on download type
      const options: { filter: string; folderId?: string } = { filter: filterType };
      if (filterType === 'folder' && folderId) {
        options.folderId = folderId;
      }

      const response = await api.createDownloadTicket(galleryId, options);
      console.log("Download ticket response:", response);
      if (response && response.downloadUrl) {
        if (response.strategy === 'MULTIPART_MANIFEST') {
          // It's a multipart download, fetch the manifest
          try {
            const manifestResponse = await fetch(response.downloadUrl);
            const data = await manifestResponse.json();
            setMultipartModal({
              open: true,
              parts: data.parts
            });
          } catch (error) {
            console.error("Failed to fetch multipart manifest:", error);
            showToast("Failed to prepare download", "error");
          }
        } else {
          // Direct stream, use standard browser download
          window.location.href = response.downloadUrl;
        }
      } else {
        showToast("Failed to get download URL", "error");
      }
    } catch (error) {
      console.error(`Failed to start ${filterType} photos download:`, error);
      showToast(error instanceof Error ? error.message : "Failed to start download", "error");
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      await deletePhotoMutation.mutateAsync(photoId);
      showToast("Photo deleted", "success");
    } catch (error) {
      console.error("Failed to delete photo", error);
      showToast("Failed to delete photo", "error");
    }
  };

  const handleSetCoverPhoto = async (folderId: string, photoId: string) => {
    try {
      await setFolderCoverMutation.mutateAsync({ folderId, photoId: photoId || undefined });
      showToast(photoId ? "Cover photo set successfully" : "Cover photo removed", "success");
    } catch (error) {
      console.error("Failed to set cover photo", error);
      showToast("Failed to set cover photo", "error");
    }
  };

  const handleImageError = (photoId: string) => {
    setImageErrors(prev => new Set(prev).add(photoId));
  };


  // Folder navigation functions
  const handleFolderSelect = async (folderId: string) => {
    setCurrentFolderId(folderId);
    setCurrentPage(1);
  };

  const handleBreadcrumbNavigate = async (itemId: string, type: 'gallery' | 'folder') => {
    if (type === 'gallery') {
      // Navigate back to gallery root
      if (gallery && gallery.folders && gallery.folders.length > 0) {
        const rootFolder = gallery.folders[0];
        setCurrentFolderId(rootFolder.id);
        setCurrentPage(1);
      }
    } else {
      // Navigate to specific folder
      await handleFolderSelect(itemId);
    }
  };

  const filteredPhotos = useMemo(() => {
    if (!currentFolder) return [];
    if (filter === "liked") {
      return (currentFolder.photos || []).filter((p) => p.likedBy?.some((like) => like.userId === user?.id));
    }
    if (filter === "favorited") {
      return (currentFolder.photos || []).filter((p) => p.favoritedBy?.some((fav) => fav.userId === user?.id));
    }
    return currentFolder.photos || [];
  }, [currentFolder, filter, user]);

  // Paginated photos
  const paginatedPhotos = useMemo(() => {
    const startIndex = (currentPage - 1) * PHOTOS_PER_PAGE;
    const endIndex = startIndex + PHOTOS_PER_PAGE;
    return filteredPhotos.slice(startIndex, endIndex);
  }, [filteredPhotos, currentPage, PHOTOS_PER_PAGE]);

  const totalPages = Math.ceil(filteredPhotos.length / PHOTOS_PER_PAGE);

  // Calculate photo counts and sizes for all download types
  const galleryPhotoCounts = useMemo(() => {
    if (!gallery) return {
      all: 0, allSize: 0,
      folder: 0, folderSize: 0,
      liked: 0, likedSize: 0,
      favorited: 0, favoritedSize: 0
    };

    const allPhotos = gallery.folders?.flatMap(f => f?.photos || []) || [];
    const allSize = allPhotos.reduce((sum, p) => sum + (p.fileSize || 0), 0);

    // Current folder photos
    const folderPhotos = currentFolder?.photos || [];
    const folderSize = folderPhotos.reduce((sum, p) => sum + (p.fileSize || 0), 0);

    // Liked and favorited (requires user)
    const likedPhotos = user ? allPhotos.filter(p => p.likedBy?.some(like => like.userId === user.id)) : [];
    const favoritedPhotos = user ? allPhotos.filter(p => p.favoritedBy?.some(fav => fav.userId === user.id)) : [];

    const likedSize = likedPhotos.reduce((sum, p) => sum + (p.fileSize || 0), 0);
    const favoritedSize = favoritedPhotos.reduce((sum, p) => sum + (p.fileSize || 0), 0);

    return {
      all: allPhotos.length,
      allSize,
      folder: folderPhotos.length,
      folderSize,
      liked: likedPhotos.length,
      favorited: favoritedPhotos.length,
      likedSize,
      favoritedSize
    };
  }, [gallery, user, currentFolder]);

  // Reset to page 1 when filter or folder changes
  useEffect(() => {
    setCurrentPage(1);
    // Store last page in localStorage
    if (currentFolder) {
      localStorage.setItem(`gallery-${galleryId}-folder-${currentFolder.id}-page`, '1');
    }
  }, [filter, currentFolder?.id, galleryId]);

  // Restore last page from localStorage on folder load
  useEffect(() => {
    if (currentFolder) {
      const savedPage = localStorage.getItem(`gallery-${galleryId}-folder-${currentFolder.id}-page`);
      if (savedPage) {
        setCurrentPage(parseInt(savedPage, 10));
      }
    }
  }, [currentFolder, galleryId]);

  // Save current page to localStorage
  useEffect(() => {
    if (currentFolder) {
      localStorage.setItem(`gallery-${galleryId}-folder-${currentFolder.id}-page`, currentPage.toString());
    }
  }, [currentPage, currentFolder, galleryId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <CardTitle>Password Required</CardTitle>
            <CardDescription>
              This gallery is password protected. Please enter the password to
              view photos.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handlePasswordSubmit}>
            <CardContent className="space-y-4">
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter gallery password"
                required
              />
              <Button type="submit" className="w-full" disabled={galleryLoading}>
                {galleryLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Access Gallery
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Gallery Not Found
          </h1>
          <p className="text-gray-600 mt-2">
            The gallery you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  if (gallery.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Gallery Expired</h1>
          <p className="text-gray-600 mt-2">
            This gallery is no longer available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ willChange: 'scroll-position' }}>
      {/* Modern Gallery Sidebar */}
      <div
        className={`fixed inset-0 z-50 ${sidebarCollapsed ? 'pointer-events-none' : 'pointer-events-auto'}`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${sidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}
          onClick={() => setSidebarCollapsed(true)}
        />

        {/* Modern Sidebar */}
        <div
          className={`absolute left-0 top-0 h-full w-80 bg-background border-r shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}`}
        >
          {/* Header */}
          <div className="flex-shrink-0 p-6 border-b">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-2xl font-bold tracking-tight">Folders</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setSidebarCollapsed(true)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Navigate your gallery</p>
          </div>

          {/* Main Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Selection Progress Card */}
            {gallery && user && (
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Selection Progress</span>
                      <Badge variant="secondary" className="text-xs">
                        {currentFolder && (currentFolder.photos || []).length > 0
                          ? Math.round(((currentFolder.photos || []).filter(p => p.likedBy?.some((like) => like.userId === user?.id) || p.favoritedBy?.some((fav) => fav.userId === user?.id)).length / (currentFolder.photos || []).length) * 100)
                          : 0}%
                      </Badge>
                    </div>
                    {/* Progress Bar */}
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-300"
                        style={{
                          width: currentFolder && (currentFolder.photos || []).length > 0
                            ? `${Math.round(((currentFolder.photos || []).filter(p => p.likedBy?.some((like) => like.userId === user?.id) || p.favoritedBy?.some((fav) => fav.userId === user?.id)).length / (currentFolder.photos || []).length) * 100)}%`
                            : '0%'
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {currentFolder
                          ? (currentFolder.photos || []).filter(p => p.likedBy?.some((like) => like.userId === user?.id) || p.favoritedBy?.some((fav) => fav.userId === user?.id)).length
                          : 0} photos selected
                      </span>
                      <span>of {currentFolder?._count?.photos || 0} total</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Folder Navigation */}
            <div>
              <button
                onClick={() => setShowFolderTree(!showFolderTree)}
                className="flex items-center justify-between w-full mb-3 group"
              >
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Your Folders
                </h3>
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showFolderTree ? 'rotate-90' : ''}`}
                />
              </button>

              {showFolderTree && (
                <div className="space-y-1">
                  {gallery.folders?.map((folder, index) => {
                    const isActive = currentFolder?.id === folder.id;
                    const likedCount = (folder.photos || []).filter(p => p.likedBy?.some((like) => like.userId === user?.id)).length;
                    const favoritedCount = (folder.photos || []).filter(p => p.favoritedBy?.some((fav) => fav.userId === user?.id)).length;

                    return (
                      <div key={folder.id}>
                        {/* Main Folder Button */}
                        <button
                          onClick={() => handleFolderSelect(folder.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg transition-all group ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted'}`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <FolderIcon
                              className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}
                            />
                            <span className="font-medium truncate">{folder.name}</span>
                          </div>
                          <Badge
                            variant={isActive ? "secondary" : "outline"}
                            className="ml-2 flex-shrink-0"
                          >
                            {folder._count?.photos || 0}
                          </Badge>
                        </button>

                        {/* Selection Stats (below folder) */}
                        {(likedCount > 0 || favoritedCount > 0) && (
                          <div
                            className={`flex items-center gap-3 px-3 py-2 ml-7 text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                          >
                            {likedCount > 0 && (
                              <div className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                <span>{likedCount}/{folder._count?.photos || 0}</span>
                              </div>
                            )}
                            {favoritedCount > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                <span>{favoritedCount}/{folder._count?.photos || 0}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Render child folders recursively */}
                        {folder.children && folder.children.length > 0 && (
                          <div className="ml-4 mt-1 border-l-2 border-border pl-2">
                            <CompactFolderTree
                              folder={folder as any}
                              level={1}
                              currentFolderId={currentFolder?.id}
                              onFolderSelect={handleFolderSelect}
                              isFirst={false}
                              showSelectionCounters={!!user}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Gallery-wide Selection Summary */}
            {gallery && user && (
              <Card className="border-2">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-3">Gallery Summary</h3>
                  <GallerySelectionSummary
                    ref={gallerySelectionSummaryRef}
                    galleryId={galleryId}
                    compact={true}
                    showFolderBreakdown={false}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Footer - Edit Gallery Button */}
          {user?.role === "PHOTOGRAPHER" && (
            <div className="flex-shrink-0 p-6 border-t bg-muted/30">
              <Link href={`/galleries/${galleryId}/manage`}>
                <Button
                  variant="default"
                  size="lg"
                  className="w-full shadow-sm"
                  onClick={() => setSidebarCollapsed(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Gallery
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Locked Gallery Banner for Clients */}
      {gallery.isLocked && user?.role === 'CLIENT' && (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6 mb-6 text-center">
          <Lock className="mx-auto h-8 w-8 text-primary mb-3" />
          <h3 className="text-lg font-semibold text-primary mb-2">
            Thank You for Your Selection
          </h3>
          <p className="text-muted-foreground text-sm">
            You can view your images anytime with your provided credentials.
          </p>
        </div>
      )}

      {/* Modern Gallery Header Section */}
      <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-6">
        {/* Top Bar: Title + Main Actions */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full flex-shrink-0"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            >
              {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </Button>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight truncate">{gallery.title}</h1>
          </div>

          {/* Download Actions - Grouped in Dropdown (only show if user has download permission) */}
          {(gallery.canDownload !== false) && (
            <DropdownMenu modal={true}>
              <DropdownMenuTrigger asChild>
                <Button className="shadow-sm flex-shrink-0 h-9 px-3 sm:h-10 sm:px-4">
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-[60]">
                {/* Show message if no photos available */}
                {(!currentFolder?.photos || currentFolder.photos.length === 0) &&
                  (!(gallery.folders?.flatMap(f => f?.photos || []) || []).length) && (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      No photos available to download
                    </div>
                  )}

                {/* Current Folder Download */}
                {currentFolder && currentFolder.photos && currentFolder.photos.length > 0 && (
                  <DropdownMenuItem onClick={handleDownloadCurrentFolder} disabled={isDownloadingCurrent}>
                    {isDownloadingCurrent ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FolderIcon className="mr-2 h-4 w-4" />
                    )}
                    Current Folder ({currentFolder.photos.length})
                  </DropdownMenuItem>
                )}

                {/* Download All */}
                {(gallery.folders?.flatMap(f => f?.photos || []) || []).length > 0 && (
                  <DropdownMenuItem onClick={handleDownloadAll} disabled={isDownloadingAll}>
                    {isDownloadingAll ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Images className="mr-2 h-4 w-4" />
                    )}
                    All Photos ({(gallery.folders?.flatMap(f => f?.photos || []) || []).length})
                  </DropdownMenuItem>
                )}

                {/* Divider */}
                {user && (galleryPhotoCounts.liked > 0 || galleryPhotoCounts.favorited > 0) && (
                  <div className="my-1 h-px bg-border" />
                )}

                {/* Download Liked */}
                {user && galleryPhotoCounts.liked > 0 && (
                  <DropdownMenuItem onClick={handleDownloadLiked}>
                    <Heart className="mr-2 h-4 w-4 text-red-500" />
                    Liked Photos ({galleryPhotoCounts.liked})
                  </DropdownMenuItem>
                )}

                {/* Download Favorited */}
                {user && galleryPhotoCounts.favorited > 0 && (
                  <DropdownMenuItem onClick={handleDownloadFavorited}>
                    <Star className="mr-2 h-4 w-4 text-yellow-500" />
                    Favorited Photos ({galleryPhotoCounts.favorited})
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Lock Toggle Button - Only for Photographers */}
          {user?.role === 'PHOTOGRAPHER' && (
            <Button
              variant={gallery.isLocked ? "default" : "outline"}
              className={`shadow-sm flex-shrink-0 h-9 px-3 sm:h-10 sm:px-4 ${gallery.isLocked ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
              onClick={async () => {
                try {
                  await updateGalleryMutation.mutateAsync({
                    id: galleryId,
                    data: { isLocked: !gallery.isLocked }
                  });
                  showToast(
                    gallery.isLocked ? 'Selection unlocked' : 'Selection locked',
                    'success'
                  );
                } catch (error) {
                  showToast('Failed to update lock status', 'error');
                }
              }}
              disabled={updateGalleryMutation.isPending}
              title={gallery.isLocked ? 'Click to unlock selection' : 'Click to lock selection'}
            >
              {updateGalleryMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
              ) : gallery.isLocked ? (
                <Lock className="h-4 w-4 sm:mr-2" />
              ) : (
                <LockOpen className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">{gallery.isLocked ? 'Locked' : 'Lock'}</span>
            </Button>
          )}
        </div>

        {/* Description (if exists) */}
        {gallery.description && (
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg max-w-3xl">{gallery.description}</p>
        )}

        {/* Navigation Bar: Breadcrumb + Info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 px-3 sm:px-4 bg-muted/30 rounded-xl border">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 min-w-0">
            {/* Breadcrumb */}
            <div className="min-w-0">
              <BreadcrumbNavigation
                items={breadcrumbItems}
                onNavigate={handleBreadcrumbNavigate}
              />
            </div>

            {/* Divider - Hidden on mobile */}
            <div className="hidden sm:block h-5 w-px bg-border flex-shrink-0" />

            {/* Gallery Info */}
            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">{gallery.photographer?.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Images className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>{currentFolder?.photos?.length ?? currentFolder?._count?.photos ?? 0} photos</span>
              </div>
            </div>
          </div>

          {/* Data Saver Toggle */}
          <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Data Saver</span>
            <div className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors ${dataSaverMode ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
              <input
                type="checkbox"
                checked={dataSaverMode}
                onChange={(e) => setDataSaverMode(e.target.checked)}
                className="sr-only"
              />
              <span className={`inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 transform rounded-full bg-background transition-transform ${dataSaverMode ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0.5 sm:translate-x-1'}`} />
            </div>
          </label>
        </div>

        {/* Folder Selector Dropdown */}
        {gallery.folders && gallery.folders.length > 0 && (
          <DropdownMenu modal={true}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto justify-between gap-2 h-11 px-4 bg-background border-2 hover:bg-muted/50 transition-all"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FolderIcon className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="font-medium truncate">{currentFolder?.name || "Select Folder"}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="secondary" className="ml-1">
                    {currentFolder?._count?.photos || 0}
                  </Badge>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[280px] sm:w-[320px] max-h-[400px] overflow-y-auto z-[60]">
              {/* Recursively render all folders */}
              {(() => {
                const renderFolderItems = (folders: Folder[], level: number = 0): React.ReactNode => {
                  return folders.map((folder) => {
                    const isActive = currentFolder?.id === folder.id;
                    const indent = level * 16; // 16px indent per level

                    return (
                      <div key={folder.id}>
                        <DropdownMenuItem
                          onClick={() => handleFolderSelect(folder.id)}
                          className={`cursor-pointer ${isActive ? 'bg-primary/10 font-semibold' : ''}`}
                          style={{ paddingLeft: `${12 + indent}px` }}
                        >
                          <div className="flex items-center justify-between w-full gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FolderIcon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span className="truncate">{folder.name}</span>
                            </div>
                            <Badge variant={isActive ? "default" : "secondary"} className="flex-shrink-0 text-xs">
                              {folder._count?.photos || 0}
                            </Badge>
                          </div>
                        </DropdownMenuItem>
                        {/* Render child folders if they exist */}
                        {folder.children && folder.children.length > 0 && renderFolderItems(folder.children, level + 1)}
                      </div>
                    );
                  });
                };

                return renderFolderItems(gallery.folders || []);
              })()}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Control Bar: View Mode + Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* View Mode Toggle */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg border">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 sm:h-9 px-3 sm:px-4 flex-1 sm:flex-initial"
            >
              <Grid3X3 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
            <Button
              variant={viewMode === "tile" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("tile")}
              className="h-8 sm:h-9 px-3 sm:px-4 flex-1 sm:flex-initial"
            >
              <RectangleHorizontal className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Tile</span>
            </Button>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className="h-8 sm:h-9 px-2.5 sm:px-4 whitespace-nowrap flex-shrink-0"
            >
              <span className="hidden sm:inline">All</span>
              <span className="sm:hidden">All</span>
              <Badge variant="secondary" className="ml-1.5 sm:ml-2 text-xs">
                {currentFolder ? (currentFolder.photos || []).length : 0}
              </Badge>
            </Button>
            <Button
              variant={filter === "liked" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("liked")}
              className="h-8 sm:h-9 px-2.5 sm:px-4 whitespace-nowrap flex-shrink-0"
            >
              <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Liked</span>
              <Badge variant="secondary" className="ml-1.5 sm:ml-2 text-xs">
                {currentFolder ? (currentFolder.photos || []).filter(p => p.likedBy?.some((like) => like.userId === user?.id)).length : 0}
                {gallery.likeLimit !== null && gallery.likeLimit !== undefined && (
                  <span className="opacity-60">/{gallery.likeLimit}</span>
                )}
              </Badge>
            </Button>
            <Button
              variant={filter === "favorited" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("favorited")}
              className="h-8 sm:h-9 px-2.5 sm:px-4 whitespace-nowrap flex-shrink-0"
            >
              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Favorited</span>
              <Badge variant="secondary" className="ml-1.5 sm:ml-2 text-xs">
                {currentFolder ? (currentFolder.photos || []).filter(p => p.favoritedBy?.some((fav) => fav.userId === user?.id)).length : 0}
                {gallery.favoriteLimit !== null && gallery.favoriteLimit !== undefined && (
                  <span className="opacity-60">/{gallery.favoriteLimit}</span>
                )}
              </Badge>
            </Button>
          </div>
        </div>

        {/* Download Progress Indicators */}
        {(downloadAllProgress.progressState.isActive || downloadCurrentProgress.progressState.isActive) && (
          <div className="space-y-3">
            {downloadAllProgress.progressState.isActive && downloadAllProgress.progressState.downloadId && (
              <DownloadProgress
                downloadId={downloadAllProgress.progressState.downloadId}
                onComplete={(filename) => {
                  showToast(`All photos download completed: ${filename}`, "success");
                  downloadAllProgress.resetProgress();
                }}
                onError={(error) => {
                  showToast(`Download failed: ${error}`, "error");
                  downloadAllProgress.resetProgress();
                }}
              />
            )}

            {downloadCurrentProgress.progressState.isActive && downloadCurrentProgress.progressState.downloadId && (
              <DownloadProgress
                downloadId={downloadCurrentProgress.progressState.downloadId}
                onComplete={(filename) => {
                  showToast(`Folder download completed: ${filename}`, "success");
                  downloadCurrentProgress.resetProgress();
                }}
                onError={(error) => {
                  showToast(`Download failed: ${error}`, "error");
                  downloadCurrentProgress.resetProgress();
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Folder Tiles Section */}
      {currentFolder && currentFolder.children && currentFolder.children.length > 0 && (
        <FolderTiles
          folders={currentFolder.children}
          isPhotographer={user?.role === "PHOTOGRAPHER"}
          onFolderSelect={handleFolderSelect}
          onSetCoverPhoto={user?.role === "PHOTOGRAPHER" ? handleSetCoverPhoto : undefined}
          showSelectionCounters={!!user}
        />
      )}



      {/* Photo Grid Section */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Photos</h2>
            {/* Current Folder Selection Counter */}
            {currentFolder && user && (
              <SelectionCounter
                ref={currentFolderSelectionCounterRef}
                folderId={currentFolder.id}
                totalPhotos={(currentFolder.photos || []).length}
                compact={true}
                showBreakdown={true}
                className="text-xs sm:text-sm"
                onCountsUpdate={(counts) => {
                  setSelectionCounts(prev => ({
                    ...prev,
                    [currentFolder.id]: counts
                  }));
                }}
              />
            )}
          </div>
          <span className="text-xs sm:text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({filteredPhotos.length} total)
          </span>
        </div>

        {paginatedPhotos.length === 0 && !loading ? (
          <div className="text-center py-12">
            <Images className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium">
              No photos to display
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === "all" ? "This folder is empty." : `You have no ${filter} photos in this folder.`}
            </p>
          </div>
        ) : (
          <>
            {currentFolder && (
              <FolderGrid
                folder={{
                  ...currentFolder,
                  photos: paginatedPhotos
                }}
                isPhotographer={user?.role === "PHOTOGRAPHER"}
                isLocked={gallery.isLocked && user?.role === 'CLIENT'}
                onPhotoView={(photo) => setSelectedPhoto(photo)}
                onFolderSelect={handleFolderSelect}
                onPhotoStatusChange={handlePhotoStatusChange}
                onSetCoverPhoto={user?.role === "PHOTOGRAPHER" ? handleSetCoverPhoto : undefined}
                viewMode={viewMode}
              />
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-8">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="hidden sm:inline-flex"
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3"
                  >
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage <= 2) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 1) {
                        pageNum = totalPages - 2 + i;
                      } else {
                        pageNum = currentPage - 1 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-9 sm:w-10 px-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {totalPages > 3 && currentPage < totalPages - 1 && (
                      <>
                        <span className="px-1 text-xs">...</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className="w-9 sm:w-10 px-0"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3"
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="hidden sm:inline-flex"
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          photos={filteredPhotos}
          onClose={() => setSelectedPhoto(null)}
          onNext={() => {
            const currentIndex = filteredPhotos.findIndex(
              (p) => p.id === selectedPhoto.id
            );
            const nextIndex = (currentIndex + 1) % filteredPhotos.length;
            setSelectedPhoto(filteredPhotos[nextIndex]);
          }}
          onPrevious={() => {
            const currentIndex = filteredPhotos.findIndex(
              (p) => p.id === selectedPhoto.id
            );
            const prevIndex =
              currentIndex === 0 ? filteredPhotos.length - 1 : currentIndex - 1;
            setSelectedPhoto(filteredPhotos[prevIndex]);
          }}
          onDownload={() => handleDownload(selectedPhoto.id)}
          onPhotoStatusChange={handlePhotoStatusChange}
          dataSaverMode={dataSaverMode}
          canDownload={gallery.canDownload !== false}
          selectionLimits={{
            likeLimit: gallery.likeLimit ?? null,
            favoriteLimit: gallery.favoriteLimit ?? null
          }}
        />
      )}

      {/* Download Confirmation Modal */}
      <DownloadWarningModal
        open={downloadModal.open}
        onOpenChange={(open) => setDownloadModal(prev => ({ ...prev, open }))}
        onConfirm={handleConfirmDownload}
        downloadType={
          downloadModal.type === 'all' ? 'All Photos' :
            downloadModal.type === 'folder' ? `"${downloadModal.folderName || 'Folder'}"` :
              downloadModal.type === 'liked' ? 'Liked Photos' :
                downloadModal.type === 'favorited' ? 'Favorited Photos' : 'Photos'
        }
        photoCount={downloadModal.count}
        estimatedSize={downloadModal.size}
      />

      <MultipartDownloadModal
        open={multipartModal.open}
        onOpenChange={(open) => setMultipartModal(prev => ({ ...prev, open }))}
        parts={multipartModal.parts}
      />
    </div>
  );
}

export default GalleryPage; 
