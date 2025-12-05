"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    FolderOpen,
    BarChart3,
    Settings,
    Shield,
    FileText,
    Database,
    Activity,
    UserCheck,
    Cog,
    TrendingUp,
    UserPlus,
    ChevronDown,
    ChevronRight,
    LogOut,
    Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth-context";

interface NavigationItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
    badge?: string;
    badgeVariant?: "default" | "secondary" | "destructive" | "outline";
    children?: NavigationItem[];
}

interface AdminSidebarProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    isMobile: boolean;
}

const navigationItems: NavigationItem[] = [
    {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        path: "/admin",
    },
    {
        id: "users",
        label: "User Management",
        icon: Users,
        path: "/admin/users",
        children: [
            {
                id: "all-users",
                label: "All Users",
                icon: Users,
                path: "/admin/users",
            },
            {
                id: "photographers",
                label: "Photographers",
                icon: UserCheck,
                path: "/admin/users/photographers",
            },
            {
                id: "clients",
                label: "Clients",
                icon: UserCheck,
                path: "/admin/users/clients",
            },
        ],
    },
    {
        id: "galleries",
        label: "Gallery Oversight",
        icon: FolderOpen,
        path: "/admin/galleries",
        children: [
            {
                id: "all-galleries",
                label: "All Galleries",
                icon: FolderOpen,
                path: "/admin/galleries",
            },
            {
                id: "gallery-analytics",
                label: "Gallery Analytics",
                icon: TrendingUp,
                path: "/admin/galleries/analytics",
            },
            {
                id: "storage-management",
                label: "Storage Management",
                icon: Database,
                path: "/admin/galleries/storage",
            },
        ],
    },
    {
        id: "analytics",
        label: "System Analytics",
        icon: BarChart3,
        path: "/admin/analytics",
        children: [
            {
                id: "overview",
                label: "Overview",
                icon: Activity,
                path: "/admin/analytics",
            },
            {
                id: "user-analytics",
                label: "User Analytics",
                icon: Users,
                path: "/admin/analytics/users",
            },
            {
                id: "performance",
                label: "Performance",
                icon: TrendingUp,
                path: "/admin/analytics/performance",
            },
        ],
    },
    {
        id: "security",
        label: "Security & Audit",
        icon: Shield,
        path: "/admin/security",
    },
    {
        id: "system",
        label: "System Configuration",
        icon: Settings,
        path: "/admin/system-config",
        children: [
            {
                id: "system-config",
                label: "Configuration Settings",
                icon: Cog,
                path: "/admin/system-config",
            },
            {
                id: "config-history",
                label: "Change History",
                icon: FileText,
                path: "/admin/system-config#history",
            },
            {
                id: "config-backup",
                label: "Backup & Restore",
                icon: Database,
                path: "/admin/system-config#backup",
            },
        ],
    },
    {
        id: "admin-management",
        label: "Admin Management",
        icon: UserCheck,
        path: "/admin/admins",
        children: [
            {
                id: "invitations",
                label: "Invitations",
                icon: UserPlus,
                path: "/admin/invitations",
            },
            {
                id: "profile",
                label: "My Profile",
                icon: UserCheck,
                path: "/admin/profile",
            },
        ],
    },
];

export function AdminSidebar({ open, setOpen, isMobile }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { adminLogout } = useAuth();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    useEffect(() => {
        const expanded: string[] = [];
        navigationItems.forEach((item) => {
            if (item.children && item.children.some((child) => pathname.startsWith(child.path))) {
                expanded.push(item.id);
            }
        });
        setExpandedItems(expanded);
    }, [pathname]);

    const toggleExpanded = (itemId: string) => {
        setExpandedItems((prev) =>
            prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
        );
    };

    const handleNavigate = (path: string) => {
        router.push(path);
        if (isMobile) setOpen(false);
    };

    const sidebarVariants = {
        open: { x: 0, width: "18rem", transition: { type: "spring", stiffness: 300, damping: 30 } },
        closed: { x: isMobile ? "-100%" : 0, width: isMobile ? "0rem" : "5rem", transition: { type: "spring", stiffness: 300, damping: 30 } },
    };

    return (
        <aside
            className={cn(
                "fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
                "border-border/40 safe-area-left transition-all duration-300",
                !open && !isMobile && "w-20",
                open && "w-72",
                isMobile && "top-16 z-50 h-[calc(100vh-4rem)]" // Ensure mobile behavior is consistent
            )}
        >


            <ScrollArea className="h-[calc(100vh-8rem)] py-4">
                <nav className="space-y-1 px-2">
                    {navigationItems.map((item) => (
                        <div key={item.id} className="space-y-1">
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start gap-3",
                                    !open && !isMobile && "justify-center px-2",
                                    pathname === item.path || (item.children && expandedItems.includes(item.id))
                                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                )}
                                onClick={() => {
                                    if (item.children && open) {
                                        toggleExpanded(item.id);
                                    } else {
                                        if (!open && !isMobile && item.children) {
                                            setOpen(true);
                                            setTimeout(() => toggleExpanded(item.id), 100);
                                        } else {
                                            handleNavigate(item.path);
                                        }
                                    }
                                }}
                                title={!open ? item.label : undefined}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                {open && (
                                    <>
                                        <span className="grow text-left truncate">{item.label}</span>
                                        {item.badge && (
                                            <Badge variant={item.badgeVariant || "secondary"} className="ml-auto text-[10px] h-5 px-1.5">
                                                {item.badge}
                                            </Badge>
                                        )}
                                        {item.children && (
                                            <ChevronRight
                                                className={cn(
                                                    "h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground/50",
                                                    expandedItems.includes(item.id) && "rotate-90"
                                                )}
                                            />
                                        )}
                                    </>
                                )}
                            </Button>

                            <AnimatePresence>
                                {open && item.children && expandedItems.includes(item.id) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden ml-4 pl-2 border-l border-primary/20 space-y-1"
                                    >
                                        {item.children.map((child) => (
                                            <Button
                                                key={child.id}
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "w-full justify-start text-sm font-normal h-9",
                                                    pathname === child.path
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                )}
                                                onClick={() => handleNavigate(child.path)}
                                            >
                                                <child.icon className="h-4 w-4 mr-2 opacity-70" />
                                                <span className="truncate">{child.label}</span>
                                            </Button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </nav>
            </ScrollArea>

            <div className="absolute bottom-0 w-full border-t border-border/40 p-4 bg-background/95 backdrop-blur">
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30",
                        !open && !isMobile && "justify-center px-2"
                    )}
                    onClick={() => adminLogout()}
                    title={!open ? "Sign Out" : undefined}
                >
                    <LogOut className="h-5 w-5 shrink-0" />
                    {open && <span>Sign Out</span>}
                </Button>
            </div>
        </aside >
    );
}
