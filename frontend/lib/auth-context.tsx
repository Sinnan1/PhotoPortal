"use client";

import type React from "react";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  role: "PHOTOGRAPHER" | "CLIENT" | "ADMIN";
}

// Admin-specific error types
export enum AdminErrorType {
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ADMIN_SESSION_EXPIRED = 'ADMIN_SESSION_EXPIRED',
  INVALID_ADMIN_ACTION = 'INVALID_ADMIN_ACTION',
  SYSTEM_CONFIG_ERROR = 'SYSTEM_CONFIG_ERROR',
  AUDIT_LOG_FAILURE = 'AUDIT_LOG_FAILURE'
}

interface RegisterResponse {
  requiresApproval: boolean;
  message?: string;
  user?: any;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  clientLogin: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResponse>;
  logout: () => void;
  adminLogout: () => Promise<void>;
  extendAdminSession: () => Promise<boolean>;
  validateAdminSession: () => Promise<boolean>;
  handleAdminError: (error: any) => void;
  loading: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: "PHOTOGRAPHER" | "CLIENT" | "ADMIN";
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        setLoading(false);
        return;
      }

      // Since your backend doesn't have a /me endpoint, we'll store user data in localStorage
      // and validate the token by making a request to a protected endpoint that matches the role
      try {
        // Determine which endpoint to use based on last known user role in localStorage
        const storedUser = localStorage.getItem("user");
        const role = storedUser ? (JSON.parse(storedUser).role as "PHOTOGRAPHER" | "CLIENT" | "ADMIN") : undefined;

        const url = role === "CLIENT"
          ? `${process.env.NEXT_PUBLIC_API_URL}/auth/client-profile`
          : role === "ADMIN"
          ? `${process.env.NEXT_PUBLIC_API_URL}/admin/auth/profile`
          : `${process.env.NEXT_PUBLIC_API_URL}/galleries`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          // Token is valid, get user data from localStorage
          if (storedUser) setUser(JSON.parse(storedUser));
        } else {
          // Token is invalid, clear everything
          document.cookie =
            "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          localStorage.removeItem("user");
        }
      } catch (error) {
        console.error("Token validation failed:", error);
        document.cookie =
          "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        localStorage.removeItem("user");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    // Your backend response structure: { success: true, data: { user: {...}, token: "..." } }
    const { user: userData, token } = data.data;

    document.cookie = `auth-token=${token}; path=/; max-age=604800; secure; samesite=strict`; // 7 days
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("auth-token", token); // Store token in localStorage as backup
    setUser(userData);
    
    // Redirect based on role
    if (userData.role === "ADMIN") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  };

  const clientLogin = async (email: string, password: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/client-login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    // Your backend response structure: { success: true, data: { user: {...}, token: "..." } }
    const { user: userData, token } = data.data;

    document.cookie = `auth-token=${token}; path=/; max-age=604800; secure; samesite=strict`; // 7 days
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("auth-token", token); // Store token in localStorage as backup
    setUser(userData);
    router.push("/dashboard/client");
  };

  const register = async (registerData: RegisterData) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Registration failed");
    }

    // Check if approval is required
    if (data.data.requiresApproval) {
      // Return the response data so the component can show approval modal
      return { requiresApproval: true, message: data.data.message, user: data.data.user };
    }

    // Your backend response structure: { success: true, data: { user: {...}, token: "..." } }
    const { user: userData, token } = data.data;

    document.cookie = `auth-token=${token}; path=/; max-age=604800; secure; samesite=strict`; // 7 days
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("auth-token", token); // Store token in localStorage as backup
    setUser(userData);
    router.push("/dashboard");
    
    return { requiresApproval: false };
  };

  const adminLogin = async (email: string, password: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Admin login failed");
    }

    const { admin, token, sessionId, expiresAt } = data.data;

    // Store admin session with shorter expiration (2 hours)
    document.cookie = `auth-token=${token}; path=/; max-age=7200; secure; samesite=strict`;
    localStorage.setItem("user", JSON.stringify(admin));
    localStorage.setItem("admin-session", JSON.stringify({
      sessionId,
      expiresAt,
      loginTime: new Date().toISOString()
    }));
    
    setUser(admin);
    router.push("/admin");
  };

  const adminLogout = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (token) {
        // Call admin logout endpoint for proper session cleanup
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/auth/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      }
    } catch (error) {
      console.error("Admin logout error:", error);
    } finally {
      // Clear all session data
      document.cookie = "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      localStorage.removeItem("user");
      localStorage.removeItem("admin-session");
      setUser(null);
      router.push("/admin/login");
    }
  };

  const extendAdminSession = async (): Promise<boolean> => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token || !user || user.role !== "ADMIN") {
        return false;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/auth/extend-session`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.newExpiresAt) {
          // Update session expiration in localStorage
          const adminSession = localStorage.getItem("admin-session");
          if (adminSession) {
            const sessionData = JSON.parse(adminSession);
            sessionData.expiresAt = data.data.newExpiresAt;
            localStorage.setItem("admin-session", JSON.stringify(sessionData));
          }
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to extend admin session:", error);
      return false;
    }
  };

  const validateAdminSession = async (): Promise<boolean> => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token || !user || user.role !== "ADMIN") {
        return false;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/auth/validate`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to validate admin session:", error);
      return false;
    }
  };

  const handleAdminError = (error: any) => {
    // Handle admin-specific errors
    if (error?.errorType) {
      switch (error.errorType) {
        case AdminErrorType.ADMIN_SESSION_EXPIRED:
          adminLogout();
          break;
        case AdminErrorType.INSUFFICIENT_PERMISSIONS:
          // Show error message but don't logout
          console.error('Insufficient permissions:', error.error);
          break;
        case AdminErrorType.INVALID_ADMIN_ACTION:
          console.error('Invalid admin action:', error.error);
          break;
        case AdminErrorType.SYSTEM_CONFIG_ERROR:
          console.error('System configuration error:', error.error);
          break;
        case AdminErrorType.AUDIT_LOG_FAILURE:
          console.error('Audit log failure:', error.error);
          break;
        default:
          console.error('Unknown admin error:', error);
      }
    } else if (error?.status === 401 && user?.role === 'ADMIN') {
      // Unauthorized admin access - force logout
      adminLogout();
    }
  };

  const logout = () => {
    if (user && user.role === "ADMIN") {
      adminLogout();
    } else {
      document.cookie =
        "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      localStorage.removeItem("user");
      localStorage.removeItem("admin-session");
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      clientLogin, 
      adminLogin,
      register, 
      logout, 
      adminLogout,
      extendAdminSession,
      validateAdminSession,
      handleAdminError,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
