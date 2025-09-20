"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Home, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface AdminBreadcrumbProps {
  currentPath: string;
  className?: string;
}

const pathMappings: Record<string, BreadcrumbItem[]> = {
  "/admin": [
    { label: "Dashboard", path: "/admin", icon: Home },
  ],
  "/admin/users": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "User Management", path: "/admin/users" },
  ],
  "/admin/users/photographers": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "User Management", path: "/admin/users" },
    { label: "Photographers", path: "/admin/users/photographers" },
  ],
  "/admin/users/clients": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "User Management", path: "/admin/users" },
    { label: "Clients", path: "/admin/users/clients" },
  ],
  "/admin/users/create": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "User Management", path: "/admin/users" },
    { label: "Create User", path: "/admin/users/create" },
  ],
  "/admin/galleries": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "Gallery Oversight", path: "/admin/galleries" },
  ],
  "/admin/galleries/analytics": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "Gallery Oversight", path: "/admin/galleries" },
    { label: "Analytics", path: "/admin/galleries/analytics" },
  ],
  "/admin/galleries/storage": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "Gallery Oversight", path: "/admin/galleries" },
    { label: "Storage Management", path: "/admin/galleries/storage" },
  ],
  "/admin/analytics": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "System Analytics", path: "/admin/analytics" },
  ],
  "/admin/analytics/users": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "System Analytics", path: "/admin/analytics" },
    { label: "User Analytics", path: "/admin/analytics/users" },
  ],
  "/admin/analytics/performance": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "System Analytics", path: "/admin/analytics" },
    { label: "Performance", path: "/admin/analytics/performance" },
  ],
  "/admin/security": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "Security & Audit", path: "/admin/security" },
  ],
  "/admin/security/audit": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "Security & Audit", path: "/admin/security" },
    { label: "Audit Logs", path: "/admin/security/audit" },
  ],
  "/admin/security/alerts": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "Security & Audit", path: "/admin/security" },
    { label: "Security Alerts", path: "/admin/security/alerts" },
  ],
  "/admin/security/sessions": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "Security & Audit", path: "/admin/security" },
    { label: "Admin Sessions", path: "/admin/security/sessions" },
  ],
  "/admin/system": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "System Configuration", path: "/admin/system" },
  ],
  "/admin/system/settings": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "System Configuration", path: "/admin/system" },
    { label: "General Settings", path: "/admin/system/settings" },
  ],
  "/admin/system/rules": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "System Configuration", path: "/admin/system" },
    { label: "Business Rules", path: "/admin/system/rules" },
  ],
  "/admin/system/branding": [
    { label: "Dashboard", path: "/admin", icon: Home },
    { label: "System Configuration", path: "/admin/system" },
    { label: "Branding", path: "/admin/system/branding" },
  ],
};

export function AdminBreadcrumb({ currentPath, className }: AdminBreadcrumbProps) {
  // Get breadcrumb items for current path
  const breadcrumbItems = pathMappings[currentPath] || [
    { label: "Dashboard", path: "/admin", icon: Home },
  ];

  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className={cn("flex items-center space-x-1 text-sm", className)}>
      {/* Admin Root Indicator */}
      <div className="flex items-center text-[#425146] mr-2">
        <Shield className="h-4 w-4 mr-1" />
        <span className="font-medium">Admin</span>
      </div>

      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        const Icon = item.icon;

        return (
          <div key={item.path} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
            )}
            
            {isLast ? (
              <span className="text-gray-900 dark:text-gray-100 font-medium flex items-center">
                {Icon && <Icon className="h-4 w-4 mr-1" />}
                {item.label}
              </span>
            ) : (
              <Link href={item.path}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 text-gray-600 dark:text-gray-400 hover:text-[#425146] dark:hover:text-[#425146] hover:bg-transparent"
                >
                  <div className="flex items-center">
                    {Icon && <Icon className="h-4 w-4 mr-1" />}
                    {item.label}
                  </div>
                </Button>
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}