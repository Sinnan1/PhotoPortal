"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
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
  Search
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

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function AdminHeader({ onToggleSidebar, sidebarOpen }: AdminHeaderProps) {
  const { user, adminLogout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  
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
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left Section - Logo and Sidebar Toggle */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          <Link href="/admin" className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-[#425146]" />
              <span className="text-[#425146] font-semibold text-lg font-['Lato'] hidden sm:block">
                Yarrow Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Center Section - Search (hidden on mobile) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search users, galleries, or settings..."
              className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
            />
          </div>
        </div>

        {/* Right Section - Actions and User Menu */}
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Bell className="h-5 w-5" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              3
            </Badge>
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 px-3"
              >
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-[#425146] flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium">{user?.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Administrator</div>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-1.5">
                <div className="text-sm font-medium">{user?.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</div>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Administrator
                  </Badge>
                  {sessionInfo && (
                    <Badge 
                      variant={sessionInfo.minutesLeft < 15 ? "destructive" : "outline"} 
                      className="text-xs"
                    >
                      {sessionInfo.minutesLeft}m left
                    </Badge>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Admin Preferences</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <Link href="/" className="block">
                <DropdownMenuItem>
                  <span className="mr-2">🏠</span>
                  <span>View Main Site</span>
                </DropdownMenuItem>
              </Link>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Secure Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}