"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { AdminBreadcrumb } from "./AdminBreadcrumb";
import { AdminSessionTimeout } from "./AdminSessionTimeout";
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
            } else {
                setSidebarOpen(true);
            }
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Show loading or redirect if not admin
    if (loading || !user || user.role !== "ADMIN" || !sessionValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                        {!sessionValid ? "Session expired. Redirecting..." : "Verifying admin access..."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            {/* Admin Session Timeout Warning */}
            <AdminSessionTimeout />

            {/* Admin Header */}
            <AdminHeader
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                sidebarOpen={sidebarOpen}
            />

            {/* Admin Sidebar Navigation */}
            <AdminSidebar
                open={sidebarOpen}
                setOpen={setSidebarOpen}
                isMobile={isMobile}
            />

            {/* Mobile overlay */}
            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <main
                className={cn(
                    "min-h-screen transition-all duration-300 ease-in-out",
                    // Use responsive classes for margin to avoid FOUC/layout shift
                    sidebarOpen ? "md:ml-72" : "md:ml-20"
                )}
            >
                <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
                    {/* Breadcrumb Navigation */}
                    <div className="mb-6">
                        <AdminBreadcrumb currentPath={pathname} />
                    </div>

                    {/* Page Content */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}