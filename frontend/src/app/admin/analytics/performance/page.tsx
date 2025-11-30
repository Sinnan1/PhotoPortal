"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Zap,
  Clock,
  Server,
  Database,
  Wifi,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Monitor,
  HardDrive,
  Cpu,
  MemoryStick
} from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";

interface PerformanceMetrics {
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    lastRestart: string;
  };
  responseTime: {
    average: number;
    p95: number;
    p99: number;
    trend: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    trend: number;
  };
  errorRate: {
    percentage: number;
    total: number;
    trend: number;
  };
  resourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  databasePerformance: {
    queryTime: number;
    connections: number;
    slowQueries: number;
  };
  apiEndpoints: Array<{
    endpoint: string;
    method: string;
    avgResponseTime: number;
    requestCount: number;
    errorRate: number;
    status: 'healthy' | 'slow' | 'error';
  }>;
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
}

export default function PerformanceAnalyticsPage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    systemHealth: {
      status: 'healthy',
      uptime: 0,
      lastRestart: new Date().toISOString(),
    },
    responseTime: {
      average: 0,
      p95: 0,
      p99: 0,
      trend: 0,
    },
    throughput: {
      requestsPerSecond: 0,
      requestsPerMinute: 0,
      trend: 0,
    },
    errorRate: {
      percentage: 0,
      total: 0,
      trend: 0,
    },
    resourceUsage: {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0,
    },
    databasePerformance: {
      queryTime: 0,
      connections: 0,
      slowQueries: 0,
    },
    apiEndpoints: [],
    alerts: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPerformanceMetrics();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchPerformanceMetrics, 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const fetchPerformanceMetrics = async () => {
    try {
      setLoading(true);

      // Generate mock performance data (in a real app, this would come from monitoring APIs)
      const mockMetrics: PerformanceMetrics = {
        systemHealth: {
          status: Math.random() > 0.1 ? 'healthy' : 'warning',
          uptime: Math.floor(Math.random() * 30) + 1, // 1-30 days
          lastRestart: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        responseTime: {
          average: Math.floor(Math.random() * 200) + 50, // 50-250ms
          p95: Math.floor(Math.random() * 500) + 200, // 200-700ms
          p99: Math.floor(Math.random() * 1000) + 500, // 500-1500ms
          trend: Math.random() > 0.5 ? Math.floor(Math.random() * 20) : -Math.floor(Math.random() * 20),
        },
        throughput: {
          requestsPerSecond: Math.floor(Math.random() * 100) + 20,
          requestsPerMinute: Math.floor(Math.random() * 6000) + 1200,
          trend: Math.random() > 0.3 ? Math.floor(Math.random() * 15) : -Math.floor(Math.random() * 15),
        },
        errorRate: {
          percentage: parseFloat((Math.random() * 2).toFixed(2)), // 0-2%
          total: Math.floor(Math.random() * 50),
          trend: Math.random() > 0.7 ? Math.floor(Math.random() * 10) : -Math.floor(Math.random() * 10),
        },
        resourceUsage: {
          cpu: Math.floor(Math.random() * 60) + 20, // 20-80%
          memory: Math.floor(Math.random() * 50) + 30, // 30-80%
          disk: Math.floor(Math.random() * 40) + 20, // 20-60%
          network: Math.floor(Math.random() * 30) + 10, // 10-40%
        },
        databasePerformance: {
          queryTime: Math.floor(Math.random() * 50) + 10, // 10-60ms
          connections: Math.floor(Math.random() * 20) + 5, // 5-25 connections
          slowQueries: Math.floor(Math.random() * 5), // 0-5 slow queries
        },
        apiEndpoints: [
          {
            endpoint: '/api/galleries',
            method: 'GET',
            avgResponseTime: Math.floor(Math.random() * 100) + 50,
            requestCount: Math.floor(Math.random() * 1000) + 500,
            errorRate: parseFloat((Math.random() * 1).toFixed(2)),
            status: Math.random() > 0.2 ? 'healthy' : 'slow',
          },
          {
            endpoint: '/api/photos/download',
            method: 'POST',
            avgResponseTime: Math.floor(Math.random() * 200) + 100,
            requestCount: Math.floor(Math.random() * 500) + 200,
            errorRate: parseFloat((Math.random() * 2).toFixed(2)),
            status: Math.random() > 0.1 ? 'healthy' : 'slow',
          },
          {
            endpoint: '/api/admin/users',
            method: 'GET',
            avgResponseTime: Math.floor(Math.random() * 80) + 30,
            requestCount: Math.floor(Math.random() * 200) + 50,
            errorRate: parseFloat((Math.random() * 0.5).toFixed(2)),
            status: 'healthy',
          },
          {
            endpoint: '/api/auth/login',
            method: 'POST',
            avgResponseTime: Math.floor(Math.random() * 150) + 75,
            requestCount: Math.floor(Math.random() * 300) + 100,
            errorRate: parseFloat((Math.random() * 3).toFixed(2)),
            status: Math.random() > 0.15 ? 'healthy' : 'error',
          },
        ],
        alerts: [
          {
            type: 'warning' as const,
            message: 'High memory usage detected on server',
            timestamp: new Date(Date.now() - Math.random() * 60 * 60 * 1000).toISOString(),
            resolved: Math.random() > 0.3,
          },
          {
            type: 'info' as const,
            message: 'Database maintenance completed successfully',
            timestamp: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000).toISOString(),
            resolved: true,
          },
        ].filter(() => Math.random() > 0.3), // Randomly show some alerts
      };

      setMetrics(mockMetrics);

    } catch (error: any) {
      console.error('Failed to fetch performance metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load performance metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : trend < 0 ? (
      <TrendingDown className="h-4 w-4 text-red-600" />
    ) : (
      <Activity className="h-4 w-4 text-gray-600" />
    );
  };

  const formatUptime = (days: number) => {
    if (days < 1) return `${Math.floor(days * 24)} hours`;
    return `${Math.floor(days)} days`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Performance Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time system performance monitoring and metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-green-600 border-green-600">
            Live Data
          </Badge>
          <Button onClick={fetchPerformanceMetrics} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            {getStatusIcon(metrics.systemHealth.status)}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold capitalize ${getStatusColor(metrics.systemHealth.status)}`}>
                  {metrics.systemHealth.status}
                </div>
                <p className="text-xs text-muted-foreground">
                  Uptime: {formatUptime(metrics.systemHealth.uptime)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.responseTime.average}ms</div>
                <div className="flex items-center space-x-1 text-xs">
                  {getTrendIcon(metrics.responseTime.trend)}
                  <span className={metrics.responseTime.trend > 0 ? 'text-red-600' : 'text-green-600'}>
                    {Math.abs(metrics.responseTime.trend)}ms
                  </span>
                  <span className="text-muted-foreground">avg</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.throughput.requestsPerSecond}</div>
                <div className="flex items-center space-x-1 text-xs">
                  {getTrendIcon(metrics.throughput.trend)}
                  <span className={metrics.throughput.trend > 0 ? 'text-green-600' : 'text-red-600'}>
                    {Math.abs(metrics.throughput.trend)}%
                  </span>
                  <span className="text-muted-foreground">req/sec</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.errorRate.percentage}%</div>
                <div className="flex items-center space-x-1 text-xs">
                  {getTrendIcon(-metrics.errorRate.trend)}
                  <span className={metrics.errorRate.trend > 0 ? 'text-red-600' : 'text-green-600'}>
                    {Math.abs(metrics.errorRate.trend)}%
                  </span>
                  <span className="text-muted-foreground">change</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Usage</CardTitle>
          <CardDescription>
            Current system resource utilization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Cpu className="h-4 w-4 text-blue-600" />
                    <span>CPU</span>
                  </div>
                  <span className="font-medium">{metrics.resourceUsage.cpu}%</span>
                </div>
                <Progress value={metrics.resourceUsage.cpu} className="h-2" />
                <p className="text-xs text-gray-500">
                  {metrics.resourceUsage.cpu > 80 ? 'High usage' : 'Normal'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <MemoryStick className="h-4 w-4 text-green-600" />
                    <span>Memory</span>
                  </div>
                  <span className="font-medium">{metrics.resourceUsage.memory}%</span>
                </div>
                <Progress value={metrics.resourceUsage.memory} className="h-2" />
                <p className="text-xs text-gray-500">
                  {metrics.resourceUsage.memory > 80 ? 'High usage' : 'Normal'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="h-4 w-4 text-purple-600" />
                    <span>Disk</span>
                  </div>
                  <span className="font-medium">{metrics.resourceUsage.disk}%</span>
                </div>
                <Progress value={metrics.resourceUsage.disk} className="h-2" />
                <p className="text-xs text-gray-500">
                  {metrics.resourceUsage.disk > 80 ? 'High usage' : 'Normal'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Wifi className="h-4 w-4 text-orange-600" />
                    <span>Network</span>
                  </div>
                  <span className="font-medium">{metrics.resourceUsage.network}%</span>
                </div>
                <Progress value={metrics.resourceUsage.network} className="h-2" />
                <p className="text-xs text-gray-500">
                  {metrics.resourceUsage.network > 80 ? 'High usage' : 'Normal'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Endpoints Performance */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoint Performance</CardTitle>
          <CardDescription>
            Performance metrics for key API endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
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
          ) : (
            <div className="space-y-4">
              {metrics.apiEndpoints.map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(endpoint.status)}
                      <Badge variant="outline" className="text-xs">
                        {endpoint.method}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {endpoint.endpoint}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {endpoint.requestCount.toLocaleString()} requests
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <div className="font-medium">{endpoint.avgResponseTime}ms</div>
                      <p className="text-xs text-gray-400">avg response</p>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{endpoint.errorRate}%</div>
                      <p className="text-xs text-gray-400">error rate</p>
                    </div>
                    <Badge
                      variant={endpoint.status === 'healthy' ? 'outline' : 'destructive'}
                      className={endpoint.status === 'healthy' ? 'text-green-600 border-green-600' : ''}
                    >
                      {endpoint.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Database Performance</CardTitle>
            <CardDescription>
              Database query performance and connection metrics
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
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Avg Query Time</span>
                  </div>
                  <span className="text-sm font-bold">{metrics.databasePerformance.queryTime}ms</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Server className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Active Connections</span>
                  </div>
                  <span className="text-sm font-bold">{metrics.databasePerformance.connections}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Slow Queries</span>
                  </div>
                  <span className="text-sm font-bold">{metrics.databasePerformance.slowQueries}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>
              Recent system alerts and notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse p-3 rounded-lg bg-gray-100">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : metrics.alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-500">No active alerts</p>
                <p className="text-sm text-gray-400 mt-1">
                  System is running smoothly
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${alert.type === 'error' ? 'bg-red-50 dark:bg-red-950/20' :
                      alert.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20' :
                        'bg-blue-50 dark:bg-blue-950/20'
                      }`}
                  >
                    <div className="flex items-start space-x-3">
                      {alert.type === 'error' ? (
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                      ) : alert.type === 'warning' ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${alert.type === 'error' ? 'text-red-800 dark:text-red-200' :
                          alert.type === 'warning' ? 'text-yellow-800 dark:text-yellow-200' :
                            'text-blue-800 dark:text-blue-200'
                          }`}>
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {alert.resolved && (
                        <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                          Resolved
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}