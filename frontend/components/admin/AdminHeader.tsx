"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import { AdminSearch } from "./AdminSearch";
import { AdminNotifications } from "./AdminNotifications";
import {
  Menu,
  X,
  LogOut,
  Settings,
  User,
  Shield,
  Moon,
  Sun,
  Bell,
  Search,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function AdminHeader({ onToggleSidebar, sidebarOpen }: AdminHeaderProps) {
  const { user, adminLogout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();

  // Get session info from localStorage
  const getSessionInfo = () => {
    try {
      const adminSession = localStorage.getItem("admin-session");
      if (adminSession) {
        const sessionData = JSON.parse(adminSession);
        const expiresAt = new Date(sessionData.expiresAt);
        const now = new Date();
        const timeLeft = Math.max(0, expiresAt.getTime() - now.getTime());
        const minutesLeft = Math.floor(timeLeft / (1000 * 60));
        return { expiresAt, minutesLeft, sessionId: sessionData.sessionId };
      }
    } catch (error) {
      console.error("Error reading session info:", error);
    }
    return null;
  };

  const sessionInfo = getSessionInfo();

  const handleLogout = async () => {
    if (confirm("Are you sure you want to sign out of the admin panel?")) {
      await adminLogout();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 gap-4">
        {/* Sidebar Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="mr-2 text-muted-foreground hover:text-foreground"
        >
          {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
        </Button>

        {/* Breadcrumb Placeholder or Page Title could go here */}
        <div className="flex-1 flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2 md:hidden">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-audrey font-bold text-lg">Yarrow</span>
          </Link>

          {/* Search (hidden on mobile) */}
          <div className="hidden md:flex max-w-sm w-full lg:max-w-md">
            <AdminSearch />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <AdminNotifications />

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="text-muted-foreground hover:text-foreground"
          >
            {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 pl-2 pr-4 rounded-full border border-border/0 hover:bg-muted/50 hover:border-border/50 transition-all"
              >
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium leading-none">{user?.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">Admin</div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user?.name && <p className="font-medium">{user.name}</p>}
                  {user?.email && (
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Preferences</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/" className="cursor-pointer">
                  <span className="mr-2">🏠</span>
                  <span>View Site</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}