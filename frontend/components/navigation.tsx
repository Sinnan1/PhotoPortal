"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { LogOut, Settings, User, Heart, Star, Users, BarChart3, Moon, Sun, Share2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navigation() {
  const { user, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="border-b border-border/20 bg-[#505c51] backdrop-blur-xl supports-[backdrop-filter]:bg-[#505c51]/90 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 cursor-pointer nav-item">

              <Image
                src="/WHITE-NoBack.png"
                alt="Yarrow Weddings & Co. Logo"
                width={160}
                height={30}
                className="object-contain transition-opacity duration-200 hover:opacity-90"
                priority={true}
                quality={95}
                sizes="(max-width: 640px) 100px, 120px"
                style={{
                  maxWidth: '75%',
                  height: 'auto',
                }}
              />
            </Link>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle Theme"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="hover:bg-white/10 text-white hover:text-white transition-all duration-300 cursor-pointer"
            >
              {mounted && (resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />)}
            </Button>

            {user ? (
              <>
                {/* Role-based navigation */}
                {user.role === "PHOTOGRAPHER" && (
                  <div className="hidden md:flex items-center space-x-2">
                    <Link href="/dashboard">
                      <Button variant="ghost" className="hover:bg-white/10 text-white hover:text-white transition-all duration-300 cursor-pointer">Dashboard</Button>
                    </Link>
                    <Link href="/dashboard/clients">
                      <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 text-white hover:text-white transition-all duration-300 cursor-pointer">
                        <Users className="h-4 w-4" />
                        Clients
                      </Button>
                    </Link>
                    <Link href="/dashboard/analytics">
                      <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 text-white hover:text-white transition-all duration-300 cursor-pointer">
                        <BarChart3 className="h-4 w-4" />
                        Analytics
                      </Button>
                    </Link>
                    <Link href="/dashboard/posts">
                      <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 text-white hover:text-white transition-all duration-300 cursor-pointer">
                        <Share2 className="h-4 w-4" />
                        Posts
                      </Button>
                    </Link>
                  </div>
                )}

                {user.role === "CLIENT" && (
                  <div className="hidden md:flex items-center space-x-2">
                    <Link href="/dashboard/client">
                      <Button variant="ghost" className="hover:bg-white/10 text-white hover:text-white transition-all duration-300 cursor-pointer">Dashboard</Button>
                    </Link>
                  </div>
                )}

                {user.role === "ADMIN" && (
                  <div className="hidden md:flex items-center space-x-2">
                    <Link href="/admin">
                      <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 text-white hover:text-white transition-all duration-300 cursor-pointer">
                        <Shield className="h-4 w-4" />
                        Admin Panel
                      </Button>
                    </Link>
                    <Link href="/admin/users">
                      <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 text-white hover:text-white transition-all duration-300 cursor-pointer">
                        <Users className="h-4 w-4" />
                        Users
                      </Button>
                    </Link>
                    <Link href="/admin/galleries">
                      <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 text-white hover:text-white transition-all duration-300 cursor-pointer">
                        <BarChart3 className="h-4 w-4" />
                        Galleries
                      </Button>
                    </Link>
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center space-x-2 hover:bg-white/10 text-white hover:text-white transition-all duration-300 min-w-0 sm:min-w-fit cursor-pointer"
                    >
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate max-w-20 sm:max-w-none">{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* Main Dashboard Link - Always first */}
                    <Link href={user.role === "PHOTOGRAPHER" ? "/dashboard" : user.role === "ADMIN" ? "/admin" : "/dashboard/client"}>
                      <DropdownMenuItem>
                        {user.role === "ADMIN" ? <Shield className="mr-2 h-4 w-4" /> : <BarChart3 className="mr-2 h-4 w-4" />}
                        <span>{user.role === "ADMIN" ? "Admin Panel" : "Dashboard"}</span>
                      </DropdownMenuItem>
                    </Link>
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
                  <Button variant="ghost" className="hover:bg-white/10 text-white hover:text-white transition-all duration-300 cursor-pointer">Sign In</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

