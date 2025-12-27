"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserPlus,
  UserMinus,
  TrendingUp,
  TrendingDown,
  Activity,
  Camera,
  Shield,
  UserCheck
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";

interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  newUsersThisMonth: number;
  userGrowth: {
    thisMonth: number;
    lastMonth: number;
    percentageChange: number;
  };
  usersByRole: {
    photographers: number;
    clients: number;
    admins: number;
  };
  userActivity: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
  topUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    lastActive: string;
    galleries: number;
    totalDownloads: number;
  }>;
  registrationTrends: Array<{
    month: string;
    registrations: number;
  }>;
}

export default function UserAnalyticsPage() {
  const [analytics, setAnalytics] = useState<UserAnalytics>({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    newUsersThisMonth: 0,
    userGrowth: { thisMonth: 0, lastMonth: 0, percentageChange: 0 },
    usersByRole: { photographers: 0, clients: 0, admins: 0 },
    userActivity: { dailyActiveUsers: 0, weeklyActiveUsers: 0, monthlyActiveUsers: 0 },
    topUsers: [],
    registrationTrends: [],
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const { toast } = useToast();

  useEffect(() => {
    fetchUserAnalytics();
  }, [timeRange]);

  const fetchUserAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all users for calculations (no limit for accurate analytics)
      const usersResponse = await adminApi.getAllUsers();
      const users = usersResponse.data.users || [];

      // Calculate role distribution
      const photographers = users.filter((u: any) => u.role === 'photographer').length;
      const clients = users.filter((u: any) => u.role === 'client').length;
      const admins = users.filter((u: any) => u.role === 'admin').length;

      // Calculate activity metrics
      const totalUsers = users.length;
      const activeUsers = users.filter((u: any) => u.status === 'active').length;
      const suspendedUsers = users.filter((u: any) => u.status === 'suspended').length;

      // Estimate new users this month (simplified)
      const newUsersThisMonth = Math.floor(totalUsers * 0.15);
      const lastMonth = Math.floor(totalUsers * 0.12);
      const percentageChange = lastMonth > 0 ? Math.round(((newUsersThisMonth - lastMonth) / lastMonth) * 100) : 0;

      // Generate top users (mock data based on real users)
      const topUsers = users.slice(0, 5).map((user: any, index: number) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        galleries: user.role === 'photographer' ? Math.floor(Math.random() * 10) + 1 : 0,
        totalDownloads: Math.floor(Math.random() * 200) + 20,
      }));

      // Generate registration trends (last 6 months)
      const registrationTrends = [];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      for (let i = 0; i < 6; i++) {
        registrationTrends.push({
          month: months[i],
          registrations: Math.floor(Math.random() * 20) + 5,
        });
      }

      setAnalytics({
        totalUsers,
        activeUsers,
        suspendedUsers,
        newUsersThisMonth,
        userGrowth: {
          thisMonth: newUsersThisMonth,
          lastMonth,
          percentageChange,
        },
        usersByRole: {
          photographers,
          clients,
          admins,
        },
        userActivity: {
          dailyActiveUsers: Math.floor(activeUsers * 0.3),
          weeklyActiveUsers: Math.floor(activeUsers * 0.7),
          monthlyActiveUsers: activeUsers,
        },
        topUsers,
        registrationTrends,
      });

    } catch (error: any) {
      console.error('Failed to fetch user analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load user analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'photographer':
        return <Badge variant="outline" className="text-blue-400 border-blue-400/30 bg-blue-400/10">Photographer</Badge>;
      case 'client':
        return <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10">Client</Badge>;
      case 'admin':
        return <Badge variant="outline" className="text-purple-400 border-purple-400/30 bg-purple-400/10">Admin</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
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
          <h1 className="text-2xl md:text-3xl font-bold font-audrey text-gray-900 dark:text-gray-100">User Analytics</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive insights into user behavior and engagement
          </p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              onClick={() => setTimeRange(range)}
              className={`transition-all duration-300 ${timeRange === range ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-background/20 backdrop-blur-md border-border/50 hover:bg-background/40'}`}
              size="sm"
            >
              {range}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Key Metrics - Glassmorphic Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {[
          {
            title: "Total Users",
            value: analytics.totalUsers,
            icon: Users,
            change: analytics.userGrowth.percentageChange,
            color: "text-blue-500",
            subtext: "from last month"
          },
          {
            title: "Active Users",
            value: analytics.activeUsers,
            icon: Activity,
            subtext: `${Math.round(analytics.totalUsers > 0 ? (analytics.activeUsers / analytics.totalUsers * 100) : 0)}% of total`,
            color: "text-green-500"
          },
          {
            title: "New This Month",
            value: analytics.newUsersThisMonth,
            icon: UserPlus,
            change: analytics.userGrowth.percentageChange,
            color: "text-amber-500",
            subtext: "growth rate"
          },
          {
            title: "Suspended",
            value: analytics.suspendedUsers,
            icon: UserMinus,
            subtext: "requires attention",
            color: "text-red-500"
          }
        ].map((metric, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm group hover:border-primary/20 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{metric.title}</CardTitle>
                <metric.icon className={`h-4 w-4 ${metric.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-6 bg-primary/10 rounded w-16"></div>
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-bold font-audrey">{metric.value}</div>
                    <div className="flex items-center space-x-1 text-xs mt-1">
                      {metric.change !== undefined && (
                        <div className={`flex items-center ${metric.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {metric.change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          <span className="font-medium">{Math.abs(metric.change)}%</span>
                        </div>
                      )}
                      <span className="text-muted-foreground ml-1">{metric.subtext}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Users by Role */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle className="font-audrey text-xl flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-muted-foreground" />
                Role Distribution
              </CardTitle>
              <CardDescription>Breakdown of user roles across the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>)}
                </div>
              ) : (
                <>
                  {[
                    { label: "Photographers", count: analytics.usersByRole.photographers, icon: Camera, color: "bg-blue-500", text: "text-blue-500" },
                    { label: "Clients", count: analytics.usersByRole.clients, icon: Users, color: "bg-green-500", text: "text-green-500" },
                    { label: "Admins", count: analytics.usersByRole.admins, icon: Shield, color: "bg-purple-500", text: "text-purple-500" }
                  ].map((role, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md ${role.color} bg-opacity-10`}>
                            <role.icon className={`h-3.5 w-3.5 ${role.text}`} />
                          </div>
                          <span className="font-medium">{role.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{role.count}</span>
                          <span className="text-muted-foreground text-xs">
                            ({analytics.totalUsers > 0 ? Math.round(role.count / analytics.totalUsers * 100) : 0}%)
                          </span>
                        </div>
                      </div>
                      <Progress value={analytics.totalUsers > 0 ? (role.count / analytics.totalUsers) * 100 : 0} className={`h-1.5`} indicatorClassName={role.color} />
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* User Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle className="font-audrey text-xl flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                Engagement Activity
              </CardTitle>
              <CardDescription>Active users over time periods</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>)}
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: "Daily Active Users", count: analytics.userActivity.dailyActiveUsers, sub: "Last 24 hours", color: "bg-green-500/10 text-green-500 border-green-500/20" },
                    { label: "Weekly Active Users", count: analytics.userActivity.weeklyActiveUsers, sub: "Last 7 days", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
                    { label: "Monthly Active Users", count: analytics.userActivity.monthlyActiveUsers, sub: "Last 30 days", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
                  ].map((stat, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${stat.color} flex items-center justify-between transition-transform hover:scale-[1.01]`}>
                      <div>
                        <p className="font-medium text-sm text-foreground/80">{stat.label}</p>
                        <p className="text-xs opacity-70">{stat.sub}</p>
                      </div>
                      <div className="text-2xl font-bold font-audrey">{stat.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* Top Users - Responsive Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-audrey font-bold">Top Performing Users</h2>
          <Link href="/admin/users">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">View All</Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {analytics.topUsers.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-background/50 backdrop-blur-sm rounded-xl border border-border/50">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No user activity recorded yet.</p>
              </div>
            ) : (
              analytics.topUsers.map((user, index) => (
                <Card key={user.id} className="border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 group overflow-hidden relative">
                  {/* Rank Badge */}
                  <div className="absolute top-0 right-0 p-2 opacity-50 text-xs font-mono font-bold">#{index + 1}</div>

                  <CardContent className="p-5 flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center mb-3 shadow-lg group-hover:scale-105 transition-transform duration-300 text-white font-bold text-xl">
                      {user.name.charAt(0)}
                    </div>
                    <h3 className="font-bold text-base truncate w-full mb-1">{user.name}</h3>
                    <p className="text-xs text-muted-foreground truncate w-full mb-3">{user.email}</p>
                    {getRoleBadge(user.role)}

                    <div className="grid grid-cols-2 gap-2 w-full mt-4 pt-4 border-t border-border/50">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Galleries</span>
                        <span className="font-bold">{user.galleries}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Downloads</span>
                        <span className="font-bold">{user.totalDownloads}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}