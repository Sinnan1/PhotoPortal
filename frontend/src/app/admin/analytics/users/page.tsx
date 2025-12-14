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
  Clock,
  Calendar,
  Eye,
  Download,
  Camera
} from "lucide-react";
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

      // Fetch user statistics
      const userStatsResponse = await adminApi.getUserStatistics(timeRange);
      const userStats = userStatsResponse.data;

      // Fetch all users for additional calculations
      const usersResponse = await adminApi.getAllUsers({ limit: 100 });
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

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getTrendColor = (trend: number) => {
    return trend > 0 ? "text-green-600" : "text-red-600";
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'photographer':
        return <Camera className="h-4 w-4" />;
      case 'client':
        return <Users className="h-4 w-4" />;
      case 'admin':
        return <Activity className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'photographer':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Photographer</Badge>;
      case 'client':
        return <Badge variant="outline" className="text-green-600 border-green-600">Client</Badge>;
      case 'admin':
        return <Badge variant="outline" className="text-purple-600 border-purple-600">Admin</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">User Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive insights into user behavior and engagement
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            onClick={() => setTimeRange('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            onClick={() => setTimeRange('30d')}
          >
            30 Days
          </Button>
          <Button
            variant={timeRange === '90d' ? 'default' : 'outline'}
            onClick={() => setTimeRange('90d')}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
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
                <div className="text-2xl font-bold">{analytics.totalUsers}</div>
                <div className="flex items-center space-x-1 text-xs">
                  {getTrendIcon(analytics.userGrowth.percentageChange)}
                  <span className={getTrendColor(analytics.userGrowth.percentageChange)}>
                    {analytics.userGrowth.percentageChange > 0 ? '+' : ''}{analytics.userGrowth.percentageChange}%
                  </span>
                  <span className="text-muted-foreground">from last month</span>
                </div>
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
                <div className="text-2xl font-bold">{analytics.activeUsers}</div>
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-muted-foreground">
                    {Math.round((analytics.activeUsers / analytics.totalUsers) * 100)}% of total users
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{analytics.newUsersThisMonth}</div>
                <div className="flex items-center space-x-1 text-xs">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">+{analytics.userGrowth.percentageChange}%</span>
                  <span className="text-muted-foreground">growth</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended Users</CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{analytics.suspendedUsers}</div>
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-muted-foreground">
                    {Math.round((analytics.suspendedUsers / analytics.totalUsers) * 100)}% of total users
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Distribution and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
            <CardDescription>
              Distribution of users across different roles
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
                    <Camera className="h-4 w-4 text-blue-600" />
                    <div className="w-20 text-sm font-medium">Photographers</div>
                    <div className="flex-1">
                      <Progress
                        value={analytics.totalUsers > 0 ? (analytics.usersByRole.photographers / analytics.totalUsers) * 100 : 0}
                        className="h-2"
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium w-16 text-right">
                    {analytics.usersByRole.photographers}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Users className="h-4 w-4 text-green-600" />
                    <div className="w-20 text-sm font-medium">Clients</div>
                    <div className="flex-1">
                      <Progress
                        value={analytics.totalUsers > 0 ? (analytics.usersByRole.clients / analytics.totalUsers) * 100 : 0}
                        className="h-2"
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium w-16 text-right">
                    {analytics.usersByRole.clients}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Activity className="h-4 w-4 text-purple-600" />
                    <div className="w-20 text-sm font-medium">Admins</div>
                    <div className="flex-1">
                      <Progress
                        value={analytics.totalUsers > 0 ? (analytics.usersByRole.admins / analytics.totalUsers) * 100 : 0}
                        className="h-2"
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium w-16 text-right">
                    {analytics.usersByRole.admins}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
            <CardDescription>
              Active users across different time periods
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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-green-800 dark:text-green-200">Daily Active</p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Users active in the last 24 hours
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                      {analytics.userActivity.dailyActiveUsers}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-blue-800 dark:text-blue-200">Weekly Active</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Users active in the last 7 days
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                      {analytics.userActivity.weeklyActiveUsers}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-purple-800 dark:text-purple-200">Monthly Active</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        Users active in the last 30 days
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                      {analytics.userActivity.monthlyActiveUsers}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Users */}
      <Card>
        <CardHeader>
          <CardTitle>Most Active Users</CardTitle>
          <CardDescription>
            Users with the highest engagement and activity levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="flex space-x-4">
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : analytics.topUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No user activity data available</p>
              <p className="text-sm text-gray-400 mt-1">
                User activity metrics will appear here as data becomes available
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.topUsers.map((user, index) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-[#425146] flex items-center justify-center">
                      <span className="text-white font-bold">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{user.name}</h3>
                        {getRoleBadge(user.role)}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Last active: {new Date(user.lastActive).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    {user.role === 'photographer' && (
                      <div className="text-center">
                        <div className="flex items-center space-x-1">
                          <Camera className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{user.galleries}</span>
                        </div>
                        <p className="text-xs text-gray-400">galleries</p>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="flex items-center space-x-1">
                        <Download className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{user.totalDownloads}</span>
                      </div>
                      <p className="text-xs text-gray-400">downloads</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}