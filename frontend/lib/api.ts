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
 * - Use direct subdomain to bypass Cloudflare timeouts
 * 
 * Migration Benefits:
 * - Eliminated client-side memory usage for zip creation
 * - Consistent progress tracking across all download types
 * - Better error handling and recovery
 * - Improved performance and reliability
 * - No Cloudflare timeout issues
 * 
 * @since Client-side JSZip migration completed
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
// Direct download URL should not include /api suffix as we add it in the fetch calls
const DIRECT_DOWNLOAD_URL = process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_URL
  ? `${process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_URL}/api`
  : API_BASE_URL

// Helper function to check if localStorage is available
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof localStorage === 'undefined') return false

  try {
    // Test if we can actually access localStorage
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch (e) {
    // localStorage is not available or restricted
    return false
  }
}

function getAuthToken() {
  if (typeof document === "undefined") return null

  // First try to get token from cookie
  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("auth-token="))
    ?.split("=")[1]

  if (cookieToken) return cookieToken

  // Fallback: try to get token from localStorage only if available
  if (isStorageAvailable()) {
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

  getGalleriesTimeline: () => apiRequest("/galleries/timeline"),

  getGalleriesByYearMonth: (year: number, month: number) =>
    apiRequest(`/galleries/timeline/${year}/${month}`),

  getUncategorizedGalleries: () => apiRequest("/galleries/uncategorized"),

  updateGalleryDate: (id: string, shootDate: string | null) =>
    apiRequest(`/galleries/${id}/date`, {
      method: "PATCH",
      body: JSON.stringify({ shootDate }),
    }),



  getClientGalleries: () => apiRequest("/galleries/client/accessible"),

  searchGalleries: (query: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return apiRequest(`/galleries/search?${params.toString()}`);
  },

  // Gallery Group APIs
  getGalleryGroups: () => apiRequest("/gallery-groups"),

  getGalleryGroup: (id: string) => apiRequest(`/gallery-groups/${id}`),

  createGalleryGroup: (data: any) =>
    apiRequest("/gallery-groups", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateGalleryGroup: (id: string, data: any) =>
    apiRequest(`/gallery-groups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteGalleryGroup: (id: string) =>
    apiRequest(`/gallery-groups/${id}`, {
      method: "DELETE",
    }),

  assignGalleriesToGroup: (groupId: string, galleryIds: string[]) =>
    apiRequest(`/gallery-groups/${groupId}/galleries`, {
      method: "POST",
      body: JSON.stringify({ galleryIds }),
    }),

  removeGalleriesFromGroup: (groupId: string, galleryIds: string[]) =>
    apiRequest(`/gallery-groups/${groupId}/galleries`, {
      method: "DELETE",
      body: JSON.stringify({ galleryIds }),
    }),

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

    // Create a temporary form to POST credentials (more secure than URL params)
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${API_BASE_URL}/photos/${id}/download`;
    form.target = '_blank';
    form.style.display = 'none';

    if (token) {
      const tokenInput = document.createElement('input');
      tokenInput.name = 'token';
      tokenInput.value = token;
      form.appendChild(tokenInput);
    }

    if (galleryPassword) {
      const passwordInput = document.createElement('input');
      passwordInput.name = 'password';
      passwordInput.value = galleryPassword;
      form.appendChild(passwordInput);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
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

  createDownloadTicket: (galleryId: string, data: { folderId?: string; filter: string }) =>
    apiRequest(`/photos/download-ticket`, {
      method: "POST",
      body: JSON.stringify({ galleryId, ...data }),
    }),

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

  toggleClientDownload: (clientId: string, canDownload: boolean) =>
    apiRequest(`/photographers/clients/${clientId}/download`, {
      method: "PATCH",
      body: JSON.stringify({ canDownload }),
    }),

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

  // Check for duplicate photos before upload
  checkDuplicates: (folderId: string, files: { name: string; size: number }[]) =>
    apiRequest(`/uploads/check-duplicates`, {
      method: "POST",
      body: JSON.stringify({ folderId, files }),
    }),

  // Filtered Download APIs
  downloadLikedPhotos: async (galleryId: string, galleryPassword?: string) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${DIRECT_DOWNLOAD_URL}/photos/gallery/${galleryId}/download/liked`, {
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

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return {
        multipart: true,
        parts: data.parts
      };
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

    const response = await fetch(`${DIRECT_DOWNLOAD_URL}/photos/gallery/${galleryId}/download/favorited`, {
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

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return {
        multipart: true,
        parts: data.parts
      };
    }

    return {
      blob: await response.blob(),
      downloadId: response.headers.get('X-Download-ID'),
      filename: response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'favorited_photos.zip'
    };
  },

  getDownloadProgress: (downloadId: string) => apiRequest(`/photos/download/${downloadId}/progress`),

  // Excel Export APIs
  exportLikedPhotosToExcel: async (galleryId: string, galleryPassword?: string) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${DIRECT_DOWNLOAD_URL}/photos/gallery/${galleryId}/export/liked`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(galleryPassword && { 'x-gallery-password': galleryPassword }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to export liked photos");
    }

    return {
      blob: await response.blob(),
      filename: response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'liked_photos.xlsx'
    };
  },

  exportFavoritedPhotosToExcel: async (galleryId: string, galleryPassword?: string) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${DIRECT_DOWNLOAD_URL}/photos/gallery/${galleryId}/export/favorited`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(galleryPassword && { 'x-gallery-password': galleryPassword }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to export favorited photos");
    }

    return {
      blob: await response.blob(),
      filename: response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'favorited_photos.xlsx'
    };
  },

  exportLikedPhotosToCSV: async (galleryId: string, galleryPassword?: string) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${DIRECT_DOWNLOAD_URL}/photos/gallery/${galleryId}/export-csv/liked`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(galleryPassword && { 'x-gallery-password': galleryPassword }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to export liked photos to CSV");
    }

    return {
      blob: await response.blob(),
      filename: response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'liked_photos.csv'
    };
  },

  exportFavoritedPhotosToCSV: async (galleryId: string, galleryPassword?: string) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${DIRECT_DOWNLOAD_URL}/photos/gallery/${galleryId}/export-csv/favorited`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(galleryPassword && { 'x-gallery-password': galleryPassword }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to export favorited photos to CSV");
    }

    return {
      blob: await response.blob(),
      filename: response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'favorited_photos.csv'
    };
  },

  getGalleryPhotoStats: (galleryId: string) => apiRequest(`/photos/gallery/${galleryId}/stats`),

  downloadAllPhotosUnified: async (galleryId: string, galleryPassword?: string) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${DIRECT_DOWNLOAD_URL}/photos/gallery/${galleryId}/download/all`, {
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

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return {
        multipart: true,
        parts: data.parts
      };
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

    const response = await fetch(`${DIRECT_DOWNLOAD_URL}/photos/gallery/${galleryId}/download/folder/${folderId}`, {
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

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return {
        multipart: true,
        parts: data.parts
      };
    }

    return {
      blob: await response.blob(),
      downloadId: response.headers.get('X-Download-ID'),
      filename: response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'folder_photos.zip'
    };
  },

  // Selection Analytics APIs
  getFolderSelections: (folderId: string) =>
    apiRequest(`/analytics/folder/${folderId}/selections`),

  getGallerySelections: (galleryId: string) =>
    apiRequest(`/analytics/gallery/${galleryId}/selections`),

  getPhotographerSelections: (filters?: {
    dateFrom?: string
    dateTo?: string
    clientName?: string
    galleryId?: string
    hasSelections?: boolean
    photographerId?: string
  }) => {
    const queryParams = new URLSearchParams()
    if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom)
    if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo)
    if (filters?.clientName) queryParams.append('clientName', filters.clientName)
    if (filters?.galleryId) queryParams.append('galleryId', filters.galleryId)
    if (filters?.hasSelections !== undefined) queryParams.append('hasSelections', filters.hasSelections.toString())
    if (filters?.photographerId) queryParams.append('photographerId', filters.photographerId)

    const queryString = queryParams.toString()
    return apiRequest(`/analytics/photographer/selections${queryString ? `?${queryString}` : ''}`)
  },

  // Feedback APIs
  submitFeedback: (feedback: {
    overallRating: number;
    selectionProcessRating: number;
    portalExperienceRating: number;
    comments?: string;
    wouldRecommend: boolean;
  }) =>
    apiRequest(`/feedback`, {
      method: "POST",
      body: JSON.stringify(feedback),
    }),

  requestClientFeedback: (clientId: string) =>
    apiRequest(`/clients/${clientId}/request-feedback`, {
      method: "POST",
    }),

  getAllFeedback: () =>
    apiRequest(`/feedback`),

  checkFeedbackStatus: () =>
    apiRequest(`/feedback/status`),
}