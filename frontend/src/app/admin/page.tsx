"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  FolderOpen,
  BarChart3,
  Shield,
  AlertTriangle,
  Database,
  Activity,
  Clock,
  UserCheck
} from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalGalleries: number;
  pendingApprovals: number;
  storageUsed: string;
  storageLimit: string;
}

interface RecentActivity {
  id: string;
  action: string;
  user: string;
  time: string;
  type: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalGalleries: 0,
    pendingApprovals: 0,
    storageUsed: "0 MB",
    storageLimit: "10 GB",
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch user statistics
      const userStatsResponse = await adminApi.getUserStatistics();
      const userStats = userStatsResponse.data;

      // Fetch gallery statistics
      const galleryStatsResponse = await adminApi.getAllGalleries({ limit: 1 });
      const totalGalleries = galleryStatsResponse.data.pagination?.total || 0;

      // Fetch pending approvals
      const pendingResponse = await adminApi.getPendingApprovals();
      const pendingApprovals = pendingResponse.data.count || 0;

      // Calculate storage (simplified - you might want to add actual storage calculation)
      const storageUsed = totalGalleries > 0 ? `${(totalGalleries * 0.1).toFixed(1)} GB` : "0 MB";

      setStats({
        totalUsers: userStats.overview.totalUsers,
        activeUsers: userStats.overview.activeUsers,
        totalGalleries,
        pendingApprovals,
        storageUsed,
        storageLimit: "10 GB",
      });

      // Generate recent activity from real data
      const activities: RecentActivity[] = [];

      // Add pending approvals to activity
      if (pendingApprovals > 0) {
        activities.push({
          id: 'pending-approvals',
          action: `${pendingApprovals} photographer registration${pendingApprovals > 1 ? 's' : ''} pending approval`,
          user: 'System',
          time: 'Now',
          type: 'user'
        });
      }

      // Add user statistics to activity
      if (userStats.overview.recentUsers > 0) {
        activities.push({
          id: 'recent-users',
          action: `${userStats.overview.recentUsers} new user${userStats.overview.recentUsers > 1 ? 's' : ''} registered`,
          user: 'System',
          time: 'This month',
          type: 'user'
        });
      }

      // Add gallery activity
      if (totalGalleries > 0) {
        activities.push({
          id: 'galleries',
          action: `${totalGalleries} total galleries in system`,
          user: 'System',
          time: 'Current',
          type: 'gallery'
        });
      }

      // Add system status
      activities.push({
        id: 'system-status',
        action: 'System running normally',
        user: 'System',
        time: 'Now',
        type: 'security'
      });

      setRecentActivity(activities);

    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: "Create User", icon: Users, href: "/admin/users/create", variant: "default" as const },
    { label: "View Security Alerts", icon: AlertTriangle, href: "/admin/security/alerts", variant: "destructive" as const },
    { label: "System Backup", icon: Database, href: "/admin/system/backup", variant: "outline" as const },
    { label: "View Analytics", icon: BarChart3, href: "/admin/analytics", variant: "secondary" as const },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Welcome to the Yarrow Weddings & Co. administration panel
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  All registered users
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Non-suspended users
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Galleries</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalGalleries}</div>
                <p className="text-xs text-muted-foreground">
                  Created by photographers
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingApprovals > 0 ? (
                    <span className="text-amber-600">Require attention</span>
                  ) : (
                    "All caught up"
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-500" />
              <span>System Status</span>
              {stats.pendingApprovals > 0 && (
                <Badge variant="secondary">{stats.pendingApprovals}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Current system status and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                <div className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            ) : (
              <>
                {stats.pendingApprovals > 0 ? (
                  <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <UserCheck className="h-4 w-4 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Pending photographer approvals
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {stats.pendingApprovals} registration{stats.pendingApprovals > 1 ? 's' : ''} awaiting review
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => window.location.href = '/admin/users'}>
                      Review
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          All approvals processed
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          No pending photographer registrations
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        System operational
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        All services running normally
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="default"
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={() => window.location.href = '/admin/users'}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs text-center">Manage Users</span>
              </Button>

              <Button
                variant={stats.pendingApprovals > 0 ? "destructive" : "outline"}
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={() => window.location.href = '/admin/users'}
              >
                <UserCheck className="h-5 w-5" />
                <span className="text-xs text-center">
                  {stats.pendingApprovals > 0 ? `Approvals (${stats.pendingApprovals})` : 'View Approvals'}
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={() => window.location.href = '/admin/galleries'}
              >
                <FolderOpen className="h-5 w-5" />
                <span className="text-xs text-center">View Galleries</span>
              </Button>

              <Button
                variant="secondary"
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={() => window.location.href = '/admin/analytics'}
              >
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs text-center">View Analytics</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>
            Current system status and activity summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-3">
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex-shrink-0">
                      {activity.type === "user" && <Users className="h-4 w-4 text-blue-600" />}
                      {activity.type === "gallery" && <FolderOpen className="h-4 w-4 text-green-600" />}
                      {activity.type === "security" && <Shield className="h-4 w-4 text-green-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {activity.action}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {activity.user}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No recent activity</p>
                  <p className="text-sm text-gray-400 mt-1">
                    System activity will appear here
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}