"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Users,
    FolderOpen,
    LayoutDashboard,
    Settings,
    Shield,
    BarChart3,
    UserCheck,
    Database,
    TrendingUp,
    FileText,
    Loader2,
} from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

interface SearchResult {
    id: string;
    type: "user" | "gallery" | "page";
    title: string;
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
    badge?: string;
}

// Static admin pages for quick navigation
const adminPages: SearchResult[] = [
    { id: "dashboard", type: "page", title: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { id: "users", type: "page", title: "User Management", icon: Users, path: "/admin/users" },
    { id: "photographers", type: "page", title: "Photographers", subtitle: "User Management", icon: UserCheck, path: "/admin/users/photographers" },
    { id: "clients", type: "page", title: "Clients", subtitle: "User Management", icon: UserCheck, path: "/admin/users/clients" },
    { id: "galleries", type: "page", title: "Gallery Oversight", icon: FolderOpen, path: "/admin/galleries" },
    { id: "gallery-analytics", type: "page", title: "Gallery Analytics", subtitle: "Galleries", icon: TrendingUp, path: "/admin/galleries/analytics" },
    { id: "storage", type: "page", title: "Storage Management", subtitle: "Galleries", icon: Database, path: "/admin/galleries/storage" },
    { id: "analytics", type: "page", title: "System Analytics", icon: BarChart3, path: "/admin/analytics" },
    { id: "security", type: "page", title: "Security & Audit", icon: Shield, path: "/admin/security" },
    { id: "system-config", type: "page", title: "System Configuration", icon: Settings, path: "/admin/system-config" },
];

export function AdminSearch() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [userResults, setUserResults] = useState<SearchResult[]>([]);
    const [galleryResults, setGalleryResults] = useState<SearchResult[]>([]);

    // Keyboard shortcut to open search (Ctrl+K or Cmd+K)
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    // Debounced search function
    const performSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setUserResults([]);
            setGalleryResults([]);
            return;
        }

        setLoading(true);
        try {
            // Parallel search for users and galleries
            const [usersResponse, galleriesResponse] = await Promise.all([
                adminApi.getAllUsers({ search: searchQuery, limit: 5 }).catch(() => ({ data: { users: [] } })),
                adminApi.getAllGalleries({ search: searchQuery, limit: 5 }).catch(() => ({ data: { galleries: [] } })),
            ]);

            // Transform user results
            const users = (usersResponse.data.users || []).map((user: any) => ({
                id: user.id,
                type: "user" as const,
                title: user.name,
                subtitle: user.email,
                icon: user.role === "PHOTOGRAPHER" ? UserCheck : Users,
                path: `/admin/users/${user.id}`,
                badge: user.role,
            }));

            // Transform gallery results
            const galleries = (galleriesResponse.data.galleries || []).map((gallery: any) => ({
                id: gallery.id,
                type: "gallery" as const,
                title: gallery.title,
                subtitle: gallery.photographer?.name,
                icon: FolderOpen,
                path: `/admin/galleries/${gallery.id}`,
                badge: gallery.photoCount ? `${gallery.photoCount} photos` : undefined,
            }));

            setUserResults(users);
            setGalleryResults(galleries);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, performSearch]);

    const handleSelect = (path: string) => {
        setOpen(false);
        setQuery("");
        router.push(path);
    };

    // Filter pages based on query
    const filteredPages = query.length > 0
        ? adminPages.filter(
            (page) =>
                page.title.toLowerCase().includes(query.toLowerCase()) ||
                page.subtitle?.toLowerCase().includes(query.toLowerCase())
        )
        : adminPages.slice(0, 5); // Show first 5 pages when no query

    return (
        <>
            {/* Search Trigger Button */}
            <Button
                variant="outline"
                className={cn(
                    "relative h-9 w-full justify-start rounded-md bg-muted/50 text-sm font-normal text-muted-foreground shadow-none border-none",
                    "sm:pr-12 md:w-64 lg:w-80"
                )}
                onClick={() => setOpen(true)}
            >
                <Search className="mr-2 h-4 w-4" />
                <span className="hidden lg:inline-flex">Search users, galleries...</span>
                <span className="inline-flex lg:hidden">Search...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>

            {/* Command Dialog */}
            <CommandDialog open={open} onOpenChange={setOpen} title="Admin Search" description="Search across users, galleries, and pages">
                <CommandInput
                    placeholder="Search users, galleries, pages..."
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    <CommandEmpty>
                        {loading ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            "No results found."
                        )}
                    </CommandEmpty>

                    {/* Users Section */}
                    {userResults.length > 0 && (
                        <CommandGroup heading="Users">
                            {userResults.map((result) => (
                                <CommandItem
                                    key={result.id}
                                    value={`user-${result.title}`}
                                    onSelect={() => handleSelect(result.path)}
                                    className="flex items-center gap-3 py-3"
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                        <result.icon className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="font-medium truncate">{result.title}</span>
                                        {result.subtitle && (
                                            <span className="text-xs text-muted-foreground truncate">
                                                {result.subtitle}
                                            </span>
                                        )}
                                    </div>
                                    {result.badge && (
                                        <Badge variant="secondary" className="text-[10px] ml-auto">
                                            {result.badge}
                                        </Badge>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {/* Galleries Section */}
                    {galleryResults.length > 0 && (
                        <>
                            <CommandSeparator />
                            <CommandGroup heading="Galleries">
                                {galleryResults.map((result) => (
                                    <CommandItem
                                        key={result.id}
                                        value={`gallery-${result.title}`}
                                        onSelect={() => handleSelect(result.path)}
                                        className="flex items-center gap-3 py-3"
                                    >
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#425146]/10">
                                            <result.icon className="h-4 w-4 text-[#425146]" />
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="font-medium truncate">{result.title}</span>
                                            {result.subtitle && (
                                                <span className="text-xs text-muted-foreground truncate">
                                                    by {result.subtitle}
                                                </span>
                                            )}
                                        </div>
                                        {result.badge && (
                                            <Badge variant="outline" className="text-[10px] ml-auto">
                                                {result.badge}
                                            </Badge>
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </>
                    )}

                    {/* Pages Section */}
                    {filteredPages.length > 0 && (
                        <>
                            <CommandSeparator />
                            <CommandGroup heading="Admin Pages">
                                {filteredPages.map((page) => (
                                    <CommandItem
                                        key={page.id}
                                        value={`page-${page.title}`}
                                        onSelect={() => handleSelect(page.path)}
                                        className="flex items-center gap-3 py-2"
                                    >
                                        <page.icon className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex flex-col flex-1">
                                            <span>{page.title}</span>
                                            {page.subtitle && (
                                                <span className="text-xs text-muted-foreground">
                                                    {page.subtitle}
                                                </span>
                                            )}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    );
}
