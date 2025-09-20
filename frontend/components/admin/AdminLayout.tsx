"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AdminNavigation } from "./AdminNavigation";
import { AdminHeader } from "./AdminHeader";
import { AdminBreadcrumb } from "./AdminBreadcrumb";
import { AdminSessionTimeout } from "./AdminSessionTimeout";
import { Sidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const { user, loading, validateAdminSession, adminLogout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [sessionValid, setSessionValid] = useState(true);

    // Check if user is admin and redirect if not
    useEffect(() => {
        if (!loading && (!user || user.role !== "ADMIN")) {
            router.push("/admin/login");
        }
    }, [user, loading, router]);

    // Validate admin session periodically
    useEffect(() => {
        if (!user || user.role !== "ADMIN") return;

        const validateSession = async () => {
            const isValid = await validateAdminSession();
            if (!isValid) {
                setSessionValid(false);
                await adminLogout();
            }
        };

        // Validate session immediately
        validateSession();

        // Then validate every 5 minutes
        const interval = setInterval(validateSession, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [user, validateAdminSession, adminLogout]);

    // Handle responsive sidebar
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            }
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Show loading or redirect if not admin
    if (loading || !user || user.role !== "ADMIN" || !sessionValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#425146] mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                        {!sessionValid ? "Session expired. Redirecting..." : "Verifying admin access..."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Admin Session Timeout Warning */}
            <AdminSessionTimeout />

            {/* Admin Header */}
            <AdminHeader
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                sidebarOpen={sidebarOpen}
            />

            <div className="flex">
                {/* Admin Sidebar Navigation */}
                <div
                    className={cn(
                        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out",
                        sidebarOpen ? "translate-x-0" : "-translate-x-full",
                        "md:relative md:translate-x-0",
                        !sidebarOpen && "md:-translate-x-full"
                    )}
                    style={{ top: "64px" }} // Account for header height
                >
                    <AdminNavigation
                        currentPath={pathname}
                        onNavigate={(path) => {
                            router.push(path);
                            if (isMobile) setSidebarOpen(false);
                        }}
                    />
                </div>

                {/* Mobile overlay */}
                {isMobile && sidebarOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                        style={{ top: "64px" }}
                    />
                )}

                {/* Main Content Area */}
                <div
                    className={cn(
                        "flex-1 transition-all duration-300 ease-in-out",
                        sidebarOpen && !isMobile ? "ml-0" : "ml-0"
                    )}
                    style={{ paddingTop: "64px" }} // Account for fixed header
                >
                    <div className="p-6">
                        {/* Breadcrumb Navigation */}
                        <AdminBreadcrumb currentPath={pathname} />

                        {/* Page Content */}
                        <div className="mt-6">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}