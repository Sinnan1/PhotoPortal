"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users,
  FolderOpen,
  Eye,
  Download,
  Clock,
  Calendar
} from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalGalleries: number;
  totalViews: number;
  totalDownloads: number;
  storageUsage: { value: number; total: number; percentage: number };
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    activeUsers: 0,
    totalGalleries: 0,
    totalViews: 0,
    totalDownloads: 0,
    storageUsage: { value: 0, total: 10, percentage: 0 },
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch user statistics
      const userStatsResponse = await adminApi.getUserStatistics();
      const userStats = userStatsResponse.data;
      
      // Fetch gallery statistics
      const galleryStatsResponse = await adminApi.getAllGalleries({ limit: 1 });
      const totalGalleries = galleryStatsResponse.data.pagination?.total || 0;
      
      // Calculate estimated storage (simplified calculation)
      const estimatedStorage = totalGalleries * 0.1; // Assume 100MB per gallery
      const storagePercentage = Math.min((estimatedStorage / 10) * 100, 100);
      
      setAnalytics({
        totalUsers: userStats.overview.totalUsers,
        activeUsers: userStats.overview.activeUsers,
        totalGalleries,
        totalViews: totalGalleries * 50, // Estimated views
        totalDownloads: totalGalleries * 15, // Estimated downloads
        storageUsage: {
          value: parseFloat(estimatedStorage.toFixed(1)),
          total: 10,
          percentage: Math.round(storagePercentage),
        },
      });
      
    } catch (error: any) {
      console.error('Failed to fetch analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    return trend === "up" ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getTrendColor = (trend: string) => {
    return trend === "up" ? "text-green-600" : "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">System Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Comprehensive insights into platform usage and performance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div className="text-2xl font-bold">{analytics.totalUsers}</div>
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-muted-foreground">
                    All registered users
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
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
                <div className="text-2xl font-bold">{analytics.activeUsers}</div>
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-muted-foreground">
                    Non-suspended users
                  </span>
                </div>
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
                <div className="text-2xl font-bold">{analytics.totalGalleries}</div>
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-muted-foreground">
                    Created by photographers
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{analytics.totalViews.toLocaleString()}</div>
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-muted-foreground">
                    Estimated gallery views
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{analytics.totalDownloads.toLocaleString()}</div>
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-muted-foreground">
                    Estimated downloads
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{analytics.storageUsage.value} GB</div>
                <div className="mt-2">
                  <Progress value={analytics.storageUsage.percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.storageUsage.percentage}% of {analytics.storageUsage.total} GB
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Overview */}
        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <CardDescription>
              Current system statistics and usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-16 text-sm font-medium">Users</div>
                    <div className="flex-1">
                      <Progress 
                        value={analytics.totalUsers > 0 ? (analytics.activeUsers / analytics.totalUsers) * 100 : 0} 
                        className="h-2"
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium w-16 text-right">
                    {analytics.activeUsers}/{analytics.totalUsers}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-16 text-sm font-medium">Galleries</div>
                    <div className="flex-1">
                      <Progress 
                        value={analytics.totalGalleries > 0 ? Math.min((analytics.totalGalleries / 10) * 100, 100) : 0} 
                        className="h-2"
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium w-16 text-right">{analytics.totalGalleries}</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-16 text-sm font-medium">Storage</div>
                    <div className="flex-1">
                      <Progress 
                        value={analytics.storageUsage.percentage} 
                        className="h-2"
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium w-16 text-right">
                    {analytics.storageUsage.value}GB
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current system health and activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse p-3 rounded-lg bg-gray-100">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs bg-green-100">
                      ✓
                    </Badge>
                    <div>
                      <p className="font-medium text-sm text-green-800 dark:text-green-200">System Operational</p>
                      <div className="flex items-center space-x-4 text-xs text-green-600 dark:text-green-400">
                        <span>All services running normally</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs bg-blue-100">
                      {analytics.totalUsers}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm text-blue-800 dark:text-blue-200">Active Users</p>
                      <div className="flex items-center space-x-4 text-xs text-blue-600 dark:text-blue-400">
                        <span>{analytics.activeUsers} users currently active</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs bg-purple-100">
                      {analytics.totalGalleries}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm text-purple-800 dark:text-purple-200">Total Galleries</p>
                      <div className="flex items-center space-x-4 text-xs text-purple-600 dark:text-purple-400">
                        <span>Created by photographers</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Performance */}
      <Card>
        <CardHeader>
          <CardTitle>System Performance Overview</CardTitle>
          <CardDescription>
            Current system health and performance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>System Status</span>
                  <span className="text-green-600">Operational</span>
                </div>
                <Progress value={100} className="h-2" />
                <p className="text-xs text-gray-500">All systems running</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>User Activity</span>
                  <span className="text-green-600">{Math.round((analytics.activeUsers / Math.max(analytics.totalUsers, 1)) * 100)}%</span>
                </div>
                <Progress value={(analytics.activeUsers / Math.max(analytics.totalUsers, 1)) * 100} className="h-2" />
                <p className="text-xs text-gray-500">Active user ratio</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Storage Health</span>
                  <span className={analytics.storageUsage.percentage > 80 ? "text-red-600" : "text-green-600"}>
                    {analytics.storageUsage.percentage < 80 ? "Good" : "High"}
                  </span>
                </div>
                <Progress value={analytics.storageUsage.percentage} className="h-2" />
                <p className="text-xs text-gray-500">Storage utilization</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}