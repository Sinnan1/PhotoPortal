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
  UserCheck,
  ArrowRight,
  HardDrive
} from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { useStorageData, formatStorageSize } from "@/hooks/use-storage-data";
import { DashboardStatCard } from "@/components/admin/DashboardStatCard";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalGalleries: number;
  pendingApprovals: number;
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
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Use centralized storage hook
  const { totalStorageBytes, fetchStorageData } = useStorageData();

  useEffect(() => {
    fetchDashboardData();
    fetchStorageData(); // Fetch storage separately using the centralized hook
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch user statistics
      const userStatsResponse = await adminApi.getUserStatistics();
      const userStats = userStatsResponse.data;

      // Fetch gallery statistics
      const galleryStatsResponse = await adminApi.getAllGalleries({ limit: 10 });
      const totalGalleries = galleryStatsResponse.data.pagination?.total || 0;

      // Fetch pending approvals
      const pendingResponse = await adminApi.getPendingApprovals();
      const pendingApprovals = pendingResponse.data.count || 0;

      setStats({
        totalUsers: userStats.overview.totalUsers,
        activeUsers: userStats.overview.activeUsers,
        totalGalleries,
        pendingApprovals,
      });

      // Generate recent activity from real data
      const activities: RecentActivity[] = [];

      if (pendingApprovals > 0) {
        activities.push({
          id: 'pending-approvals',
          action: `${pendingApprovals} photographer registration${pendingApprovals > 1 ? 's' : ''} pending approval`,
          user: 'System',
          time: 'Now',
          type: 'user'
        });
      }

      if (userStats.overview.recentUsers > 0) {
        activities.push({
          id: 'recent-users',
          action: `${userStats.overview.recentUsers} new user${userStats.overview.recentUsers > 1 ? 's' : ''} registered`,
          user: 'System',
          time: 'This month',
          type: 'user'
        });
      }

      if (totalGalleries > 0) {
        activities.push({
          id: 'galleries',
          action: `${totalGalleries} total galleries in system`,
          user: 'System',
          time: 'Current',
          type: 'gallery'
        });
      }

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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-audrey gradient-text">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your platform's performance and activity
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
          <Button variant="outline" className="gap-2">
            <Clock className="h-4 w-4" />
            Last 30 Days
          </Button>
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <BarChart3 className="h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6" // Compact 2x2 grid on mobile
      >
        <DashboardStatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          description="All registered users"
          trend={{ value: 12, label: "this month", isPositive: true }}
          delay={0.1}
        />
        <DashboardStatCard
          title="Active Users"
          value={stats.activeUsers}
          icon={Activity}
          description="Non-suspended users"
          delay={0.2}
        />
        <DashboardStatCard
          title="Total Galleries"
          value={stats.totalGalleries}
          icon={FolderOpen}
          description="Across all accounts"
          trend={{ value: 5, label: "this week", isPositive: true }}
          delay={0.3}
        />
        <DashboardStatCard
          title="B2 Storage"
          value={formatStorageSize(totalStorageBytes)}
          icon={HardDrive}
          description="Total data in Backblaze B2"
          delay={0.4}
        />
      </motion.div>

      {/* Bento Grid Layout - Reversed on mobile to show Actions first */}
      <div className="flex flex-col-reverse lg:grid lg:grid-cols-3 gap-6">

        {/* Main Activity Feed - Spans 2 columns */}
        <motion.div
          variants={item}
          initial="hidden"
          animate="show" whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="lg:col-span-2"
        >
          <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                System Activity
              </CardTitle>
              <CardDescription>
                Recent actions and system notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-4 p-3 rounded-lg border border-transparent">
                      <div className="h-8 w-8 bg-muted rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group flex items-center space-x-3 md:space-x-4 p-3 md:p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-background hover:border-primary/20 transition-all duration-300 hover:shadow-md"
                      >
                        <div className={cn(
                          "flex-shrink-0 h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center transition-colors",
                          activity.type === "user" ? "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white" :
                            activity.type === "gallery" ? "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white" :
                              "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white"
                        )}>
                          {activity.type === "user" && <Users className="h-4 w-4 md:h-5 md:w-5" />}
                          {activity.type === "gallery" && <FolderOpen className="h-4 w-4 md:h-5 md:w-5" />}
                          {activity.type === "security" && <Shield className="h-4 w-4 md:h-5 md:w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {activity.action}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.user} • {activity.time}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 md:py-12">
                      <Activity className="h-10 w-10 md:h-12 md:w-12 text-muted mx-auto mb-4" />
                      <p className="text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column: Quick Actions & Status */}
        <div className="space-y-4 md:space-y-6">
          {/* Pending Approvals Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className={cn(
              "border-l-4 transition-all duration-300 shadow-sm",
              stats.pendingApprovals > 0 ? "border-l-amber-500" : "border-l-emerald-500"
            )}>
              <CardHeader className="pb-2 p-4 md:p-6 md:pb-3">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  <span>Pending Actions</span>
                  {stats.pendingApprovals > 0 ? (
                    <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600 border-none">{stats.pendingApprovals}</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">All Clear</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                {stats.pendingApprovals > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      You have {stats.pendingApprovals} photographer registration{stats.pendingApprovals > 1 ? 's' : ''} waiting for approval.
                    </p>
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white" onClick={() => window.location.href = '/admin/users'}>
                      Review Applications
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Shield className="h-10 w-10 text-emerald-500 opacity-20" />
                    <p>All tasks are up to date. System is running smoothly.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions Grid */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="p-4 md:p-6 pb-2">
                <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 p-4 pt-0 md:p-6 md:pt-0">
                <Link href="/admin/users/create" className="contents">
                  <Button variant="outline" className="h-16 md:h-20 flex flex-col gap-1 md:gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    <span className="text-xs font-medium">Add User</span>
                  </Button>
                </Link>
                <Link href="/admin/galleries" className="contents">
                  <Button variant="outline" className="h-16 md:h-20 flex flex-col gap-1 md:gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <FolderOpen className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    <span className="text-xs font-medium">Galleries</span>
                  </Button>
                </Link>
                <Link href="/admin/analytics" className="contents">
                  <Button variant="outline" className="h-16 md:h-20 flex flex-col gap-1 md:gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    <span className="text-xs font-medium">Analytics</span>
                  </Button>
                </Link>
                <Link href="/admin/system-config#backup" className="contents">
                  <Button variant="outline" className="h-16 md:h-20 flex flex-col gap-1 md:gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <Database className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    <span className="text-xs font-medium">Backup</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}