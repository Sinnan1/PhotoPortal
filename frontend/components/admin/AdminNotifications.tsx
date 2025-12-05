"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Bell,
    UserPlus,
    FolderOpen,
    AlertTriangle,
    CheckCircle,
    Clock,
    X,
    ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { adminApi } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Notification {
    id: string;
    type: "user_registered" | "gallery_created" | "pending_approval" | "system_alert";
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    link?: string;
}

export function AdminNotifications() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch notifications/activity
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                setLoading(true);

                // Fetch recent activity data
                const [usersResponse, galleriesResponse, pendingResponse] = await Promise.all([
                    adminApi.getAllUsers({ limit: 5, sortBy: "createdAt", sortOrder: "desc" }).catch(() => ({ data: { users: [] } })),
                    adminApi.getAllGalleries({ limit: 5 }).catch(() => ({ data: { galleries: [] } })),
                    adminApi.getPendingApprovals().catch(() => ({ data: [] })),
                ]);

                const newNotifications: Notification[] = [];

                // Recent user registrations (last 7 days)
                const recentUsers = (usersResponse.data.users || [])
                    .filter((user: any) => {
                        const createdAt = new Date(user.createdAt);
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return createdAt > weekAgo;
                    })
                    .slice(0, 3);

                recentUsers.forEach((user: any) => {
                    newNotifications.push({
                        id: `user-${user.id}`,
                        type: "user_registered",
                        title: "New User Registered",
                        message: `${user.name} joined as ${user.role.toLowerCase()}`,
                        timestamp: new Date(user.createdAt),
                        read: false,
                        link: `/admin/users`,
                    });
                });

                // Recent galleries (last 7 days)
                const recentGalleries = (galleriesResponse.data.galleries || [])
                    .filter((gallery: any) => {
                        const createdAt = new Date(gallery.createdAt);
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return createdAt > weekAgo;
                    })
                    .slice(0, 3);

                recentGalleries.forEach((gallery: any) => {
                    newNotifications.push({
                        id: `gallery-${gallery.id}`,
                        type: "gallery_created",
                        title: "New Gallery Created",
                        message: `"${gallery.title}" by ${gallery.photographer?.name || "Unknown"}`,
                        timestamp: new Date(gallery.createdAt),
                        read: false,
                        link: `/admin/galleries`,
                    });
                });

                // Pending approvals
                const pendingCount = Array.isArray(pendingResponse.data) ? pendingResponse.data.length : 0;
                if (pendingCount > 0) {
                    newNotifications.push({
                        id: "pending-approvals",
                        type: "pending_approval",
                        title: "Pending Approvals",
                        message: `${pendingCount} item${pendingCount > 1 ? "s" : ""} require${pendingCount === 1 ? "s" : ""} your attention`,
                        timestamp: new Date(),
                        read: false,
                        link: `/admin/users`,
                    });
                }

                // Sort by timestamp (newest first)
                newNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                setNotifications(newNotifications);
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();

        // Refresh every 5 minutes
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);
        if (notification.link) {
            router.push(notification.link);
            setOpen(false);
        }
    };

    const getNotificationIcon = (type: Notification["type"]) => {
        switch (type) {
            case "user_registered":
                return <UserPlus className="h-4 w-4 text-blue-500" />;
            case "gallery_created":
                return <FolderOpen className="h-4 w-4 text-green-500" />;
            case "pending_approval":
                return <Clock className="h-4 w-4 text-orange-500" />;
            case "system_alert":
                return <AlertTriangle className="h-4 w-4 text-red-500" />;
            default:
                return <Bell className="h-4 w-4" />;
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-muted-foreground hover:text-foreground"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">Notifications</h4>
                        {unreadCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5">
                                {unreadCount} new
                            </Badge>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto py-1 px-2 text-xs text-muted-foreground"
                            onClick={markAllAsRead}
                        >
                            Mark all read
                        </Button>
                    )}
                </div>

                {/* Notifications List */}
                <ScrollArea className="h-[300px]">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <CheckCircle className="h-10 w-10 text-muted-foreground/50 mb-2" />
                            <p className="text-sm text-muted-foreground">All caught up!</p>
                            <p className="text-xs text-muted-foreground/70">No new notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={cn(
                                        "w-full flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors",
                                        !notification.read && "bg-primary/5"
                                    )}
                                >
                                    <div className="flex-shrink-0 mt-0.5">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={cn(
                                                "text-sm",
                                                !notification.read && "font-medium"
                                            )}>
                                                {notification.title}
                                            </p>
                                            {!notification.read && (
                                                <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                            {notification.message}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                        </p>
                                    </div>
                                    {notification.link && (
                                        <ExternalLink className="h-3 w-3 text-muted-foreground/50 flex-shrink-0 mt-1" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                {notifications.length > 0 && (
                    <>
                        <Separator />
                        <div className="p-2">
                            <Button
                                variant="ghost"
                                className="w-full h-8 text-xs"
                                onClick={() => {
                                    router.push("/admin/security");
                                    setOpen(false);
                                }}
                            >
                                View all activity
                            </Button>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
}
