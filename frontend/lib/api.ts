const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

function getAuthToken() {
  if (typeof document === "undefined") return null
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("auth-token="))
    ?.split("=")[1]
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

  // Gallery APIs - Fixed endpoints to match your backend
  getGalleries: () => apiRequest("/galleries"),

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
    return `${API_BASE_URL}/photos/${id}/download${params}`
  },
}