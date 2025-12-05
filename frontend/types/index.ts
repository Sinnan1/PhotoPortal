/**
 * Central Type Definitions for Photo Portal Frontend
 * 
 * This file serves as the single source of truth for all shared types and interfaces
 * across the application. Previously, these types were duplicated across 14+ files.
 * 
 * IMPORTANT: All components should import types from this file using:
 * import type { Photo, Folder, Gallery, User } from "@/types"
 */

// ============================================================================
// User Types
// ============================================================================

/**
 * Base User interface for authentication and general user data.
 * Note: Admin components may extend this with additional fields like
 * suspendedAt, suspendedReason, etc.
 */
export interface User {
    id: string;
    email: string;
    name: string;
    role: "PHOTOGRAPHER" | "CLIENT" | "ADMIN";
}

/**
 * Extended User interface for admin management components.
 * Includes additional fields for user management functionality.
 */
export interface AdminUser extends User {
    createdAt?: string;
    suspendedAt?: string | null;
    suspendedReason?: string | null;
    isApproved?: boolean;
    canDownload?: boolean;
}

// ============================================================================
// Photo Types
// ============================================================================

/**
 * Photo interface representing a single photo in the gallery system.
 * All photo-related components should use this interface.
 */
export interface Photo {
    id: string;
    filename: string;
    thumbnailUrl: string;
    mediumUrl?: string;
    largeUrl?: string;
    originalUrl: string;
    fileSize?: number;
    downloadCount?: number;
    createdAt: string;
    likedBy?: { userId: string }[];
    favoritedBy?: { userId: string }[];
    postBy?: { userId: string }[];
}

/**
 * Extended Photo interface with folder context.
 * Used in liked/favorites/posts pages where photos need folder/gallery context.
 */
export interface PhotoWithContext extends Photo {
    folder: {
        id: string;
        name: string;
        gallery: {
            id: string;
            title: string;
            photographer: {
                name: string;
            };
        };
    };
}

/**
 * Photo interface for analytics views with count aggregations.
 * Used in analytics pages where like/favorite counts are needed.
 */
export interface PhotoWithCounts extends Photo {
    _count: {
        likedBy?: number;
        favoritedBy?: number;
    };
}

// ============================================================================
// Folder Types
// ============================================================================

/**
 * Folder interface representing a folder in the gallery hierarchy.
 * Folders can contain photos and child folders.
 */
export interface Folder {
    id: string;
    name: string;
    coverPhoto?: Photo;
    children?: Folder[];
    photos?: Photo[];
    _count?: {
        photos: number;
        children?: number;
    };
}

/**
 * Simplified folder interface for child folder references.
 * Used in file-list and similar components where full folder data isn't needed.
 */
export interface ChildFolder {
    id: string;
    name: string;
    _count: {
        photos: number;
        children: number;
    };
}

// ============================================================================
// Gallery Types
// ============================================================================

/**
 * Gallery interface representing a photo gallery.
 * Contains metadata, folders, and user interaction data.
 */
export interface Gallery {
    id: string;
    title: string;
    description: string;
    photoCount: number;
    downloadCount: number;
    expiresAt: string | null;
    shootDate?: string | null;
    createdAt: string;
    isExpired: boolean;
    downloadLimit?: number | null;
    canDownload?: boolean;
    password?: string | null;
    groupId?: string | null;
    folders?: Folder[];
    likedBy: { userId: string }[];
    favoritedBy: { userId: string }[];
    totalSize?: number;
    photographer?: {
        name: string;
        email?: string;
    };
    _count?: {
        likedBy: number;
        favoritedBy: number;
        folders?: number;
    };
}

/**
 * Extended Gallery interface for admin management views.
 * Includes additional fields for admin oversight functionality.
 */
export interface AdminGallery {
    id: string;
    title: string;
    photographer: {
        name: string;
        email: string;
    };
    createdAt: string;
    isPublic: boolean;
    _count?: {
        folders: number;
    };
    stats?: {
        totalPhotos: number;
        totalFolders: number;
        totalLikes?: number;
        totalFavorites?: number;
        totalViews?: number;
        storageUsed: number;
        clientsWithAccess: number;
    };
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Photo status for tracking like/favorite state.
 */
export interface PhotoStatus {
    photoId: string;
    liked: boolean;
    favorited: boolean;
}

/**
 * Photo status update payload for status change callbacks.
 * Used by components to notify parents of status changes.
 */
export interface PhotoStatusUpdate {
    liked?: boolean;
    favorited?: boolean;
    posted?: boolean;
}
