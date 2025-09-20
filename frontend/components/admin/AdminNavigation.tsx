"use client";

import React from "react";
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
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  children?: NavigationItem[];
}

interface AdminNavigationProps {
  currentPath: string;
  onNavigate: (path: string) => void;
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

export function AdminNavigation({ currentPath, onNavigate }: AdminNavigationProps) {
  const [expandedItems, setExpandedItems] = React.useState<string[]>(() => {
    // Auto-expand items that contain the current path
    const expanded: string[] = [];
    navigationItems.forEach(item => {
      if (item.children && item.children.some(child => currentPath.startsWith(child.path))) {
        expanded.push(item.id);
      }
    });
    return expanded;
  });

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isActive = (path: string) => {
    if (path === "/admin") {
      return currentPath === "/admin";
    }
    return currentPath.startsWith(path);
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const active = isActive(item.path);

    return (
      <div key={item.id}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-left h-10 px-3 mb-1 cursor-pointer nav-item",
            level > 0 && "ml-4 w-[calc(100%-1rem)]",
            active && "bg-[var(--admin-primary)]/10 text-[var(--admin-primary)] dark:bg-[var(--admin-primary)]/20 dark:text-[var(--admin-primary)]",
            !active && "text-[var(--admin-text)] dark:text-[var(--admin-text)] hover:bg-[var(--admin-surface-secondary)] dark:hover:bg-[var(--admin-surface-secondary)]"
          )}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              onNavigate(item.path);
            }
          }}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <item.icon className={cn(
                "h-4 w-4",
                active ? "text-[var(--admin-primary)]" : "text-[var(--admin-text-muted)] dark:text-[var(--admin-text-muted)]"
              )} />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <div className="flex items-center space-x-2">
              {item.badge && (
                <Badge
                  variant={item.badgeVariant || "secondary"}
                  className="text-xs px-1.5 py-0.5"
                >
                  {item.badge}
                </Badge>
              )}
              {hasChildren && (
                <div className={cn(
                  "transition-transform duration-200",
                  isExpanded ? "rotate-90" : "rotate-0"
                )}>
                  ▶
                </div>
              )}
            </div>
          </div>
        </Button>

        {hasChildren && isExpanded && (
          <div className="ml-2 border-l border-[var(--admin-border)] dark:border-[var(--admin-border)] pl-2">
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="h-full overflow-y-auto p-4">
      <div className="space-y-2">
        {navigationItems.map(item => renderNavigationItem(item))}
      </div>

      <Separator className="my-6" />

      {/* Quick Actions */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-[var(--admin-text-muted)] dark:text-[var(--admin-text-muted)] uppercase tracking-wider px-3">
          Quick Actions
        </h3>
        <Button
          variant="ghost"
          className="w-full justify-start text-left h-10 px-3 text-[var(--admin-text)] dark:text-[var(--admin-text)] hover:bg-[var(--admin-surface-secondary)] dark:hover:bg-[var(--admin-surface-secondary)] cursor-pointer nav-item"
          onClick={() => onNavigate("/admin/users/create")}
        >
          <Users className="h-4 w-4 mr-3 text-[var(--admin-text-muted)] dark:text-[var(--admin-text-muted)]" />
          <span className="text-sm">Create User</span>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-left h-10 px-3 text-[var(--admin-text)] dark:text-[var(--admin-text)] hover:bg-[var(--admin-surface-secondary)] dark:hover:bg-[var(--admin-surface-secondary)] cursor-pointer nav-item"
          onClick={() => onNavigate("/admin/system-config#backup")}
        >
          <Database className="h-4 w-4 mr-3 text-[var(--admin-text-muted)] dark:text-[var(--admin-text-muted)]" />
          <span className="text-sm">System Backup</span>
        </Button>
      </div>
    </nav>
  );
}