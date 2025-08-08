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

  // Fixed: Use correct endpoint for public gallery access
  getGallery: (id: string) => apiRequest(`/galleries/${id}`),

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

  // Fixed: Return the correct download URL
  downloadPhoto: (id: string, galleryId?: string) => {
    const params = galleryId ? `?galleryId=${galleryId}` : ''
    return apiRequest(`/photos/${id}/download${params}`)
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
}