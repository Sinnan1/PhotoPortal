"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Camera, LogOut, Settings, User, Heart, Star, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Camera className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">
                PhotoPortal
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Role-based navigation */}
                {user.role === "PHOTOGRAPHER" && (
                  <div className="hidden md:flex items-center space-x-2">
                    <Link href="/dashboard">
                      <Button variant="ghost">Dashboard</Button>
                    </Link>
                    <Link href="/dashboard/clients">
                      <Button variant="ghost" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Clients
                      </Button>
                    </Link>
                    <Link href="/dashboard/analytics">
                      <Button variant="ghost" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Analytics
                      </Button>
                    </Link>
                  </div>
                )}

                {user.role === "CLIENT" && (
                  <div className="hidden md:flex items-center space-x-2">
                    <Link href="/dashboard/client">
                      <Button variant="ghost">Dashboard</Button>
                    </Link>
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center space-x-2"
                    >
                      <User className="h-4 w-4" />
                      <span>{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    
                    {/* Role-based menu items */}
                    {user.role === "PHOTOGRAPHER" && (
                      <>
                        <Link href="/dashboard/clients">
                          <DropdownMenuItem>
                            <Users className="mr-2 h-4 w-4" />
                            <span>Manage Clients</span>
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/dashboard/analytics">
                          <DropdownMenuItem>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            <span>Analytics</span>
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    
                    <Link href="/dashboard/liked">
                      <DropdownMenuItem>
                        <Heart className="mr-2 h-4 w-4" />
                        <span>Liked Photos</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/dashboard/favorites">
                      <DropdownMenuItem>
                        <Star className="mr-2 h-4 w-4" />
                        <span>Favorites</span>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/register">
                  <Button>Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
