/**
 * Frontend API Library - Unified Server-Side Download Integration
 * 
 * This library provides frontend integration with the unified server-side download system.
 * All download functions now use server-side processing instead of client-side JSZip.
 * 
 * Download Functions:
 * - downloadAllPhotosUnified() - Downloads all photos in a gallery
 * - downloadFolderPhotosUnified() - Downloads photos in a specific folder
 * - downloadLikedPhotos() - Downloads user's liked photos
 * - downloadFavoritedPhotos() - Downloads user's favorited photos
 * 
 * All download functions:
 * - Return download IDs for progress tracking
 * - Use server-side zip creation with Archiver
 * - Support real-time progress updates
 * - Handle authentication automatically
 * - Provide consistent error handling
 * 
 * Migration Benefits:
 * - Eliminated client-side memory usage for zip creation
 * - Consistent progress tracking across all download types
 * - Better error handling and recovery
 * - Improved performance and reliability
 * 
 * @since Client-side JSZip migration completed
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

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

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken()

  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "API request failed")
  }

  return data
}

export const api = {
  // Auth APIs
  login: (credentials: { email: string; password: string }) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  register: (userData: { email: string; password: string; name: string; role?: string }) =>
    apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  // Client-specific auth
  clientLogin: (credentials: { email: string; password: string }) =>
    apiRequest("/auth/client-login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  getClientProfile: () => apiRequest("/auth/client-profile"),

  // Gallery APIs - Fixed endpoints to match your backend
  getGalleries: () => apiRequest("/galleries"),

  getClientGalleries: () => apiRequest("/galleries/client/accessible"),

  createGallery: (galleryData: any) =>
    apiRequest("/galleries", {
      method: "POST",
      body: JSON.stringify(galleryData),
    }),

  // Fixed: Use correct endpoint for public gallery access, optional password header
  getGallery: (id: string, options?: { password?: string; refresh?: string }) =>
    apiRequest(`/galleries/${id}${options?.refresh ? `?refresh=${options.refresh}` : ''}`, {
      headers: {
        ...(options?.password ? { 'x-gallery-password': options.password } : {}),
      },
    }),

  updateGallery: (id: string, data: any) =>
    apiRequest(`/galleries/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteGallery: (id: string) => apiRequest(`/galleries/${id}`, { method: "DELETE" }),

  verifyGalleryPassword: (id: string, password: string) =>
    apiRequest(`/galleries/${id}/verify-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  // Gallery Access Control APIs
  updateGalleryAccess: (galleryId: string, clientIds: string[], access: boolean) =>
    apiRequest(`/galleries/${galleryId}/access`, {
      method: "PUT",
      body: JSON.stringify({ clientIds, access }),
    }),

  getAllowedClients: (galleryId: string) =>
    apiRequest(`/galleries/${galleryId}/allowed-clients`),

  // Photo APIs - Fixed endpoints
  uploadPhotos: (galleryId: string, formData: FormData) => {
    const token = getAuthToken()
    return fetch(`${API_BASE_URL}/photos/upload/${galleryId}`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Don't set Content-Type for FormData - browser sets it automatically
      },
      body: formData,
    }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Upload failed")
      }
      return data
    })
  },

  getGalleryPhotos: (galleryId: string) => apiRequest(`/photos/gallery/${galleryId}`),

  deletePhoto: (id: string) => apiRequest(`/photos/${id}`, { method: "DELETE" }),

  // Download photo - returns the actual image data
  downloadPhoto: (id: string, galleryId?: string) => {
    const params = galleryId ? `?galleryId=${galleryId}` : ''
    return apiRequest(`/photos/${id}/download${params}`)
  },

  // New function for downloading photo data directly
  downloadPhotoData: async (id: string, filename: string, galleryPassword?: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/photos/${id}/download`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(galleryPassword && { 'x-gallery-password': galleryPassword }),
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Download failed");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Like/Favorite APIs
  likePhoto: (photoId: string) =>
    apiRequest(`/photos/${photoId}/like`, {
      method: "POST",
    }),

  unlikePhoto: (photoId: string) =>
    apiRequest(`/photos/${photoId}/like`, {
      method: "DELETE",
    }),

  favoritePhoto: (photoId: string) =>
    apiRequest(`/photos/${photoId}/favorite`, {
      method: "POST",
    }),

  unfavoritePhoto: (photoId: string) =>
    apiRequest(`/photos/${photoId}/favorite`, {
      method: "DELETE",
    }),

  postPhoto: (photoId: string) =>
    apiRequest(`/photos/${photoId}/post`, {
      method: "POST",
    }),

  unpostPhoto: (photoId: string) =>
    apiRequest(`/photos/${photoId}/post`, {
      method: "DELETE",
    }),

  getPosts: () =>
    apiRequest('/photos/posts'),

  getPhotoStatus: (photoId: string) =>
    apiRequest(`/photos/${photoId}/status`),

  getLikedPhotos: () => apiRequest("/photos/liked"),

  getFavoritedPhotos: () => apiRequest("/photos/favorited"),

  likeGallery: (galleryId: string) =>
    apiRequest(`/galleries/${galleryId}/like`, {
      method: "POST",
    }),

  unlikeGallery: (galleryId: string) =>
    apiRequest(`/galleries/${galleryId}/like`, {
      method: "DELETE",
    }),

  favoriteGallery: (galleryId: string) =>
    apiRequest(`/galleries/${galleryId}/favorite`, {
      method: "POST",
    }),

  unfavoriteGallery: (galleryId: string) =>
    apiRequest(`/galleries/${galleryId}/favorite`, {
      method: "DELETE",
    }),

  // Client Management APIs
  createClient: (clientData: { email: string; password: string; name: string }) =>
    apiRequest("/photographers/clients", {
      method: "POST",
      body: JSON.stringify(clientData),
    }),

  getClients: () => apiRequest("/photographers/clients"),

  removeClient: (clientId: string) =>
    apiRequest(`/photographers/clients/${clientId}`, {
      method: "DELETE",
    }),

  // Analytics/Dashboard APIs
  getTotals: () => apiRequest("/photographers/stats/totals"),

  getMostLikedPhotos: () => apiRequest("/photographers/stats/most-liked-photos"),

  getMostFavoritedPhotos: () => apiRequest("/photographers/stats/most-favorited-photos"),

  getMostViewedGalleries: () => apiRequest("/photographers/stats/most-viewed-galleries"),

  // Folder APIs
  createFolder: (galleryId: string, folderData: { name: string; parentId?: string }) =>
    apiRequest(`/folders/galleries/${galleryId}/folders`, {
      method: "POST",
      body: JSON.stringify(folderData),
    }),

  getFolderTree: (galleryId: string) =>
    apiRequest(`/folders/galleries/${galleryId}/folders/tree`),

  getFolder: (folderId: string) =>
    apiRequest(`/folders/${folderId}`),

  updateFolder: (folderId: string, data: { name: string }) =>
    apiRequest(`/folders/${folderId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteFolder: (folderId: string) =>
    apiRequest(`/folders/${folderId}`, {
      method: "DELETE",
    }),

  setFolderCover: (folderId: string, photoId?: string) =>
    apiRequest(`/folders/${folderId}/set-cover`, {
      method: "POST",
      body: JSON.stringify({ photoId }),
    }),

  moveFolder: (folderId: string, newParentId?: string) =>
    apiRequest(`/folders/${folderId}/move`, {
      method: "POST",
      body: JSON.stringify({ newParentId }),
    }),

  // Updated photo upload to use folderId instead of galleryId
  uploadPhotosToFolder: (folderId: string, formData: FormData) => {
    const token = getAuthToken()
    return fetch(`${API_BASE_URL}/photos/upload/${folderId}`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Don't set Content-Type for FormData - browser sets it automatically
      },
      body: formData,
    }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Upload failed")
      }
      return data
    })
  },

  // Filtered Download APIs
  downloadLikedPhotos: async (galleryId: string, galleryPassword?: string) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE_URL}/photos/gallery/${galleryId}/download/liked`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(galleryPassword && { 'x-gallery-password': galleryPassword }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to download liked photos");
    }

    return {
      blob: await response.blob(),
      downloadId: response.headers.get('X-Download-ID'),
      filename: response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'liked_photos.zip'
    };
  },

  downloadFavoritedPhotos: async (galleryId: string, galleryPassword?: string) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE_URL}/photos/gallery/${galleryId}/download/favorited`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(galleryPassword && { 'x-gallery-password': galleryPassword }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to download favorited photos");
    }

    return {
      blob: await response.blob(),
      downloadId: response.headers.get('X-Download-ID'),
      filename: response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'favorited_photos.zip'
    };
  },

  getDownloadProgress: (downloadId: string) => apiRequest(`/photos/download/${downloadId}/progress`),

  downloadAllPhotosUnified: async (galleryId: string, galleryPassword?: string) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE_URL}/photos/gallery/${galleryId}/download/all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(galleryPassword && { 'x-gallery-password': galleryPassword }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to download all photos");
    }

    return {
      blob: await response.blob(),
      downloadId: response.headers.get('X-Download-ID'),
      filename: response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'all_photos.zip'
    };
  },

  downloadFolderPhotosUnified: async (galleryId: string, folderId: string, galleryPassword?: string) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE_URL}/photos/gallery/${galleryId}/download/folder/${folderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(galleryPassword && { 'x-gallery-password': galleryPassword }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to download folder photos");
    }

    return {
      blob: await response.blob(),
      downloadId: response.headers.get('X-Download-ID'),
      filename: response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'folder_photos.zip'
    };
  },
}