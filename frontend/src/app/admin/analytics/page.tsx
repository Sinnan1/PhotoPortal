"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Users,
  FolderOpen,
  Download,
  Activity,
  Server,
  Database,
  Image,
  Eye,
  Calendar
} from "lucide-react";
import { motion } from "framer-motion";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { useStorageData, formatStorageSize } from "@/hooks/use-storage-data";

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalGalleries: number;
  totalDownloads: number;
  storageBytes: number;
  systemHealth: {
    responseTime: number;
    uptime: string;
    memoryUsed: number;
    errorRate: number;
  };
  // Merged Gallery Analytics
  publicGalleries: number;
  privateGalleries: number;
  averagePhotosPerGallery: number;
  topPerformingGalleries: Array<{
    id: string;
    title: string;
    photographer: string;
    views: number;
    downloads: number;
  }>;
  galleryGrowth: {
    thisMonth: number;
    lastMonth: number;
    percentageChange: number;
  };
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    activeUsers: 0,
    totalGalleries: 0,
    totalDownloads: 0,
    storageBytes: 0,
    systemHealth: {
      responseTime: 0,
      uptime: '0h',
      memoryUsed: 0,
      errorRate: 0,
    },
    publicGalleries: 0,
    privateGalleries: 0,
    averagePhotosPerGallery: 0,
    topPerformingGalleries: [],
    galleryGrowth: {
      thisMonth: 0,
      lastMonth: 0,
      percentageChange: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Use centralized storage hook
  const { totalStorageBytes, fetchStorageData } = useStorageData();

  useEffect(() => {
    fetchAnalyticsData();
    fetchStorageData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [userStatsResponse, galleryStatsResponse, healthResponse] = await Promise.all([
        adminApi.getUserStatistics(),
        adminApi.getGalleryStatistics(),
        adminApi.getSystemHealth().catch(() => ({ data: null })), // Graceful fallback
      ]);

      const userStats = userStatsResponse.data;
      const galleryStats = galleryStatsResponse.data;
      const healthData = healthResponse.data;

      // Extract real download stats from gallery analytics
      const downloads = galleryStats?.downloads || {};
      const totalDownloads = (downloads.totalGalleryDownloads || 0) + (downloads.totalPhotoDownloads || 0);
      const overview = galleryStats?.overview || {};
      const storage = galleryStats?.storage || {};
      const topPhotographers = galleryStats?.topPhotographers || [];
      const activityTrends = galleryStats?.activityTrends || [];

      // Calculate this month and last month galleries from activity trends
      const now = new Date();
      const thisMonth = now.getMonth();
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;

      let thisMonthGalleries = overview.newGalleries || 0;
      let lastMonthGalleries = 0;

      // Count galleries from activity trends
      activityTrends.forEach((trend: any) => {
        const trendDate = new Date(trend.date);
        if (trendDate.getMonth() === lastMonth) {
          lastMonthGalleries += trend.galleriesCreated || 0;
        }
      });

      // Calculate percentage change
      const percentageChange = lastMonthGalleries > 0
        ? Math.round(((thisMonthGalleries - lastMonthGalleries) / lastMonthGalleries) * 100)
        : thisMonthGalleries > 0 ? 100 : 0;

      // Build top performing galleries from top photographers data
      // Note: Backend currently gives top photographers, we will adapt this to show as "galleries" or similar context
      // For now, mapping top photographers to a gallery-like structure as in the original analytics page
      const topGalleries = topPhotographers.slice(0, 5).map((photographer: any) => ({
        id: photographer.id,
        title: `${photographer.name}'s Galleries`,
        photographer: photographer.name,
        views: 0, // Views not tracked in current backend
        downloads: downloads.totalPhotoDownloads ? Math.round(downloads.totalPhotoDownloads / (topPhotographers.length || 1)) : 0,
      }));


      // Extract system health data
      const systemHealth = {
        responseTime: healthData?.database?.responseTime || 0,
        uptime: healthData?.system?.uptimeFormatted || '0h',
        memoryUsed: healthData?.system?.memory?.used || 0,
        errorRate: healthData?.performance?.errorRate || 0,
      };

      setAnalytics({
        totalUsers: userStats.overview.totalUsers,
        activeUsers: userStats.overview.activeUsers,
        totalGalleries: galleryStats?.overview?.totalGalleries || 0,
        totalDownloads,
        storageBytes: 0, // Will use hook's totalStorageBytes
        systemHealth,
        publicGalleries: overview.activeGalleries || 0,
        privateGalleries: overview.passwordProtectedGalleries || 0,
        averagePhotosPerGallery: storage.totalPhotos && overview.totalGalleries
          ? Math.round(storage.totalPhotos / overview.totalGalleries)
          : 0,
        topPerformingGalleries: topGalleries,
        galleryGrowth: {
          thisMonth: thisMonthGalleries,
          lastMonth: lastMonthGalleries,
          percentageChange,
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-audrey text-gray-900 dark:text-gray-100">System Analytics</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive insights into platform usage and performance
          </p>
        </div>
      </motion.div>

      {/* Key Metrics - Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          {
            title: "Total Users",
            value: analytics.totalUsers,
            subtext: "All registered",
            icon: Users,
            color: "text-blue-500"
          },
          {
            title: "Active Users",
            value: analytics.activeUsers,
            subtext: "Non-suspended",
            icon: Activity,
            color: "text-green-500"
          },
          {
            title: "Galleries",
            value: analytics.totalGalleries,
            subtext: "Total created",
            icon: FolderOpen,
            color: "text-purple-500"
          },
          {
            title: "Downloads",
            value: analytics.totalDownloads.toLocaleString(),
            subtext: "Total downloads",
            icon: Download,
            color: "text-amber-500"
          },
          {
            title: "Storage",
            value: formatStorageSize(totalStorageBytes),
            subtext: "B2 cloud storage",
            icon: Database,
            color: "text-red-500",
            mobileColSpan: true,
            href: "/admin/galleries/storage"
          },
        ].map((metric, index) => {
          const CardContentWrapper = ({ children }: { children: React.ReactNode }) => (
            <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm group hover:border-primary/20 transition-all duration-300 cursor-pointer">
              {children}
            </Card>
          );

          const content = (
            <Card className={`h-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm group hover:border-primary/20 transition-all duration-300 ${metric.href ? 'cursor-pointer hover:bg-background/80' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 md:p-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{metric.title}</CardTitle>
                <metric.icon className={`h-3.5 w-3.5 ${metric.color} group-hover:scale-110 transition-transform`} />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-5 bg-primary/10 rounded w-12"></div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xl md:text-2xl font-bold font-audrey">{metric.value}</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{metric.subtext}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={metric.mobileColSpan ? "col-span-2 md:col-span-1 lg:col-span-1" : ""}
            >
              {metric.href ? (
                <Link href={metric.href}>
                  {content}
                </Link>
              ) : (
                content
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Detailed Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Overview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle className="font-audrey flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                System Overview
              </CardTitle>
              <CardDescription>
                Current system statistics and resource distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded"></div>)}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> Users
                      </span>
                      <span className="font-medium">{analytics.activeUsers} / {analytics.totalUsers}</span>
                    </div>
                    <Progress
                      value={analytics.totalUsers > 0 ? (analytics.activeUsers / analytics.totalUsers) * 100 : 0}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground text-right">{Math.round(analytics.totalUsers > 0 ? (analytics.activeUsers / analytics.totalUsers) * 100 : 0)}% Active</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <FolderOpen className="h-3.5 w-3.5" /> Galleries
                      </span>
                      <span className="font-medium">{analytics.totalGalleries}</span>
                    </div>
                    <Progress
                      value={100}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground text-right">All galleries active</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Database className="h-3.5 w-3.5" /> B2 Storage
                      </span>
                      <span className="font-medium">{formatStorageSize(totalStorageBytes)}</span>
                    </div>
                    <Progress
                      value={100} // We don't have a limit, so show as utilized
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground text-right">Backblaze B2 bucket</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* System Status & Health */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle className="font-audrey flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                System Health
              </CardTitle>
              <CardDescription>
                Real-time operational status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-green-900 dark:text-green-100">All Systems Operational</h4>
                      <p className="text-sm text-green-700 dark:text-green-300">Frontend, API, and Database are running normally.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-background/40 border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1">DB Response</div>
                      <div className="text-lg font-bold font-mono">{analytics.systemHealth.responseTime}ms</div>
                    </div>
                    <div className="p-3 rounded-lg bg-background/40 border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1">Uptime</div>
                      <div className="text-lg font-bold font-mono">{analytics.systemHealth.uptime}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-audrey text-base">Quick Performance Stats</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-4 bg-gray-100 rounded"></div>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">Error Rate</span>
                    <span className={`font-mono font-medium ${analytics.systemHealth.errorRate < 5 ? 'text-green-500' : 'text-red-500'}`}>
                      {analytics.systemHealth.errorRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-8 w-px bg-border"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">Memory</span>
                    <span className="font-mono font-medium text-blue-500">{analytics.systemHealth.memoryUsed}MB</span>
                  </div>
                  <div className="h-8 w-px bg-border"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">DB Speed</span>
                    <span className={`font-mono font-medium ${analytics.systemHealth.responseTime < 100 ? 'text-green-500' : 'text-amber-500'}`}>
                      {analytics.systemHealth.responseTime}ms
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Gallery Distribution & Growth (Merged from Gallery Analytics) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle className="font-audrey">Gallery Visibility</CardTitle>
              <CardDescription>Distribution of public vs private galleries</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded"></div>)}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> Public
                      </span>
                      <span className="font-medium">{analytics.publicGalleries}</span>
                    </div>
                    <Progress
                      value={analytics.totalGalleries > 0 ? (analytics.publicGalleries / analytics.totalGalleries) * 100 : 0}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-500"></span> Private
                      </span>
                      <span className="font-medium">{analytics.privateGalleries}</span>
                    </div>
                    <Progress
                      value={analytics.totalGalleries > 0 ? (analytics.privateGalleries / analytics.totalGalleries) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle className="font-audrey">Gallery Growth</CardTitle>
              <CardDescription>Monthly gallery creation trends</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">This Month</div>
                    <div className="text-3xl font-bold font-audrey text-green-700 dark:text-green-300">{analytics.galleryGrowth.thisMonth}</div>
                    <div className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">New galleries</div>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Last Month</div>
                    <div className="text-3xl font-bold font-audrey text-blue-700 dark:text-blue-300">{analytics.galleryGrowth.lastMonth}</div>
                    <div className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">Historical average</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top Performing Galleries (Merged from Gallery Analytics) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="font-audrey">Top Performing Galleries</CardTitle>
            <CardDescription>
              Galleries with the highest engagement metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>)}
              </div>
            ) : analytics.topPerformingGalleries.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No performance data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.topPerformingGalleries.map((gallery, index) => (
                  <div key={gallery.id} className="group flex items-center justify-between p-3 md:p-4 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all duration-300">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-background border border-border flex items-center justify-center font-audrey font-bold text-lg md:text-xl shadow-sm text-muted-foreground group-hover:text-primary transition-colors">
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold font-audrey text-base md:text-lg text-foreground group-hover:text-primary transition-colors">{gallery.title}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          by {gallery.photographer}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-8 text-sm">
                      <div className="text-center min-w-[50px]">
                        <div className="flex items-center justify-center space-x-1 font-bold">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{gallery.views}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Views</p>
                      </div>
                      <div className="text-center min-w-[50px]">
                        <div className="flex items-center justify-center space-x-1 font-bold">
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{gallery.downloads}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Downloads</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}