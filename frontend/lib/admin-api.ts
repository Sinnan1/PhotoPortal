const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

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

// Admin-specific error types
export enum AdminErrorType {
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ADMIN_SESSION_EXPIRED = 'ADMIN_SESSION_EXPIRED',
  INVALID_ADMIN_ACTION = 'INVALID_ADMIN_ACTION',
  SYSTEM_CONFIG_ERROR = 'SYSTEM_CONFIG_ERROR',
  AUDIT_LOG_FAILURE = 'AUDIT_LOG_FAILURE'
}

// Get CSRF token from cookie
// Get CSRF token from cookie with robust parsing
function getCSRFToken() {
  if (typeof document === "undefined") return null

  try {
    const match = document.cookie.match(new RegExp('(^| )csrf-token=([^;]+)'))
    const token = match ? match[2] : null
    if (process.env.NODE_ENV === 'development') {
      console.log('CSRF Token Retrieval:', {
        found: !!token,
        token: token ? token.substring(0, 10) + '...' : 'null',
        cookieLength: document.cookie.length
      })
    }
    return token
  } catch (e) {
    console.error('Error parsing CSRF cookie:', e)
    return null
  }
}

async function adminApiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken()
  const csrfToken = getCSRFToken()

  const config: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(csrfToken && { "x-csrf-token": csrfToken }),
      ...options.headers,
    },
  }

  const response = await fetch(`${API_BASE_URL}/admin${endpoint}`, config)
  const data = await response.json()

  if (!response.ok) {
    // Create enhanced error object with admin-specific information
    const error = new Error(data.error || "Admin API request failed") as any
    error.status = response.status
    error.errorType = data.errorType
    error.details = data.details

    // Handle specific admin error types
    if (data.errorType === AdminErrorType.ADMIN_SESSION_EXPIRED) {
      // Clear admin session data
      if (typeof document !== "undefined") {
        document.cookie = "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
        if (isStorageAvailable()) {
          localStorage.removeItem("user")
          localStorage.removeItem("admin-session")
        }
      }
    }

    throw error
  }

  return data
}

export const adminApi = {
  // User Management APIs
  getAllUsers: (params?: {
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return adminApiRequest(`/users${queryString ? `?${queryString}` : ''}`);
  },

  getUserDetails: (userId: string) =>
    adminApiRequest(`/users/${userId}`),

  searchUsers: (params: {
    q: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    return adminApiRequest(`/users/search?${queryParams.toString()}`);
  },

  getUserStatistics: (timeRange?: string) => {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    return adminApiRequest(`/users/statistics${params}`);
  },

  createUser: (userData: {
    email: string;
    name: string;
    password: string;
    role?: string;
  }) =>
    adminApiRequest("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  updateUserRole: (userId: string, data: {
    role: string;
    reason: string;
  }) =>
    adminApiRequest(`/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  suspendUser: (userId: string, data: {
    reason: string;
  }) =>
    adminApiRequest(`/users/${userId}/suspend`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  activateUser: (userId: string, data: {
    reason?: string;
  }) =>
    adminApiRequest(`/users/${userId}/activate`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteUser: (userId: string, data: {
    reason: string;
    confirmEmail: string;
  }) =>
    adminApiRequest(`/users/${userId}`, {
      method: "DELETE",
      body: JSON.stringify(data),
    }),

  // Pending Approvals APIs
  getPendingApprovals: () =>
    adminApiRequest("/users/pending-approvals"),

  approveUser: (userId: string, data: {
    reason?: string;
  }) =>
    adminApiRequest(`/users/${userId}/approve`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Gallery Management APIs
  getAllGalleries: (params?: {
    search?: string;
    photographer?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return adminApiRequest(`/galleries${queryString ? `?${queryString}` : ''}`);
  },

  getGalleryDetails: (galleryId: string) =>
    adminApiRequest(`/galleries/${galleryId}`),

  updateGallerySettings: (galleryId: string, settings: any) =>
    adminApiRequest(`/galleries/${galleryId}`, {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  deleteGallery: (galleryId: string, data: {
    reason: string;
    confirmTitle: string;
  }) =>
    adminApiRequest(`/galleries/${galleryId}`, {
      method: "DELETE",
      body: JSON.stringify(data),
    }),

  getGalleryStatistics: (timeRange?: string) => {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    return adminApiRequest(`/galleries/analytics${params}`);
  },

  transferGalleryOwnership: (galleryId: string, newPhotographerId: string) =>
    adminApiRequest(`/galleries/${galleryId}/transfer`, {
      method: "POST",
      body: JSON.stringify({ newPhotographerId }),
    }),

  // Analytics APIs
  getSystemAnalytics: (timeRange?: string) => {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    return adminApiRequest(`/analytics${params}`);
  },

  getUserAnalytics: (timeRange?: string) => {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    return adminApiRequest(`/analytics/user-analytics${params}`);
  },

  getStorageAnalytics: () =>
    adminApiRequest("/analytics/storage-analytics"),

  getSystemHealth: () =>
    adminApiRequest("/analytics/system-health"),

  getSecurityLogs: (params?: {
    page?: number;
    limit?: number;
    severity?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return adminApiRequest(`/analytics/security-logs${queryString ? `?${queryString}` : ''}`);
  },

  // System Configuration APIs
  getAllConfigurations: () =>
    adminApiRequest("/system-config"),

  getConfiguration: (configKey: string) =>
    adminApiRequest(`/system-config/${configKey}`),

  updateConfiguration: (configKey: string, data: {
    value: any;
    reason?: string;
  }) =>
    adminApiRequest(`/system-config/${configKey}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateMultipleConfigurations: (data: {
    configurations: Record<string, any>;
    reason?: string;
  }) =>
    adminApiRequest("/system-config/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resetConfiguration: (configKey: string, data: {
    reason?: string;
  }) =>
    adminApiRequest(`/system-config/${configKey}`, {
      method: "DELETE",
      body: JSON.stringify(data),
    }),

  getConfigurationHistory: (configKey?: string, params?: {
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    const endpoint = configKey
      ? `/system-config/${configKey}/history${queryString ? `?${queryString}` : ''}`
      : `/system-config/history/all${queryString ? `?${queryString}` : ''}`;
    return adminApiRequest(endpoint);
  },

  exportConfiguration: () =>
    adminApiRequest("/system-config/export"),

  importConfiguration: (data: {
    backup: any;
    reason?: string;
    overwriteExisting?: boolean;
  }) =>
    adminApiRequest("/system-config/import", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getConfigurationSchema: () =>
    adminApiRequest("/system-config/schema"),

  // Audit Trail APIs
  getAuditLogs: (params?: {
    action?: string;
    targetType?: string;
    adminId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return adminApiRequest(`/audit${queryString ? `?${queryString}` : ''}`);
  },

  exportAuditLogs: (params: {
    startDate: string;
    endDate: string;
    format?: string;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    return adminApiRequest(`/audit/export?${queryParams.toString()}`);
  },

  // Admin Authentication APIs
  adminLogin: (credentials: { email: string; password: string }) =>
    adminApiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  adminLogout: () =>
    adminApiRequest("/auth/logout", {
      method: "POST",
    }),

  getAdminProfile: () =>
    adminApiRequest("/auth/profile"),

  updateAdminProfile: (data: {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }) =>
    adminApiRequest("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Session Management
  validateAdminSession: () =>
    adminApiRequest("/auth/validate"),

  extendAdminSession: () =>
    adminApiRequest("/auth/extend-session", {
      method: "POST",
    }),

  getAdminSessions: () =>
    adminApiRequest("/auth/sessions"),

  revokeAdminSession: (sessionId: string) =>
    adminApiRequest(`/auth/sessions/${sessionId}`, {
      method: "DELETE",
    }),

  // Admin Invitation APIs
  inviteAdmin: (data: {
    email: string;
    name: string;
  }) =>
    adminApiRequest("/auth/invite-admin", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAdminInvitations: (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return adminApiRequest(`/invitations/list${queryString ? `?${queryString}` : ''}`);
  },

  getAdminInvitation: (invitationId: string) =>
    adminApiRequest(`/invitations/${invitationId}`),

  revokeAdminInvitation: (invitationId: string) =>
    adminApiRequest(`/invitations/${invitationId}/revoke`, {
      method: "POST",
    }),

  resendAdminInvitation: (invitationId: string) =>
    adminApiRequest(`/invitations/${invitationId}/resend`, {
      method: "POST",
    }),

  deleteAdminInvitation: (invitationId: string) =>
    adminApiRequest(`/invitations/${invitationId}`, {
      method: "DELETE",
    }),

  getInvitationStats: () =>
    adminApiRequest("/invitations/stats"),

  // First Admin Setup
  setupFirstAdmin: (data: {
    email: string;
    name: string;
    password: string;
  }) =>
    adminApiRequest("/auth/setup-first-admin", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAdminSetupStatus: () =>
    adminApiRequest("/auth/setup-status"),

  verifyAdminInvitation: (token: string) =>
    adminApiRequest(`/auth/verify-invitation/${token}`),

  activateAdminAccount: (data: {
    token: string;
    password: string;
  }) =>
    adminApiRequest("/auth/activate-account", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  changeAdminPassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) =>
    adminApiRequest("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Presence Tracking APIs
  getActiveUsers: () =>
    adminApiRequest("/presence/active"),

  getPresenceStats: () =>
    adminApiRequest("/presence/stats"),

  getGalleryPresence: (galleryId: string) =>
    adminApiRequest(`/presence/gallery/${galleryId}`),
}