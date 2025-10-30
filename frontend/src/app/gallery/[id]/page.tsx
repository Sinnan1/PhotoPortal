"use client";

import type React from "react";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Download, Calendar, User, Images, Loader2, Trash2, Heart, Star, ChevronRight, Folder, Grid3X3, RectangleHorizontal, Menu, X, Settings } from "lucide-react";
import Image from "next/image";
import { PhotoLightbox } from "@/components/photo-lightbox";

import { PhotoGrid } from "@/components/photo-grid";
import { FolderGrid } from "@/components/folder-grid";
import { FolderTiles } from "@/components/folder-tiles";
import { BreadcrumbNavigation } from "@/components/breadcrumb-navigation";
import { CompactFolderTree } from "@/components/compact-folder-tree";
import { useAuth } from "@/lib/auth-context";
import { DownloadFilteredPhotos } from "@/components/ui/download-filtered-photos";
import { DownloadProgress } from "@/components/ui/download-progress";
import { useDownloadProgress } from "@/hooks/use-download-progress";
import { SelectionCounter } from "@/components/ui/selection-counter";
import { GallerySelectionSummary } from "@/components/ui/gallery-selection-summary";

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

interface Photo {
  id: string;
  filename: string;
  thumbnailUrl: string;
  originalUrl: string;
  createdAt: string;
  likedBy: { userId: string }[];
  favoritedBy: { userId: string }[];
  postBy: { userId: string }[];
}

interface Folder {
  id: string;
  name: string;
  children: Folder[];
  photos: Photo[];
  coverPhoto?: Photo;
  _count: {
    photos: number;
    children: number;
  };
}

interface Gallery {
  id: string;
  title: string;
  description: string;
  expiresAt: string | null;
  downloadLimit: number | null;
  downloadCount: number;
  isExpired: boolean;
  photographer: {
    name: string;
  };
  folders: Folder[];
}

function GalleryPage() {
  const params = useParams();
  const galleryId = params.id as string;
  const { showToast } = useToast();
  const { user } = useAuth();


  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRequired, setPasswordRequired] = useState(false);
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
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
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
  const handlePhotoStatusChange = (photoId: string, status: { liked?: boolean; favorited?: boolean; posted?: boolean }) => {

    // Update current folder state
    setCurrentFolder((prevFolder) => {
      if (!prevFolder) return prevFolder;

      return {
        ...prevFolder,
        photos: prevFolder.photos.map((p) => {
          if (p.id !== photoId) return p;
          const currentLiked = (p.likedBy ?? []).some((l) => l.userId === user?.id);
          const currentFav = (p.favoritedBy ?? []).some((f) => f.userId === user?.id);
          const currentPosted = (p.postBy ?? []).some((post) => post.userId === user?.id);
          return {
            ...p,
            likedBy:
              status.liked === undefined
                ? p.likedBy
                : status.liked
                  ? [...(p.likedBy ?? []), { userId: user!.id }]
                  : (p.likedBy ?? []).filter((l) => l.userId !== user?.id),
            favoritedBy:
              status.favorited === undefined
                ? p.favoritedBy
                : status.favorited
                  ? [...(p.favoritedBy ?? []), { userId: user!.id }]
                  : (p.favoritedBy ?? []).filter((f) => f.userId !== user?.id),
            postBy:
              status.posted === undefined
                ? p.postBy
                : status.posted
                  ? [...(p.postBy ?? []), { userId: user!.id }]
                  : (p.postBy ?? []).filter((post) => post.userId !== user?.id),
          } as Photo;
        })
      };
    });

    // Update selection counts for the current folder
    if (currentFolder) {
      setSelectionCounts(prev => {
        const currentCounts = prev[currentFolder.id] || { selectedCount: 0, likedCount: 0, favoritedCount: 0, postedCount: 0 };
        const newCounts = { ...currentCounts };

        // Update individual counts based on status changes
        if (status.liked !== undefined) {
          newCounts.likedCount += status.liked ? 1 : -1;
        }
        if (status.favorited !== undefined) {
          newCounts.favoritedCount += status.favorited ? 1 : -1;
        }
        if (status.posted !== undefined) {
          newCounts.postedCount += status.posted ? 1 : -1;
        }

        // Recalculate selected count (photos with any selection)
        // This is an approximation - for exact counts, the SelectionCounter will refresh from API
        newCounts.selectedCount = Math.max(0, Math.max(newCounts.likedCount, newCounts.favoritedCount, newCounts.postedCount));

        return {
          ...prev,
          [currentFolder.id]: newCounts
        };
      });
    }

    // Update gallery state to keep everything in sync
    setGallery((prev) => {
      if (!prev) return prev;
      const updatedFolders = prev.folders.map((folder) => ({
        ...folder,
        photos: folder.photos.map((p) => {
          if (p.id !== photoId) return p;
          const currentLiked = (p.likedBy ?? []).some((l) => l.userId === user?.id);
          const currentFav = (p.favoritedBy ?? []).some((f) => f.userId === user?.id);
          const currentPosted = (p.postBy ?? []).some((post) => post.userId === user?.id);
          return {
            ...p,
            likedBy:
              status.liked === undefined
                ? p.likedBy
                : status.liked
                  ? [...(p.likedBy ?? []), { userId: user!.id }]
                  : (p.likedBy ?? []).filter((l) => l.userId !== user?.id),
            favoritedBy:
              status.favorited === undefined
                ? p.favoritedBy
                : status.favorited
                  ? [...(p.favoritedBy ?? []), { userId: user!.id }]
                  : (p.favoritedBy ?? []).filter((f) => f.userId !== user?.id),
            postBy:
              status.posted === undefined
                ? p.postBy
                : status.posted
                  ? [...(p.postBy ?? []), { userId: user!.id }]
                  : (p.postBy ?? []).filter((post) => post.userId !== user?.id),
          } as Photo;
        })
      }));
      return { ...prev, folders: updatedFolders };
    });

    // Trigger refreshes of selection counter components
    // This ensures the counters update immediately with accurate data from the API
    if (gallerySelectionSummaryRef.current) {
      gallerySelectionSummaryRef.current.refreshData();
    }
    if (currentFolderSelectionCounterRef.current) {
      currentFolderSelectionCounterRef.current.refreshCounts();
    }
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

    fetchGallery();
  }, [galleryId]);

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

  const fetchGallery = async () => {
    try {
      // Add cache-busting parameter if refresh is requested
      const searchParams = new URLSearchParams(window.location.search);
      const shouldRefresh = searchParams.get('refresh');

      const response = await api.getGallery(galleryId, shouldRefresh ? { refresh: shouldRefresh } : {});
      const galleryData = response.data;



      setGallery(galleryData);

      // Set up initial folder navigation
      if (galleryData.folders && galleryData.folders.length > 0) {
        const rootFolder = galleryData.folders[0]; // Use first folder as default
        setCurrentFolder(rootFolder);
        setBreadcrumbItems([
          { id: galleryData.id, name: galleryData.title, type: 'gallery' },
          { id: rootFolder.id, name: rootFolder.name, type: 'folder' }
        ]);
      }
    } catch (error: any) {
      if (error.message.toLowerCase().includes("password")) {
        setPasswordRequired(true);
      } else {
        showToast("Failed to load gallery", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);

    try {
      // Re-fetch gallery providing password header so backend authorizes
      const response = await api.getGallery(galleryId, { password });
      setGallery(response.data);
      setPasswordRequired(false);
    } catch (error) {
      showToast("Incorrect password", "error");
    } finally {
      setVerifying(false);
    }
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

  const handleDownloadCurrentFolder = async () => {
    if (!currentFolder) return;
    try {
      const response = await api.createDownloadTicket(galleryId, { folderId: currentFolder.id, filter: 'folder' });
      window.location.href = response.data.downloadUrl;
    } catch (error) {
      console.error("Failed to start download:", error);
      showToast("Failed to start download", "error");
    }
  };

  const handleDownloadAll = async () => {
    try {
      const response = await api.createDownloadTicket(galleryId, { filter: 'all' });
      window.location.href = response.data.downloadUrl;
    } catch (error) {
      console.error("Failed to start download:", error);
      showToast("Failed to start download", "error");
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      await api.deletePhoto(photoId);
      setGallery((prevGallery) => {
        if (!prevGallery) return null;
        return {
          ...prevGallery,
          folders: prevGallery.folders?.map(folder => ({
            ...folder,
            photos: folder.photos.filter((p) => p.id !== photoId),
            _count: {
              ...folder._count,
              photos: folder.photos.filter((p) => p.id !== photoId).length
            }
          }))
        };
      });
      showToast("Photo deleted", "success");
    } catch (error) {
      console.error("Failed to delete photo", error);
      showToast("Failed to delete photo", "error");
    }
  };

  const handleSetCoverPhoto = async (folderId: string, photoId: string) => {
    try {
      await api.setFolderCover(folderId, photoId || undefined);
      showToast(photoId ? "Cover photo set successfully" : "Cover photo removed", "success");
      
      // Refresh the gallery to update cover photos
      await fetchGallery();
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
    try {
      const response = await api.getFolder(folderId);
      const folder = response.data;

      // Update current folder
      setCurrentFolder(folder);

      // Build complete breadcrumb path by traversing folder hierarchy
      const buildBreadcrumbPath = (targetFolder: any): Array<{ id: string, name: string, type: BreadcrumbItemType }> => {
        const path = [{ id: targetFolder.id, name: targetFolder.name, type: 'folder' as BreadcrumbItemType }];

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

        const folderPath = findFolderPath(gallery!.folders, targetFolder.id);
        if (folderPath) {
          // Build path from gallery root to current folder
          let currentFolders = gallery!.folders;
          const breadcrumbItems: Array<{ id: string, name: string, type: BreadcrumbItemType }> = [{ id: gallery!.id, name: gallery!.title, type: 'gallery' as BreadcrumbItemType }];

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
          { id: gallery!.id, name: gallery!.title, type: 'gallery' as BreadcrumbItemType },
          { id: targetFolder.id, name: targetFolder.name, type: 'folder' as BreadcrumbItemType }
        ];
      };

      const newBreadcrumbs = buildBreadcrumbPath(folder);
      setBreadcrumbItems(newBreadcrumbs);

      // Reset to page 1 for new folder
      setCurrentPage(1);

    } catch (error) {
      showToast("Failed to load folder", "error");
    }
  };

  const handleBreadcrumbNavigate = async (itemId: string, type: 'gallery' | 'folder') => {
    if (type === 'gallery') {
      // Navigate back to gallery root
      if (gallery && gallery.folders && gallery.folders.length > 0) {
        const rootFolder = gallery.folders[0];
        setCurrentFolder(rootFolder);
        setBreadcrumbItems([
          { id: gallery.id, name: gallery.title, type: 'gallery' },
          { id: rootFolder.id, name: rootFolder.name, type: 'folder' }
        ]);
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
      return currentFolder.photos.filter((p) => p.likedBy?.some((like) => like.userId === user?.id));
    }
    if (filter === "favorited") {
      return currentFolder.photos.filter((p) => p.favoritedBy?.some((fav) => fav.userId === user?.id));
    }
    return currentFolder.photos;
  }, [currentFolder, filter, user]);

  // Paginated photos
  const paginatedPhotos = useMemo(() => {
    const startIndex = (currentPage - 1) * PHOTOS_PER_PAGE;
    const endIndex = startIndex + PHOTOS_PER_PAGE;
    return filteredPhotos.slice(startIndex, endIndex);
  }, [filteredPhotos, currentPage, PHOTOS_PER_PAGE]);

  const totalPages = Math.ceil(filteredPhotos.length / PHOTOS_PER_PAGE);

  // Calculate liked and favorited photo counts for the entire gallery
  const galleryPhotoCounts = useMemo(() => {
    if (!gallery || !user) return { liked: 0, favorited: 0 };

    const allPhotos = gallery.folders?.flatMap(f => f?.photos || []) || [];
    const likedCount = allPhotos.filter(p => p.likedBy?.some(like => like.userId === user.id)).length;
    const favoritedCount = allPhotos.filter(p => p.favoritedBy?.some(fav => fav.userId === user.id)).length;

    return { liked: likedCount, favorited: favoritedCount };
  }, [gallery, user]);

  // Reset to page 1 when filter or folder changes
  useEffect(() => {
    setCurrentPage(1);
    // Store last page in localStorage
    if (currentFolder) {
      localStorage.setItem(`gallery-${galleryId}-folder-${currentFolder.id}-page`, '1');
    }
  }, [filter, currentFolder, galleryId]);

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
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter gallery password"
                required
              />
              <Button type="submit" className="w-full" disabled={verifying}>
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
      {/* Slideout Sidebar */}
      <div
        className={`fixed inset-0 z-50 ${sidebarCollapsed ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${sidebarCollapsed ? 'opacity-0' : 'opacity-100'
            }`}
          onClick={() => setSidebarCollapsed(true)}
        />

        {/* Sidebar */}
        <div
          className={`absolute left-0 top-0 h-full w-80 bg-background border-r border-border shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col ${sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
            }`}
        >
          {/* Main Content Area */}
          <div className="flex-1 p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Folders</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSidebarCollapsed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Gallery Selection Summary */}
            {gallery && user && (
              <div className="mb-6">
                <GallerySelectionSummary
                  ref={gallerySelectionSummaryRef}
                  galleryId={galleryId}
                  compact={true}
                  showFolderBreakdown={false}
                  className="mb-4"
                />
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Toggle Folders</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowFolderTree(!showFolderTree)}
              >
                <ChevronRight className={`h-3 w-3 transition-transform ${showFolderTree ? 'rotate-90' : ''}`} />
              </Button>
            </div>

            {showFolderTree && (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {gallery.folders?.map((folder, index) => (
                  <CompactFolderTree
                    key={folder.id}
                    folder={folder as any}
                    level={0}
                    currentFolderId={currentFolder?.id}
                    onFolderSelect={handleFolderSelect}
                    isFirst={index === 0}
                    showSelectionCounters={!!user}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Edit Gallery Button - At the very bottom */}
          {user?.role === "PHOTOGRAPHER" && (
            <div className="flex-shrink-0 p-4 border-t border-border bg-background/95 backdrop-blur-sm">
              <Link href={`/galleries/${galleryId}/manage`}>
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => setSidebarCollapsed(true)}
                >
                  <Settings className="h-4 w-4" />
                  Edit Gallery
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Gallery Header */}
      <div className="mb-8">
        <div className="flex-1 min-w-0">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-3 mb-2 sm:mb-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-muted"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
              >
                {sidebarCollapsed ? (
                  <Menu className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
              <h1 className="text-3xl font-bold">{gallery.title}</h1>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Standard Download Buttons */}
              <div className="flex items-center space-x-2">
                {/* Download Current Folder Button */}
                {currentFolder && currentFolder.photos && currentFolder.photos.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadCurrentFolder}
                    disabled={isDownloadingCurrent}
                    className="mr-2"
                  >
                    {isDownloadingCurrent ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Current Folder
                  </Button>
                )}

                {/* Download All Button */}
                {gallery.folders?.flatMap(f => f?.photos || []).length > 0 && (
                  <Button onClick={handleDownloadAll} disabled={isDownloadingAll}>
                    {isDownloadingAll ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download All
                  </Button>
                )}
              </div>

              {/* Filtered Download Components */}
              {user && (galleryPhotoCounts.liked > 0 || galleryPhotoCounts.favorited > 0) && (
                <DownloadFilteredPhotos
                  galleryId={galleryId}
                  galleryTitle={gallery.title}
                  galleryPassword={passwordRequired ? password : undefined}
                  likedCount={galleryPhotoCounts.liked}
                  favoritedCount={galleryPhotoCounts.favorited}
                  className="flex-shrink-0"
                />
              )}
            </div>
          </div>

          {/* Download Progress Indicators - Now using backend progress tracking */}
          <div className="space-y-3 mt-4">
            {/* Download All Progress */}
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

            {/* Download Current Folder Progress */}
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

          {gallery.description && (
            <p className="text-muted-foreground mb-4">{gallery.description}</p>
          )}

          {/* Breadcrumb Navigation */}
          <BreadcrumbNavigation
            items={breadcrumbItems}
            onNavigate={handleBreadcrumbNavigate}
            className="mb-4"
          />

          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center">
              <User className="mr-1 h-4 w-4" />
              {gallery.photographer.name}
            </div>
            <div className="flex items-center">
              <Images className="mr-1 h-4 w-4" />
              {currentFolder?._count?.photos ?? 0} photos
            </div>
          </div>
        </div>
      </div>

      {/* Controls Section - Fixed Layout */}
      <div className="space-y-4 mb-6">
        {/* Data Saver Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={dataSaverMode}
              onChange={(e) => setDataSaverMode(e.target.checked)}
              className="sr-only"
            />
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${dataSaverMode ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${dataSaverMode ? 'translate-x-6' : 'translate-x-1'
                }`} />
            </div>
            <span className="ml-2 text-sm text-foreground">
              Data Saver {dataSaverMode && <span className="text-primary font-medium">ON</span>}
            </span>
          </label>
        </div>

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

      {/* View Mode and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
        {/* View Mode Toggle */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-8 px-3"
          >
            <Grid3X3 className="h-4 w-4 mr-1" />
            Grid
          </Button>
          <Button
            variant={viewMode === "tile" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("tile")}
            className="h-8 px-3"
          >
            <RectangleHorizontal className="h-4 w-4 mr-1" />
            Tile
          </Button>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className="h-8"
          >
            All ({currentFolder ? currentFolder.photos.length : 0})
          </Button>
          <Button
            variant={filter === "liked" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("liked")}
            className="h-8"
          >
            <Heart className="mr-2 h-4 w-4" />
            Liked ({currentFolder ? currentFolder.photos.filter(p => p.likedBy?.some((like) => like.userId === user?.id)).length : 0})
          </Button>
          <Button
            variant={filter === "favorited" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("favorited")}
            className="h-8"
          >
            <Star className="mr-2 h-4 w-4" />
            Favorited ({currentFolder ? currentFolder.photos.filter(p => p.favoritedBy?.some((fav) => fav.userId === user?.id)).length : 0})
          </Button>
        </div>
      </div>

      {/* Photo Grid Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-foreground">Photos</h2>
            {/* Current Folder Selection Counter */}
            {currentFolder && user && (
              <SelectionCounter
                ref={currentFolderSelectionCounterRef}
                folderId={currentFolder.id}
                totalPhotos={currentFolder.photos.length}
                compact={true}
                showBreakdown={true}
                className="text-sm"
                onCountsUpdate={(counts) => {
                  setSelectionCounts(prev => ({
                    ...prev,
                    [currentFolder.id]: counts
                  }));
                }}
              />
            )}
          </div>
          <span className="text-sm text-muted-foreground">
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
                onPhotoView={(photo) => setSelectedPhoto(photo)}
                onFolderSelect={handleFolderSelect}
                onPhotoStatusChange={handlePhotoStatusChange}
                onSetCoverPhoto={user?.role === "PHOTOGRAPHER" ? handleSetCoverPhoto : undefined}
                viewMode={viewMode}
              />
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-2">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-10"
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
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
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
        />
      )}
    </div>
  );
}

export default GalleryPage; 
