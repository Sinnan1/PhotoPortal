"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { LogOut, Settings, User, Heart, Star, Users, BarChart3, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navigation() {
  const { user, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <nav className="border-b bg-white dark:bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="/Logo-Main.png"
                alt="Yarrow Weddings & Co."
                width={500}
                height={500}
                priority
                className="h-40 w-auto"
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
            >
              {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

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
                  <Button variant="ghost">Sign In</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
